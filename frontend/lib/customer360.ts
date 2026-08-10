import api from './api';
import { Invoice } from './invoice';
import { Lead } from './lead';

export interface SalePaymentRequest {
  id: string;
  requestNo: string;
  invoiceId: string;
  invoiceNumber: string;
  branchId: string;
  recordedByEmployeeId: string;
  recordedByEmployeeName: string;
  customerName: string;
  amount: number;
  currency: string;
  paymentMode: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE';
  paymentDate: string;
  referenceNumber?: string;
  remarks?: string;
  chequeNumber?: string;
  chequeBankName?: string;
  chequeDueDate?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedByName?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  collectLater?: boolean;
  paymentContext?: 'SALE' | 'RENT_ADVANCE' | 'RENT_PERIODIC' | 'LEASE_ADVANCE' | 'LEASE_PERIODIC';
  receiptUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgreementSummary {
  id: string;
  invoiceId: string;
  agreementNumber: string;
  signatureStatus: string;
  employeeSignedAt?: string | null;
  customerSignedAt?: string | null;
}

export interface Customer360Summary {
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  contractCount: number;
  paymentCount: number;
}

export interface Customer360Profile {
  invoices: Invoice[];
  payments: SalePaymentRequest[];
  agreements: AgreementSummary[];
  summary: Customer360Summary;
}

export async function getCustomer360Profile(
  customerId: string,
  branchIds?: string[],
): Promise<Customer360Profile> {
  const params: Record<string, string> = {};
  if (branchIds && branchIds.length > 0) {
    params.branchIds = branchIds.join(',');
  }
  const response = await api.get<{ success: boolean; data: Customer360Profile }>(
    `/b/accounts/customers/${customerId}/profile`,
    { params },
  );
  return response.data.data;
}

export async function getLeadByCustomerId(customerId: string): Promise<Lead | null> {
  const response = await api.get<{ success: boolean; data: Lead | null }>(
    `/c/leads/by-customer/${customerId}`,
  );
  return response.data.data;
}
