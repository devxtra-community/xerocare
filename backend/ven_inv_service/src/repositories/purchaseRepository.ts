import { EntityManager } from 'typeorm';
import { Source } from '../config/db';
import { Purchase } from '../entities/purchaseEntity';
import { Lot } from '../entities/lotEntity';
import { AppError } from '../errors/appError';
import { CreatePurchaseDto } from '../types/purchaseTypes';

export class PurchaseRepository {
  private get repo() {
    return Source.getRepository(Purchase);
  }

  async createPurchase(data: CreatePurchaseDto): Promise<Purchase> {
    return await Source.transaction(async (manager: EntityManager) => {
      // 1. Lock lot row to prevent concurrent assignment
      const lockedLot = await manager.findOne(Lot, {
        where: { id: data.lotId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!lockedLot) {
        throw new AppError('Lot not found', 404);
      }

      // 1.1 Fetch relations separately for subsequent logic
      const lot = await manager.findOne(Lot, {
        where: { id: data.lotId },
        relations: ['vendor', 'items'],
      });

      if (!lot) {
        throw new AppError('Lot not found after lock', 404);
      }

      // 2. Check if purchase already exists for this lot
      const existingPurchase = await manager.findOne(Purchase, {
        where: { lotId: data.lotId },
      });

      if (existingPurchase) {
        throw new AppError('Purchase record for this lot already exists', 400);
      }

      // 3. Validate costs >= 0
      const costFields = [
        data.documentationFee,
        data.labourCost,
        data.handlingFee,
        data.transportationCost,
        data.shippingCost,
        data.groundfieldCost,
      ];

      if (costFields.some((cost) => Number(cost) < 0)) {
        throw new AppError('Cost fields cannot be negative', 400);
      }

      // 4. Calculate purchase_amount automatically from lot items
      let purchaseAmount = 0;
      for (const item of lot.items) {
        purchaseAmount += Number(item.totalPrice) || 0;
      }

      // 5. Calculate total_amount
      const totalAmount =
        purchaseAmount +
        Number(data.documentationFee) +
        Number(data.labourCost) +
        Number(data.handlingFee) +
        Number(data.transportationCost) +
        Number(data.shippingCost) +
        Number(data.groundfieldCost);

      // 6. Insert purchase record
      const purchase = new Purchase();
      purchase.lotId = lot.id;
      purchase.vendorId = lot.vendorId;
      purchase.branchId = lot.branch_id || ''; // Inherit branch from lot
      purchase.purchaseAmount = purchaseAmount;
      purchase.documentationFee = Number(data.documentationFee);
      purchase.labourCost = Number(data.labourCost);
      purchase.handlingFee = Number(data.handlingFee);
      purchase.transportationCost = Number(data.transportationCost);
      purchase.shippingCost = Number(data.shippingCost);
      purchase.groundfieldCost = Number(data.groundfieldCost);
      purchase.totalAmount = totalAmount;
      purchase.createdBy = data.createdBy;

      return await manager.save(Purchase, purchase);
    });
  }

  async getPurchases(branchId?: string) {
    const where: { branchId?: string } = {};
    if (branchId) where.branchId = branchId;

    return this.repo.find({
      where: Object.keys(where).length > 0 ? where : undefined,
      relations: ['lot', 'vendor', 'branch', 'payments'],
      order: { createdAt: 'DESC' },
    });
  }

  async getPurchaseById(id: string, branchId?: string) {
    const where: { id: string; branchId?: string } = { id };
    if (branchId) where.branchId = branchId;

    return this.repo.findOne({
      where,
      relations: ['lot', 'vendor', 'branch', 'payments'],
    });
  }

  async getPurchaseByLotId(lotId: string, branchId?: string) {
    const where: { lotId: string; branchId?: string } = { lotId };
    if (branchId) where.branchId = branchId;

    return this.repo.findOne({
      where,
      relations: ['lot', 'vendor', 'branch', 'payments'],
    });
  }

  async updatePurchase(
    id: string,
    data: Partial<CreatePurchaseDto>,
    branchId?: string,
  ): Promise<Purchase> {
    return await Source.transaction(async (manager: EntityManager) => {
      const where: { id: string; branchId?: string } = { id };
      if (branchId) where.branchId = branchId;

      const purchase = await manager.findOne(Purchase, {
        where,
        relations: ['lot', 'lot.items', 'vendor'],
      });

      if (!purchase) {
        throw new AppError('Purchase record not found', 404);
      }

      // Update fields if provided
      if (data.documentationFee !== undefined)
        purchase.documentationFee = Number(data.documentationFee);
      if (data.labourCost !== undefined) purchase.labourCost = Number(data.labourCost);
      if (data.handlingFee !== undefined) purchase.handlingFee = Number(data.handlingFee);
      if (data.transportationCost !== undefined)
        purchase.transportationCost = Number(data.transportationCost);
      if (data.shippingCost !== undefined) purchase.shippingCost = Number(data.shippingCost);
      if (data.groundfieldCost !== undefined)
        purchase.groundfieldCost = Number(data.groundfieldCost);

      // Re-calculate purchase amount from lot items
      let purchaseAmount = 0;
      for (const item of purchase.lot.items || []) {
        purchaseAmount += Number(item.totalPrice) || 0;
      }

      purchase.purchaseAmount = purchaseAmount;

      purchase.totalAmount =
        purchaseAmount +
        Number(purchase.documentationFee) +
        Number(purchase.labourCost) +
        Number(purchase.handlingFee) +
        Number(purchase.transportationCost) +
        Number(purchase.shippingCost) +
        Number(purchase.groundfieldCost);

      return await manager.save(Purchase, purchase);
    });
  }
}
