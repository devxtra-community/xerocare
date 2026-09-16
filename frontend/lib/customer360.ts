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
  /** True when this collection is a refundable security deposit rather than payment. */
  isSecurityDeposit?: boolean;
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

/** A return/credit note as shown in the 360° profile. */
export interface Customer360CreditNote extends CreatedByInfo {
  id: string;
  creditNoteNo: string;
  invoiceId: string;
  invoiceNumber?: string;
  type: 'DIRECT_REFUND' | 'REPLACEMENT' | 'CREDIT_EXCHANGE';
  status: string;
  itemCategory?: 'PRODUCT' | 'SPARE_PART';
  productName?: string;
  serialNumber?: string;
  quantity?: number;
  productAmount: number;
  taxAmount?: number;
  replacementAmount?: number;
  replacementDiscount?: number;
  damageReason?: string;
  notes?: string;
  financeNote?: string;
}

/** A cheque held as security against a contract — an obligation to return, not income. */
export interface Customer360GuaranteeCheque {
  id: string;
  chequeNumber: string;
  amount: number;
  currencyCode?: string;
  bankName?: string;
  receivedDate?: string;
  chequeDate?: string | null;
  status?: string;
  contractReference?: string | null;
  contractInvoiceId?: string | null;
}

/** Customer debt raised outside an invoice — e.g. a Credit Exchange difference. */
export interface Customer360ManualReceivable {
  id: string;
  referenceNo: string;
  type: string;
  description?: string;
  amount: number;
  amountPaid?: number;
  outstanding?: number;
  currency: string;
  status: string;
  issueDate?: string;
  dueDate?: string;
  creditNoteNo?: string;
  approvalStatus?: string;
}

export interface Customer360Summary {
  totalInvoiced: number;
  /** Excludes security deposits — those are refundable, not payment of the contract. */
  totalPaid: number;
  /** Not clamped at zero: a negative value is a genuine overpayment, not an error. */
  totalOutstanding: number;
  totalDepositsHeld: number;
  manualOutstanding: number;
  creditNoteValue: number;
  guaranteeChequeValue: number;
  contractCount: number;
  quotationCount: number;
  paymentCount: number;
  billCount: number;
  agreementCount: number;
  creditNoteCount: number;
  depositCount: number;
}

export interface Customer360Profile {
  invoices: Customer360Invoice[];
  payments: SalePaymentRequest[];
  agreements: AgreementSummary[];
  bills: Customer360Bill[];
  creditNotes: Customer360CreditNote[];
  guaranteeCheques: Customer360GuaranteeCheque[];
  manualReceivables: Customer360ManualReceivable[];
  securityDeposits: SalePaymentRequest[];
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
