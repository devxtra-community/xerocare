import { EntityManager } from 'typeorm';
import { Source } from '../config/db';
import { Lot, LotStatus } from '../entities/lotEntity';
import { LotItem } from '../entities/lotItemEntity';
import { Purchase } from '../entities/purchaseEntity';
import { PurchaseCost } from '../entities/purchaseCostEntity';
import { AppError } from '../errors/appError';
import { round2 } from '../utils/exchangeRate';

export type SplitMethod = 'BY_VALUE' | 'BY_QUANTITY' | 'EQUAL';

export interface AllocationBreakdownItem {
  lotItemId: string;
  originalUnitPrice: number;
  quantity: number;
  landedCostAllocated: number;
  landedCostUnitCost: number;
}

export interface AllocationResult {
  items: AllocationBreakdownItem[];
  costsSnapshotAt: string | null;
}

/**
 * Spreads a lot's additional costs (purchase_costs rows — labour, handling,
 * shipping, documentation, transportation, groundfield) across its items, so the
 * "Add to Inventory" flow can cost items at their true landed price instead of the
 * bare vendor unit price. The vendor-quoted `unitPrice`/`totalPrice` on the lot item
 * are never touched — landedCostUnitCost is a separate, parallel figure.
 */
export class LandedCostService {
  private async loadLotAndPurchase(
    manager: EntityManager,
    lotId: string,
    branchId?: string,
  ): Promise<{ lot: Lot; purchase: Purchase }> {
    const lot = await manager.findOne(Lot, {
      where: { id: lotId, ...(branchId ? { branch_id: branchId } : {}) },
    });
    if (!lot) throw new AppError('Lot not found', 404);
    if (lot.status !== LotStatus.RECEIVED) {
      throw new AppError(
        'Landed cost allocation can only be applied once the lot has been received',
        400,
      );
    }

    const purchase = await manager.findOne(Purchase, {
      where: { lotId },
      relations: ['costs'],
    });
    if (!purchase) throw new AppError('No purchase record found for this lot', 404);

    return { lot, purchase };
  }

  /**
   * Each cost line's per-item share, per the selected split method. Returns a
   * lotItemId -> share map that sums to 1 across `items` (barring rounding).
   */
  private computeShares(items: LotItem[], splitMethod: SplitMethod): Map<string, number> {
    const shares = new Map<string, number>();

    if (splitMethod === 'BY_QUANTITY') {
      const totalQty = items.reduce((sum, i) => sum + i.expectedQuantity, 0);
      for (const item of items) {
        shares.set(item.id, totalQty > 0 ? item.expectedQuantity / totalQty : 0);
      }
    } else if (splitMethod === 'EQUAL') {
      // Split equally across item rows (not units).
      for (const item of items) {
        shares.set(item.id, items.length > 0 ? 1 / items.length : 0);
      }
    } else {
      // BY_VALUE (default) — proportional to each item's original total value.
      const totalValue = items.reduce(
        (sum, i) => sum + (i.originalUnitPrice ?? i.unitPrice) * i.expectedQuantity,
        0,
      );
      for (const item of items) {
        const itemValue = (item.originalUnitPrice ?? item.unitPrice) * item.expectedQuantity;
        shares.set(item.id, totalValue > 0 ? itemValue / totalValue : 0);
      }
    }

    return shares;
  }

  async allocateLandedCosts(
    lotId: string,
    branchId: string | undefined,
    splitMethods?: Record<string, SplitMethod>,
  ): Promise<AllocationResult> {
    return Source.transaction(async (manager) => {
      const { purchase } = await this.loadLotAndPurchase(manager, lotId, branchId);

      if (!purchase.costs || purchase.costs.length === 0) {
        throw new AppError('No additional costs recorded on this lot yet', 400);
      }

      // Persist any split-method changes the manager made in the allocation modal
      // before computing shares with them.
      if (splitMethods) {
        for (const cost of purchase.costs) {
          const chosen = splitMethods[cost.id];
          if (chosen && chosen !== cost.splitMethod) {
            cost.splitMethod = chosen;
            await manager.save(PurchaseCost, cost);
          }
        }
      }

      const items = await manager.find(LotItem, { where: { lotId } });
      if (items.length === 0) throw new AppError('This lot has no items to allocate to', 400);

      // Always recompute from the untouched baseline — never from a previous
      // landedCostUnitCost — so re-running with a different split method never
      // compounds on top of the last allocation.
      const totals = new Map<string, number>(items.map((i) => [i.id, 0]));

      for (const cost of purchase.costs) {
        const shares = this.computeShares(items, cost.splitMethod);
        for (const item of items) {
          const share = shares.get(item.id) ?? 0;
          totals.set(item.id, (totals.get(item.id) ?? 0) + Number(cost.amount) * share);
        }
      }

      const breakdown: AllocationBreakdownItem[] = [];
      for (const item of items) {
        const baseline = item.originalUnitPrice ?? item.unitPrice;
        const allocated = round2(totals.get(item.id) ?? 0);

        item.originalUnitPrice = baseline;
        item.landedCostAllocated = allocated;
        item.landedCostUnitCost = round2(
          baseline + (item.expectedQuantity > 0 ? allocated / item.expectedQuantity : 0),
        );

        breakdown.push({
          lotItemId: item.id,
          originalUnitPrice: baseline,
          quantity: item.expectedQuantity,
          landedCostAllocated: item.landedCostAllocated,
          landedCostUnitCost: item.landedCostUnitCost,
        });
      }

      await manager.save(LotItem, items);

      const costsSnapshotAt = purchase.costs.reduce<Date | null>((latest, c) => {
        const d = c.createdAt;
        return !latest || d > latest ? d : latest;
      }, null);

      return { items: breakdown, costsSnapshotAt: costsSnapshotAt?.toISOString() ?? null };
    });
  }

  async resetLandedCostAllocation(lotId: string, branchId?: string): Promise<void> {
    await Source.transaction(async (manager) => {
      await this.loadLotAndPurchase(manager, lotId, branchId);

      const items = await manager.find(LotItem, { where: { lotId } });
      for (const item of items) {
        item.landedCostUnitCost = null;
        item.landedCostAllocated = 0;
        item.originalUnitPrice = null;
      }
      await manager.save(LotItem, items);
    });
  }
}
