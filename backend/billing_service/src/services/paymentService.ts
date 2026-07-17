import { Source } from '../config/dataSource';
import { PaymentLedger, PaymentMode } from '../entities/paymentLedgerEntity';
import { PaymentTransaction } from '../entities/paymentTransactionEntity';
import { Invoice } from '../entities/invoiceEntity';
import { Cheque } from '../entities/chequeEntity';
import { AppError } from '../errors/appError';
import { logger } from '../config/logger';
import { logAudit } from './auditLogService';
import { postCashbookEntry, resolveCashAccount } from './cashbookService';
import { BillingService } from './billingService';

export interface PaymentRecord {
  id: string;
  invoiceId: string;
  amountPaid: number;
  paymentMode: string;
  paymentDate: Date | string;
  referenceNumber?: string;
  remarks?: string;
  receiptUrl?: string;
  recordedBy?: string;
  createdAt: Date | string;
}

export class PaymentService {
  private legacyRepo = Source.getRepository(PaymentLedger);
  private paymentRepo = Source.getRepository(PaymentLedger);
  private transactionRepo = Source.getRepository(PaymentTransaction);
  private invoiceRepo = Source.getRepository(Invoice);
  private billingService = new BillingService();

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
    // Required when paymentMode === 'CHEQUE'
    chequeNumber?: string;
    chequeBankName?: string;
    chequeDueDate?: string;
  }): Promise<PaymentLedger> {
    const invoice = await this.invoiceRepo.findOne({ where: { id: data.invoiceId } });

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    if (!invoice.totalAmount) {
      throw new AppError('Invoice does not have a total amount set', 400);
    }

    // Get all previous payments to validate balance
    const previousPayments = await this.paymentRepo.find({ where: { invoiceId: data.invoiceId } });
    const totalPaidSoFar = previousPayments.reduce(
      (sum: number, p: PaymentLedger) => sum + Number(p.amountPaid),
      0,
    );
    const pendingBalance = Number(invoice.totalAmount) - totalPaidSoFar;

    if (data.amountPaid <= 0) {
      throw new AppError('Payment amount must be greater than zero', 400);
    }

    // Allow a small epsilon for floating point errors
    if (data.amountPaid > pendingBalance + 0.01) {
      throw new AppError(
        `Payment amount (${data.amountPaid}) exceeds pending balance (${pendingBalance})`,
        400,
      );
    }

    // Validate everything the post-save cashbook/cheque step needs BEFORE saving
    // the payment row. Otherwise a config error (e.g. no default cash account)
    // leaves an orphaned payment behind and every retry hits the overpayment guard.
    const modeUpper = (data.paymentMode ?? '').trim().toUpperCase();
    let resolvedAccount: Awaited<ReturnType<typeof resolveCashAccount>> = null;
    if (invoice.branchId) {
      if (modeUpper === 'CHEQUE') {
        if (!(data.chequeNumber || data.referenceNumber)) {
          throw new AppError('Cheque number is required for cheque payments', 400);
        }
        if (!data.chequeDueDate) {
          throw new AppError('Cheque due date is required for cheque payments', 400);
        }
      } else {
        const isCash = modeUpper === 'CASH';
        resolvedAccount = await resolveCashAccount(
          Source.manager,
          invoice.branchId,
          data.paymentMode,
        );
        if (!resolvedAccount) {
          throw new AppError(
            `No default ${isCash ? 'Cash in Hand' : 'Cash at Bank'} account is configured for this branch. ` +
              `Go to Accounts → Cash & Bank, add a ${isCash ? 'CASH' : 'BANK'}-type account and mark it as default.`,
            422,
          );
        }
      }
    }

    const payment = this.paymentRepo.create({
      invoiceId: data.invoiceId,
      amountPaid: data.amountPaid,
      paymentMode: data.paymentMode,
      paymentDate: new Date(data.paymentDate),
      referenceNumber: data.referenceNumber,
      remarks: data.remarks,
      recordedBy: data.recordedBy,
      receiptUrl: data.receiptUrl,
    });

    await this.paymentRepo.save(payment);
    logger.info(`Recorded payment of ${data.amountPaid} for Invoice ${invoice.invoiceNumber}`);

    // Post to cashbook / create cheque record based on payment mode
    if (invoice.branchId) {
      try {
        if (modeUpper === 'CHEQUE') {
          // Option B deferred: create a PENDING cheque record; no cashbook/balance movement yet.
          // Cash at Bank only moves when Finance later deposits this cheque in the Cheques module.
          const chequeNo = data.chequeNumber || data.referenceNumber;
          const chequeRepo = Source.getRepository(Cheque);
          const saleType = (invoice.saleType ?? '').toUpperCase(); // SALE | RENT | LEASE
          const srcType =
            saleType === 'SALE'
              ? 'SALE'
              : saleType === 'RENT'
                ? 'RENT'
                : saleType === 'LEASE'
                  ? 'LEASE'
                  : 'SALE';
          const cheque = chequeRepo.create({
            chequeNo,
            bankName: data.chequeBankName || undefined,
            partyName: invoice.customerName || invoice.customerId || 'Customer',
            amount: data.amountPaid,
            dueDate: new Date(data.chequeDueDate!),
            issueDate: data.paymentDate ? new Date(data.paymentDate as string) : new Date(),
            type: 'RECEIVED',
            status: 'PENDING',
            description: `Contract payment — ${invoice.invoiceNumber} (ledger ref: ${payment.id})`,
            branchId: invoice.branchId,
            createdBy: data.recordedBy,
            sourceType: srcType,
            sourceReferenceId: invoice.id,
            sourceLabel: `${srcType === 'SALE' ? 'Invoice' : srcType} ${invoice.invoiceNumber}`,
            invoiceNo: invoice.invoiceNumber,
          });
          await chequeRepo.save(cheque);
          logger.info(
            `Cheque record created (PENDING) for payment ${payment.id} on ${invoice.invoiceNumber}`,
          );
        } else {
          // CASH → Cash in Hand; BANK_TRANSFER / CREDIT_CARD → Cash at Bank
          // Account already validated & resolved before the payment row was saved.
          const account = resolvedAccount!;
          await postCashbookEntry({
            date: data.paymentDate ? new Date(data.paymentDate as string) : new Date(),
            entryType: 'RECEIPT',
            amount: data.amountPaid,
            category: 'Customer Payment',
            branchId: invoice.branchId,
            createdBy: data.recordedBy,
            paymentMode: data.paymentMode,
            accountId: account.id,
            linkedInvoiceId: data.invoiceId,
            description: `Receipt — ${invoice.invoiceNumber}`,
            chequeNo: data.referenceNumber,
            sourceType: 'INVOICE_PAYMENT',
            sourceId: payment.id,
          });
        }
      } catch (err) {
        // Re-throw validation/config errors so the caller sees them clearly
        if (err instanceof AppError) throw err;
        logger.error('Failed to post invoice receipt to cashbook', err);
      }
    }

    await logAudit(invoice.id, 'PAYMENT', data.recordedBy);
    return payment;
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

    return {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customerName || invoice.customerId,
      totalAmount,
      totalPaid,
      pendingBalance,
      payments,
      status: invoice.status,
    };
  }
}
