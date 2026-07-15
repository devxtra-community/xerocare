import { Source } from '../config/dataSource';
import { PaymentLedger, PaymentMode } from '../entities/paymentLedgerEntity';
import { PaymentTransaction } from '../entities/paymentTransactionEntity';
import { PaymentTransaction } from '../entities/paymentTransactionEntity';
import { Invoice } from '../entities/invoiceEntity';
import { AppError } from '../errors/appError';
import { BillingService } from './billingService';

/**
 * Normalized payment record served to the frontend. Merges the current
 * payment_transactions path with legacy payment_ledgers rows so history
 * recorded through either path is visible.
 */
export interface PaymentRecord {
  id: string;
  invoiceId: string;
  amountPaid: number;
  paymentMode: string;
  paymentDate: Date;
  referenceNumber?: string;
  remarks?: string;
  receiptUrl?: string;
  recordedBy?: string;
  createdAt: Date;
}

export class PaymentService {
  private legacyRepo = Source.getRepository(PaymentLedger);
  private transactionRepo = Source.getRepository(PaymentTransaction);
  private invoiceRepo = Source.getRepository(Invoice);
  private billingService = new BillingService();
  private billingService = new BillingService();

  /**
   * Records a payment through the unified flow: PaymentTransaction + InvoiceLedger
   * update + cashbook/day book posting + invoice status update. Previously this
   * wrote only a payment_ledgers row, which never reached the accounts pages.
   */
  /**
   * Records a payment through the unified flow: PaymentTransaction + InvoiceLedger
   * update + cashbook/day book posting + invoice status update. Previously this
   * wrote only a payment_ledgers row, which never reached the accounts pages.
   */
  async recordPayment(data: {
    invoiceId: string;
    amountPaid: number;
    paymentMode: PaymentMode;
    paymentDate: string | Date;
    referenceNumber?: string;
    remarks?: string;
    recordedBy: string;
    receiptUrl?: string;
  }): Promise<PaymentTransaction> {
    if (data.amountPaid <= 0) {
      throw new AppError('Payment amount must be greater than zero', 400);
    }

    return this.billingService.recordPayment(
      data.invoiceId,
      {
        paymentMode: data.paymentMode,
        referenceNumber: data.referenceNumber,
        amount: data.amountPaid,
        transactionDate: data.paymentDate,
        remarks: data.remarks,
        receiptUrl: data.receiptUrl,
        // This endpoint historically accepted advances collected at quotation
        // conversion (pre-activation); the pending-balance guard still applies.
        bypassStatusCheck: true,
      },
      data.recordedBy,
    );
  }

  async getPaymentsByInvoice(invoiceId: string): Promise<PaymentRecord[]> {
    const [legacyRows, txns] = await Promise.all([
      this.legacyRepo.find({ where: { invoiceId } }),
      this.transactionRepo.find({ where: { invoiceId } }),
    ]);

    const merged: PaymentRecord[] = [
      ...legacyRows.map((p) => ({
        id: p.id,
        invoiceId: p.invoiceId,
        amountPaid: Number(p.amountPaid),
        paymentMode: p.paymentMode as string,
        paymentDate: p.paymentDate,
        referenceNumber: p.referenceNumber,
        remarks: p.remarks,
        receiptUrl: p.receiptUrl,
        recordedBy: p.recordedBy,
        createdAt: p.createdAt,
      })),
      ...txns.map((t) => ({
        id: t.id,
        invoiceId: t.invoiceId,
        amountPaid: Number(t.amount),
        paymentMode: t.paymentMode,
        paymentDate: t.transactionDate,
        referenceNumber: t.referenceNumber,
        remarks: t.remarks,
        receiptUrl: t.receiptUrl,
        recordedBy: t.recordedBy,
        createdAt: t.createdAt,
      })),
    ];

    return merged.sort(
      (a, b) =>
        new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime() ||
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  async getAccountSummary(invoiceId: string) {
    const invoice = await this.invoiceRepo.findOne({ where: { id: invoiceId } });
    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    const payments = await this.getPaymentsByInvoice(invoiceId);
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amountPaid), 0);
    const totalAmount = Number(invoice.totalAmount || 0);
    const pendingBalance = Math.max(0, totalAmount - totalPaid);
    const pendingBalance = Math.max(0, totalAmount - totalPaid);

    return {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customerName || invoice.customerId,
      customerName: invoice.customerName || invoice.customerId,
      totalAmount,
      totalPaid,
      pendingBalance,
      payments,
      status: invoice.status,
    };
  }
}
