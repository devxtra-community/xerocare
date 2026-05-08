import api from './api';

export interface PaymentLedger {
  id: string;
  invoiceId: string;
  amountPaid: number;
  paymentMode: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'CREDIT_CARD';
  paymentDate: string;
  referenceNumber?: string;
  remarks?: string;
  recordedBy: string;
  createdAt: string;
}

export interface PaymentSummary {
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  totalAmount: number;
  totalPaid: number;
  pendingBalance: number;
  payments: PaymentLedger[];
  status: string;
}

export const recordPayment = async (data: {
  invoiceId: string;
  amountPaid: number;
  paymentMode: string;
  paymentDate: string;
  referenceNumber?: string;
  remarks?: string;
}): Promise<PaymentLedger> => {
  const response = await api.post('/b/payments/record', data);
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
