import api from './api';

export interface PaymentLedger {
  id: string;
  invoiceId: string;
  amountPaid: number;
  paymentMode: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'CREDIT_CARD';
  paymentDate: string;
  referenceNumber?: string;
  remarks?: string;
  receiptUrl?: string;
  recordedBy: string;
  createdAt: string;
  /** Currency amountPaid is recorded in — may differ from the invoice's own
   * currency when paid from a foreign-currency customer bank account. */
  currencyCode?: string;
  /** Rate to convert currencyCode -> invoice currency, snapshotted at payment
   * time. Only meaningful when currencyCode differs from the invoice currency. */
  exchangeRateSnapshot?: number;
}

export interface PaymentSummary {
  invoiceId: string;
  invoiceNumber: string;
  customerId?: string;
  customerName: string;
  /** The invoice's own currency — payments may be recorded in a different one. */
  currency?: string;
  totalAmount: number;
  totalPaid: number;
  pendingBalance: number;
  payments: PaymentLedger[];
  status: string;
  currencyWarnings?: string[];
}

export const recordPayment = async (data: {
  invoiceId: string;
  amountPaid: number;
  paymentMode: string;
  paymentDate: string;
  referenceNumber?: string;
  remarks?: string;
  receiptFile?: File | null;
  // Required when paymentMode === 'CHEQUE'
  chequeNumber?: string;
  chequeBankName?: string;
  chequeDueDate?: string;
  /** Currency this payment is made in, when different from the invoice's own
   * currency (e.g. paid from a foreign-currency customer bank account). */
  currency?: string;
  /** Rate to convert `currency` -> invoice currency, required whenever
   * `currency` is provided and differs from the invoice currency. */
  exchangeRate?: number;
}): Promise<PaymentLedger> => {
  // `invoiceId` must be appended before `receipt` — multer-s3 reads req.body fields
  // as they stream in, and the file's storage key is keyed off invoiceId.
  const form = new FormData();
  form.append('invoiceId', data.invoiceId);
  form.append('amountPaid', String(data.amountPaid));
  form.append('paymentMode', data.paymentMode);
  form.append('paymentDate', data.paymentDate);
  if (data.referenceNumber) form.append('referenceNumber', data.referenceNumber);
  if (data.remarks) form.append('remarks', data.remarks);
  if (data.receiptFile) form.append('receipt', data.receiptFile);
  if (data.chequeNumber) form.append('chequeNumber', data.chequeNumber);
  if (data.chequeBankName) form.append('chequeBankName', data.chequeBankName);
  if (data.chequeDueDate) form.append('chequeDueDate', data.chequeDueDate);
  if (data.currency) form.append('currency', data.currency);
  if (data.exchangeRate) form.append('exchangeRate', String(data.exchangeRate));

  // Let the browser set Content-Type (incl. multipart boundary) — do not set it manually.
  const response = await api.post('/b/payments/record', form);
  return response.data.data;
};

export const getPaymentsByInvoice = async (invoiceId: string): Promise<PaymentLedger[]> => {
  const response = await api.get(`/b/payments/${invoiceId}`);
  return response.data.data;
};

export const getAccountSummary = async (invoiceId: string): Promise<PaymentSummary> => {
  const response = await api.get(`/b/payments/summary/${invoiceId}`);
  return response.data.data;
};
