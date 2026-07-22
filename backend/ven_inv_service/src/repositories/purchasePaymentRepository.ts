import { EntityManager } from 'typeorm';
import { Source } from '../config/db';
import { PurchasePayment } from '../entities/purchasePaymentEntity';
import { Purchase } from '../entities/purchaseEntity';
import { AppError } from '../errors/appError';
import { AddPaymentDto } from '../types/purchaseTypes';

export class PurchasePaymentRepository {
  private get repo() {
    return Source.getRepository(PurchasePayment);
  }

  async addPayment(
    purchaseId: string,
    data: AddPaymentDto,
    branchId: string,
  ): Promise<PurchasePayment> {
    return await Source.transaction(async (manager: EntityManager) => {
      // 1. Get purchase and lock it to prevent race conditions on payment calculation
      const purchase = await manager.findOne(Purchase, {
        where: { id: purchaseId, branchId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!purchase) {
        throw new AppError('Purchase record not found', 404);
      }

      // 2. Validate amount > 0
      if (Number(data.amount) <= 0) {
        throw new AppError('Payment amount must be greater than 0', 400);
      }

      // 3. Calculate already paid amount
      const payments = await manager.find(PurchasePayment, {
        where: { purchaseId },
      });

      // Vendor payments settle the goods invoice (purchaseAmount) only — additional
      // costs (documentation, labour, handling, transportation, shipping,
      // groundfield) are money spent with other parties (freight forwarders,
      // customs brokers, ...) and are tracked separately via PurchaseCost. They
      // are never owed to — or payable through — the vendor, so they must not
      // inflate what a vendor payment is allowed to cover.
      const alreadyPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const remaining = Number(purchase.purchaseAmount) - alreadyPaid;

      // 4. Validate does not exceed remaining vendor-payable amount
      if (Number(data.amount) > remaining + 0.01) {
        // 0.01 for rounding safety
        throw new AppError(
          `Payment amount ${data.amount} exceeds remaining vendor payable amount ${remaining}`,
          400,
        );
      }

      // 5. Create payment record
      const payment = new PurchasePayment();
      payment.purchaseId = purchaseId;
      payment.branchId = branchId;
      payment.amount = Number(data.amount);
      payment.paymentMethod = data.paymentMethod;
      payment.description = data.description;
      payment.referenceNumber = data.referenceNumber;
      payment.paymentDate = data.paymentDate || new Date();
      payment.createdBy = data.createdBy;
      payment.attachmentUrl = data.attachmentUrl;

      return await manager.save(PurchasePayment, payment);
    });
  }

  async getPaymentsByPurchaseId(purchaseId: string, branchId?: string) {
    const where: Record<string, unknown> = { purchaseId };
    if (branchId) where.branchId = branchId;

    return this.repo.find({
      where,
      order: { paymentDate: 'DESC' },
    });
  }

  async voidPayment(paymentId: string, branchId: string): Promise<void> {
    const payment = await this.repo.findOne({ where: { id: paymentId, branchId } });
    if (!payment) {
      throw new AppError('Purchase payment not found', 404);
    }
    await this.repo.remove(payment);
  }
}
