import api from './api';
import { Invoice } from './invoice';
import { Lead } from './lead';
import { Bill } from './saleWorkflow';

/** Every entity type in the 360° profile carries this — who created/handled it, and
 *  when. `createdByRole` is this app's closest analog to "department" (Employee/
 *  Finance/Manager/Admin) — there's no separate department field anywhere in this
 *  system, role is the classifier already used everywhere else for this. */
export interface CreatedByInfo {
  createdAt?: string;
  createdByRole?: string;
}

export interface SalePaymentRequest extends CreatedByInfo {
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

export interface AgreementSummary extends CreatedByInfo {
  id: string;
  invoiceId: string;
  agreementNumber: string;
  signatureStatus: string;
  employeeSignedAt?: string | null;
  customerSignedAt?: string | null;
  createdByEmployeeName?: string;
}

/** A Rent/Lease Bill (UsageRecord) as shown in the 360° profile. */
export type Customer360Bill = Bill & CreatedByInfo;

export type Customer360Invoice = Invoice & CreatedByInfo;

export interface Customer360Summary {
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  contractCount: number;
  paymentCount: number;
  billCount: number;
}

export interface Customer360Profile {
  invoices: Customer360Invoice[];
  payments: SalePaymentRequest[];
  agreements: AgreementSummary[];
  bills: Customer360Bill[];
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

/** Employee-side, personal-only: only this employee's own quotations/contracts/bills/
 *  payments/agreements for this customer, within their own branch. */
export async function getMyCustomer360Profile(customerId: string): Promise<Customer360Profile> {
  const response = await api.get<{ success: boolean; data: Customer360Profile }>(
    `/b/customers/${customerId}/my-360-profile`,
  );
  return response.data.data;
}

export async function getLeadByCustomerId(customerId: string): Promise<Lead | null> {
  const response = await api.get<{ success: boolean; data: Lead | null }>(
    `/c/leads/by-customer/${customerId}`,
  );
  return response.data.data;
}
