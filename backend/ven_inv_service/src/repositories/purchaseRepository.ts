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

      // 6. Insert purchase record (vendor lots only — transfer lots carry no purchase)
      if (!lot.vendorId) throw new AppError('Vendor is required for purchase lots', 400);
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

      // Copy purchase_origin from lot (was always in entity but never populated — bug fix)
      purchase.purchaseOrigin = lot.purchaseOrigin;

      // Vendor snapshot
      purchase.vendorVatNumber = lot.vendor?.vatNumber ?? null;
      purchase.vendorCountry = lot.vendor?.countryCode ?? null;
      purchase.vendorStateProvince = lot.vendor?.stateProvince ?? null;
      purchase.vendorCity = lot.vendor?.city ?? null;

      // Currency inherited from lot
      purchase.currencyCode = lot.currencyCode ?? null;
      purchase.exchangeRate = lot.exchangeRateSnapshot ? Number(lot.exchangeRateSnapshot) : null;

      // Optional fields (set before taxableAmount so customsDuty can feed into it)
      purchase.purchaseCategory = data.purchaseCategory ?? null;
      purchase.importInvoiceNo = data.importInvoiceNo ?? null;
      purchase.customsEntryNo = data.customsEntryNo ?? null;
      purchase.customsDuty = data.customsDuty != null ? Number(data.customsDuty) : null;
      purchase.goodsOrService = data.goodsOrService ?? null;

      // taxableAmount: all cost components except documentationFee (non-taxable admin charge),
      // plus customsDuty — standard import-VAT practice (UAE/KSA/Qatar FTA) assesses reverse-charge
      // VAT on customs value + duty, not duty-exclusive. customsDuty is 0 for DOMESTIC purchases
      // (never populated there) so this is a no-op outside INTERNATIONAL purchases.
      purchase.taxableAmount =
        purchaseAmount +
        Number(data.labourCost) +
        Number(data.handlingFee) +
        Number(data.transportationCost) +
        Number(data.shippingCost) +
        Number(data.groundfieldCost) +
        Number(purchase.customsDuty ?? 0);

      // Tax rate and name (caller may supply from branch config or country_tax_rules)
      purchase.taxPercent = data.taxPercent != null ? Number(data.taxPercent) : null;
      purchase.taxName = data.taxName ?? null;

      if (purchase.taxPercent != null && purchase.taxableAmount != null) {
        if (purchase.purchaseOrigin === 'DOMESTIC') {
          purchase.inputVatAmount =
            Number(purchase.taxableAmount) * (Number(purchase.taxPercent) / 100);
          purchase.reverseChargeVatAmount = null;
        } else if (purchase.purchaseOrigin === 'INTERNATIONAL') {
          purchase.reverseChargeVatAmount =
            Number(purchase.taxableAmount) * (Number(purchase.taxPercent) / 100);
          purchase.inputVatAmount = null;
        }
      }
      purchase.vatClaimable = data.vatClaimable !== false; // default true
      purchase.taxStatus = 'PENDING';

      return await manager.save(Purchase, purchase);
    });
  }

  async getPurchases(branchId?: string) {
    const where: { branchId?: string } = {};
    if (branchId) where.branchId = branchId;

    return this.repo.find({
      where: Object.keys(where).length > 0 ? where : undefined,
      relations: ['lot', 'vendor', 'branch', 'payments', 'costs'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Aggregates total purchase spend split by origin (Domestic vs International),
   * optionally scoped by branch and a purchase-date range. Sums purchases.total_amount,
   * which carries the full landed cost. Rows with a null origin (legacy/in-flight)
   * are returned under the 'UNCLASSIFIED' key so totals always reconcile.
   */
  async getSpendByOrigin(filters: {
    branchId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ domestic: number; international: number; unclassified: number }> {
    const qb = this.repo
      .createQueryBuilder('purchase')
      .leftJoin('purchase.lot', 'lot')
      .select('purchase.purchase_origin', 'origin')
      .addSelect('COALESCE(SUM(purchase.total_amount), 0)', 'total')
      .groupBy('purchase.purchase_origin');

    if (filters.branchId) {
      qb.andWhere('purchase.branch_id = :branchId', { branchId: filters.branchId });
    }
    if (filters.startDate) {
      qb.andWhere('lot.purchase_date >= :startDate', { startDate: filters.startDate });
    }
    if (filters.endDate) {
      qb.andWhere('lot.purchase_date <= :endDate', { endDate: filters.endDate });
    }

    const rows = await qb.getRawMany<{ origin: string | null; total: string }>();

    const result = { domestic: 0, international: 0, unclassified: 0 };
    for (const row of rows) {
      const amount = Number(row.total) || 0;
      if (row.origin === 'DOMESTIC') result.domestic = amount;
      else if (row.origin === 'INTERNATIONAL') result.international = amount;
      else result.unclassified += amount;
    }
    return result;
  }

  async getPurchaseById(id: string, branchId?: string) {
    const where: { id: string; branchId?: string } = { id };
    if (branchId) where.branchId = branchId;

    return this.repo.findOne({
      where,
      relations: ['lot', 'vendor', 'branch', 'payments', 'costs'],
    });
  }

  async getPurchaseByLotId(lotId: string, branchId?: string) {
    const where: { lotId: string; branchId?: string } = { lotId };
    if (branchId) where.branchId = branchId;

    return this.repo.findOne({
      where,
      relations: ['lot', 'vendor', 'branch', 'payments', 'costs'],
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
        relations: ['lot', 'lot.items', 'vendor', 'costs'],
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
      if (data.importInvoiceNo !== undefined) purchase.importInvoiceNo = data.importInvoiceNo;
      if (data.customsEntryNo !== undefined) purchase.customsEntryNo = data.customsEntryNo;
      if (data.customsDuty !== undefined)
        purchase.customsDuty = data.customsDuty != null ? Number(data.customsDuty) : null;
      if (data.goodsOrService !== undefined) purchase.goodsOrService = data.goodsOrService;

      // Re-calculate purchase amount from lot items
      let purchaseAmount = 0;
      for (const item of purchase.lot.items || []) {
        purchaseAmount += Number(item.totalPrice) || 0;
      }

      purchase.purchaseAmount = purchaseAmount;

      const dynamicCostsTotal = purchase.costs
        ? purchase.costs.reduce((sum, cost) => sum + Number(cost.amount), 0)
        : 0;

      // customsDuty is deliberately NOT part of totalAmount: this figure drives the
      // vendor payable (`outstanding = total_amount - payments`), and duty is paid to
      // the customs authority, not the vendor. It is captured as its own expense
      // bucket (CoA 5015) by the internal cost-report instead. taxableAmount below
      // does include it, which is correct — import VAT is assessed on customs value
      // plus duty, so the VAT base legitimately exceeds the vendor invoice.
      purchase.totalAmount =
        purchaseAmount +
        Number(purchase.documentationFee) +
        Number(purchase.labourCost) +
        Number(purchase.handlingFee) +
        Number(purchase.transportationCost) +
        Number(purchase.shippingCost) +
        Number(purchase.groundfieldCost) +
        dynamicCostsTotal;

      // Recalculate taxable amount and VAT whenever costs change. Includes customsDuty —
      // standard import-VAT practice assesses reverse-charge VAT on customs value + duty.
      purchase.taxableAmount =
        purchaseAmount +
        Number(purchase.labourCost) +
        Number(purchase.handlingFee) +
        Number(purchase.transportationCost) +
        Number(purchase.shippingCost) +
        Number(purchase.groundfieldCost) +
        Number(purchase.customsDuty ?? 0);

      if (purchase.taxPercent != null && purchase.taxableAmount != null) {
        if (purchase.purchaseOrigin === 'DOMESTIC') {
          purchase.inputVatAmount =
            Number(purchase.taxableAmount) * (Number(purchase.taxPercent) / 100);
          purchase.reverseChargeVatAmount = null;
        } else if (purchase.purchaseOrigin === 'INTERNATIONAL') {
          purchase.reverseChargeVatAmount =
            Number(purchase.taxableAmount) * (Number(purchase.taxPercent) / 100);
          purchase.inputVatAmount = null;
        }
      }

      return await manager.save(Purchase, purchase);
    });
  }
}
