import { EntityManager } from 'typeorm';
import { Source } from '../config/db';
import { PurchasePayment } from '../entities/purchasePaymentEntity';
import { Purchase } from '../entities/purchaseEntity';
import { AppError } from '../errors/appError';
import { AddPaymentDto } from '../types/purchaseTypes';
import { generatePaymentReference } from '../utils/paymentReferenceGenerator';

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
      // Normalized to a real Date instance (not left as the raw request-body string) —
      // generatePaymentReference below calls .toISOString() on this immediately, before
      // TypeORM's own string→Date conversion would otherwise happen at save time.
      payment.paymentDate = data.paymentDate ? new Date(data.paymentDate) : new Date();
      payment.createdBy = data.createdBy;
      payment.attachmentUrl = data.attachmentUrl;

      // Auto-generate the reference for Cash/Bank/Card/Online — Cheque keeps whatever
      // was supplied (its Cheque Number, already passed through as referenceNumber by
      // every caller). Overrides any caller-supplied value for non-Cheque modes, same
      // "always the generated code, no override" policy as billing_service.
      const generatedRef = await generatePaymentReference(data.paymentMethod, payment.paymentDate);
      payment.referenceNumber = generatedRef ?? data.referenceNumber;

      const saved = await manager.save(PurchasePayment, payment);

      // Settling the vendor's invoice settles its tax with it.
      //
      // tax_status had no transition at all: every purchase was written PENDING and
      // nothing — no endpoint caller, no UI, no event — ever moved it, so the Tax Report
      // showed input VAT as outstanding forever, including on invoices that were paid in
      // full months ago. Once the last of the invoice is paid the input VAT has
      // definitively been incurred and handed to the vendor, which is exactly what
      // RECORDED means. FILED stays manual: that asserts the VAT return was actually
      // submitted, which only Finance can know, and is never downgraded here.
      if (alreadyPaid + Number(data.amount) >= Number(purchase.purchaseAmount) - 0.01) {
        if (purchase.taxStatus === 'PENDING') {
          purchase.taxStatus = 'RECORDED';
          await manager.save(Purchase, purchase);
        }
      }

      return saved;
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
    await Source.transaction(async (manager: EntityManager) => {
      const payment = await manager.findOne(PurchasePayment, {
        where: { id: paymentId, branchId },
      });
      if (!payment) {
        throw new AppError('Purchase payment not found', 404);
      }
      const purchaseId = payment.purchaseId;
      await manager.remove(PurchasePayment, payment);

      // Voiding a payment can take the invoice back below fully-paid, so the tax it
      // settled is outstanding again. Without this the status would stay RECORDED on an
      // invoice that is once more unpaid. FILED is left alone — a submitted VAT return
      // is not undone by a payment correction here, and quietly reopening it would hide
      // a real discrepancy that Finance needs to see and handle deliberately.
      const purchase = await manager.findOne(Purchase, {
        where: { id: purchaseId },
        lock: { mode: 'pessimistic_write' },
      });
      if (purchase && purchase.taxStatus === 'RECORDED') {
        const remainingPayments = await manager.find(PurchasePayment, {
          where: { purchaseId },
        });
        const stillPaid = remainingPayments.reduce((sum, p) => sum + Number(p.amount), 0);
        if (stillPaid < Number(purchase.purchaseAmount) - 0.01) {
          purchase.taxStatus = 'PENDING';
          await manager.save(Purchase, purchase);
        }
      }
    });
  }
}
