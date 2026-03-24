import { PurchaseRepository } from '../repositories/purchaseRepository';
import { PurchasePaymentRepository } from '../repositories/purchasePaymentRepository';
import { PurchaseCostRepository } from '../repositories/purchaseCostRepository';
import {
  AddPaymentDto,
  AddCostDto,
  CreatePurchaseDto,
  PurchaseStatus,
} from '../types/purchaseTypes';
import { Purchase } from '../entities/purchaseEntity';
import { logger } from '../config/logger';

export class PurchaseService {
  private purchaseRepo = new PurchaseRepository();
  private paymentRepo = new PurchasePaymentRepository();
  private costRepo = new PurchaseCostRepository();

  private enrichPurchase(purchase: Purchase) {
    const paidAmount = purchase.payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
    const remainingAmount = Number(purchase.totalAmount) - paidAmount;

    let status = PurchaseStatus.UNPAID;
    if (paidAmount >= Number(purchase.totalAmount)) {
      status = PurchaseStatus.PAID;
    } else if (paidAmount > 0) {
      status = PurchaseStatus.PARTIAL;
    }

    return {
      ...purchase,
      paidAmount,
      remainingAmount,
      status,
    };
  }

  async getAllPurchases(branchId?: string) {
    const purchases = await this.purchaseRepo.getPurchases(branchId);
    logger.info('Fetched all purchases', { count: purchases.length, branchId });
    return purchases.map((p) => this.enrichPurchase(p));
  }

  async getPurchaseByLotId(lotId: string, branchId?: string) {
    const purchase = await this.purchaseRepo.getPurchaseByLotId(lotId, branchId);
    if (!purchase) return null;
    return this.enrichPurchase(purchase);
  }

  async getPurchaseById(id: string, branchId?: string) {
    const purchase = await this.purchaseRepo.getPurchaseById(id, branchId);
    if (!purchase) return null;
    return this.enrichPurchase(purchase);
  }

  async addPayment(purchaseId: string, data: AddPaymentDto, branchId: string) {
    const result = await this.paymentRepo.addPayment(purchaseId, data, branchId);
    logger.info('Payment added successfully', { purchaseId, amount: data.amount });
    return result;
  }

  async addCost(purchaseId: string, data: AddCostDto, branchId: string) {
    return await this.costRepo.addCost(purchaseId, data, branchId);
  }

  async updatePurchase(id: string, data: Partial<CreatePurchaseDto>, branchId?: string) {
    return await this.purchaseRepo.updatePurchase(id, data, branchId);
  }
}

export const purchaseService = new PurchaseService();
