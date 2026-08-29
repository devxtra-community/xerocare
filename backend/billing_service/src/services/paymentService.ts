import { Source } from '../config/dataSource';
import { PaymentLedger, PaymentMode } from '../entities/paymentLedgerEntity';
import { PaymentTransaction } from '../entities/paymentTransactionEntity';
import { Invoice } from '../entities/invoiceEntity';
import { AppError } from '../errors/appError';
import { BillingService } from './billingService';
import { loadExchangeRates, convertAmt } from '../utils/accountsShared';
import { r2SignedGetUrl } from '../utils/r2Url';

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
  /** Refundable caution money rather than settlement — listed in payment history but
   * never counted toward what the invoice has been paid. Only PaymentTransaction rows
   * carry it; legacy PaymentLedger rows fall back to the remarks convention. */
  isSecurityDeposit?: boolean;
  receiptUrl?: string;
  recordedBy?: string;
  createdAt: Date;
  /** Currency amountPaid is recorded in — may differ from the invoice's own
   * currency when paid from a foreign-currency customer bank account. */
  currencyCode?: string;
  /** Rate to convert currencyCode -> invoice currency, snapshotted at payment
   * time. Only meaningful when currencyCode differs from the invoice currency. */
  exchangeRateSnapshot?: number;
}

export class PaymentService {
  private legacyRepo = Source.getRepository(PaymentLedger);
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
    chequeNumber?: string;
    chequeBankName?: string;
    chequeDueDate?: string;
    /** The date physically written on the cheque — independent of chequeDueDate. */
    chequeDate?: string;
    /** Currency amountPaid is in, when different from the invoice's own currency
     * (e.g. paid from a foreign-currency customer bank account). */
    currencyCode?: string;
    /** Rate to convert currencyCode -> invoice currency, required whenever
     * currencyCode is provided and differs from the invoice currency. */
    exchangeRate?: number;
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
        chequeNumber: data.chequeNumber,
        chequeBankName: data.chequeBankName,
        chequeDueDate: data.chequeDueDate,
        chequeDate: data.chequeDate,
        currencyCode: data.currencyCode,
        exchangeRate: data.exchangeRate,
      },
      data.recordedBy,
    );
  }

  async getPaymentsByInvoice(invoiceId: string): Promise<PaymentRecord[]> {
    const [legacyRows, txns] = await Promise.all([
      this.legacyRepo.find({ where: { invoiceId } }).catch(() => []),
      this.transactionRepo.find({ where: { invoiceId } }).catch(() => []),
    ]);

    const merged: PaymentRecord[] = [
      ...(await Promise.all(
        legacyRows.map(async (p) => ({
          id: p.id,
          invoiceId: p.invoiceId,
          amountPaid: Number(p.amountPaid),
          paymentMode: p.paymentMode as string,
          paymentDate: p.paymentDate,
          referenceNumber: p.referenceNumber,
          remarks: p.remarks,
          receiptUrl: await r2SignedGetUrl(p.receiptUrl),
          recordedBy: p.recordedBy,
          createdAt: p.createdAt,
        })),
      )),
      ...(await Promise.all(
        txns.map(async (t) => ({
          id: t.id,
          invoiceId: t.invoiceId,
          amountPaid: Number(t.amount),
          paymentMode: t.paymentMode,
          paymentDate: t.transactionDate,
          referenceNumber: t.referenceNumber,
          remarks: t.remarks,
          isSecurityDeposit: t.isSecurityDeposit === true,
          receiptUrl: await r2SignedGetUrl(t.receiptUrl),
          recordedBy: t.recordedBy,
          createdAt: t.createdAt,
          currencyCode: t.currencyCode,
          exchangeRateSnapshot: t.exchangeRateSnapshot ? Number(t.exchangeRateSnapshot) : undefined,
        })),
      )),
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

    const invoiceCurrency = invoice.currencyCode || 'AED';
    const payments = await this.getPaymentsByInvoice(invoiceId);

    // A payment may be recorded in a currency other than the invoice's own (paid
    // from a foreign-currency customer bank account) — convert each to the
    // invoice's currency before summing, using the rate snapshotted at payment
    // time (historical accuracy), falling back to a live rate only for the rare
    // legacy row with no snapshot. Never silently add mismatched currencies.
    const liveRates = await loadExchangeRates(Source, invoiceCurrency);
    const currencyWarnings: string[] = [];
    const toInvoiceCurrency = (p: PaymentRecord): number => {
      if (!p.currencyCode || p.currencyCode === invoiceCurrency) return Number(p.amountPaid);
      const ratesForPayment = p.exchangeRateSnapshot
        ? new Map([[p.currencyCode, p.exchangeRateSnapshot]])
        : liveRates;
      const { value, warning } = convertAmt(
        Number(p.amountPaid),
        p.currencyCode,
        invoiceCurrency,
        ratesForPayment,
      );
      if (warning && !currencyWarnings.includes(warning)) currencyWarnings.push(warning);
      return value;
    };

    // Security deposits are shown in the ledger list but excluded from settlement
    // totals — they are refundable caution money, not payment against the invoice.
    // The isSecurityDeposit flag is what actually catches workflow-approved deposits;
    // the remarks string only ever matched the direct-recording path's wording, and is
    // kept for legacy payment_ledgers rows, which carry no flag.
    const totalPaid = payments
      .filter(
        (p) =>
          p.isSecurityDeposit !== true &&
          (p.remarks ?? '').trim().toLowerCase() !== 'security deposit',
      )
      .reduce((sum, p) => sum + toInvoiceCurrency(p), 0);
    const totalAmount = Number(invoice.totalAmount || 0);
    const pendingBalance = Math.max(0, Math.round((totalAmount - totalPaid) * 100) / 100);

    return {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerId: invoice.customerId,
      customerName: invoice.customerName || invoice.customerId,
      currency: invoiceCurrency,
      totalAmount,
      totalPaid,
      pendingBalance,
      payments,
      status: invoice.status,
      currencyWarnings,
    };
  }
}
