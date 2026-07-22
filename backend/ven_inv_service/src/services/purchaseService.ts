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
import { PurchasePayment } from '../entities/purchasePaymentEntity';
import { logger } from '../config/logger';

export class PurchaseService {
  private purchaseRepo = new PurchaseRepository();
  private paymentRepo = new PurchasePaymentRepository();
  private costRepo = new PurchaseCostRepository();

  private enrichPurchase(purchase: Purchase) {
    // Vendor payments settle the goods invoice (purchaseAmount) only.
    // totalAmount = purchaseAmount + additional costs (documentation, labour,
    // handling, transportation, shipping, groundfield) — those costs are
    // money already spent with other parties (freight forwarders, customs
    // brokers, ...), not a debt owed to the vendor, so they must not inflate
    // "how much is still owed to the vendor". Paying the vendor's
    // purchaseAmount in full is a fully-PAID purchase even if totalAmount is
    // higher.
    const paidAmount = purchase.payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
    const remainingAmount = Math.max(0, Number(purchase.purchaseAmount) - paidAmount);

    let status = PurchaseStatus.UNPAID;
    if (paidAmount >= Number(purchase.purchaseAmount)) {
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

  async getSpendByOrigin(filters: { branchId?: string; startDate?: string; endDate?: string }) {
    const summary = await this.purchaseRepo.getSpendByOrigin(filters);
    logger.info('Computed spend by origin', { ...filters, ...summary });
    return summary;
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

    try {
      await this.notifyBillingExpenseRequest(purchaseId, result, data, branchId);
    } catch (err) {
      logger.warn('[Purchase] Billing expense-request creation failed (non-critical):', err);
    }

    return result;
  }

  private async notifyBillingExpenseRequest(
    purchaseId: string,
    payment: PurchasePayment,
    data: AddPaymentDto,
    branchId: string,
  ) {
    const purchase = await this.purchaseRepo.getPurchaseById(purchaseId, branchId);
    const vendorName = purchase?.vendor?.name || 'Unknown Vendor';
    const currency = purchase?.currencyCode || 'AED';
    const purchaseRef = `PUR-${purchaseId.slice(0, 8).toUpperCase()}`;

    const billingUrl = process.env.BILLING_SERVICE_URL || 'http://localhost:3004';
    const res = await fetch(`${billingUrl}/expenses/requests/internal/purchase-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-service': 'ven-inv',
      },
      body: JSON.stringify({
        employeeId: data.createdBy,
        branchId,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        currency,
        vendorName,
        purchaseRef,
        purchaseId,
        purchaseOrigin: purchase?.purchaseOrigin,
        description: `Vendor Purchase Payment — ${vendorName} (${purchaseRef})`,
        attachmentUrl: payment.attachmentUrl,
        date: payment.paymentDate,
        paidFromAccountId: data.paidFromAccountId,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`${res.status}: ${body}`);
    }
  }

  async recordPaymentInternalOnly(
    purchaseId: string,
    data: AddPaymentDto,
    branchId: string,
  ): Promise<PurchasePayment> {
    // Directly records a PurchasePayment without triggering the billing service callback.
    // Used by billing_service when it handles the approval-gate flow for Manager purchases.
    return await this.paymentRepo.addPayment(purchaseId, data, branchId);
  }

  async voidPayment(paymentId: string, branchId: string): Promise<void> {
    await this.paymentRepo.voidPayment(paymentId, branchId);
  }

  async addCost(purchaseId: string, data: AddCostDto, branchId: string) {
    return await this.costRepo.addCost(purchaseId, data, branchId);
  }

  async updatePurchase(id: string, data: Partial<CreatePurchaseDto>, branchId?: string) {
    return await this.purchaseRepo.updatePurchase(id, data, branchId);
  }
}

export const purchaseService = new PurchaseService();
