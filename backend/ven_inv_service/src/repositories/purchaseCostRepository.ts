import { EntityManager } from 'typeorm';
import { Source } from '../config/db';
import { PurchaseCost } from '../entities/purchaseCostEntity';
import { Purchase } from '../entities/purchaseEntity';
import { AppError } from '../errors/appError';
import { AddCostDto } from '../types/purchaseTypes';

export class PurchaseCostRepository {
  private get repo() {
    return Source.getRepository(PurchaseCost);
  }

  async addCost(purchaseId: string, data: AddCostDto, branchId: string): Promise<PurchaseCost> {
    return await Source.transaction(async (manager: EntityManager) => {
      // 1. Get purchase and lock it to prevent race conditions
      const purchase = await manager.findOne(Purchase, {
        where: { id: purchaseId, branchId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!purchase) {
        throw new AppError('Purchase record not found', 404);
      }

      // 2. Validate amount > 0
      if (Number(data.amount) <= 0) {
        throw new AppError('Cost amount must be greater than 0', 400);
      }

      // 3. Create cost record
      const cost = new PurchaseCost();
      cost.purchaseId = purchaseId;
      cost.branchId = branchId;
      cost.amount = Number(data.amount);
      cost.costType = data.costType;
      cost.description = data.description;
      cost.costDate = data.costDate || new Date();
      cost.createdBy = data.createdBy;

      const savedCost = await manager.save(PurchaseCost, cost);

      // 4. Update the total amount on the Purchase record
      purchase.totalAmount = Number(purchase.totalAmount) + savedCost.amount;
      await manager.save(Purchase, purchase);

      return savedCost;
    });
  }

  async getCostsByPurchaseId(purchaseId: string, branchId?: string) {
    const where: Record<string, unknown> = { purchaseId };
    if (branchId) where.branchId = branchId;

    return this.repo.find({
      where,
      order: { costDate: 'DESC' },
    });
  }
}
