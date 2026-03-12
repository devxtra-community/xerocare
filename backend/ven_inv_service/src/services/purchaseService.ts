import { PurchaseRepository } from '../repositories/purchaseRepository';
import { PurchasePaymentRepository } from '../repositories/purchasePaymentRepository';
import { AddPaymentDto, CreatePurchaseDto, PurchaseStatus } from '../types/purchaseTypes';
import { Purchase } from '../entities/purchaseEntity';

export class PurchaseService {
  private purchaseRepo = new PurchaseRepository();
  private paymentRepo = new PurchasePaymentRepository();

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
    return await this.paymentRepo.addPayment(purchaseId, data, branchId);
  }

  async updatePurchase(id: string, data: Partial<CreatePurchaseDto>, branchId?: string) {
    return await this.purchaseRepo.updatePurchase(id, data, branchId);
  }
}

export const purchaseService = new PurchaseService();
