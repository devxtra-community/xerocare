import api from './api';
import { toast } from 'sonner';
import type { Invoice } from './invoice';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SignatureStatus =
  | 'PENDING_SIGNATURES'
  | 'EMPLOYEE_SIGNED'
  | 'CUSTOMER_SIGNED'
  | 'FULLY_SIGNED';

export interface ContractAgreement {
  id: string;
  agreementNumber: string;
  invoiceId: string;
  branchId: string;
  contractDate: string;
  customerName: string;
  customerAddress?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerVatNumber?: string;
  createdByEmployeeId: string;
  createdByEmployeeName: string;
  dealerName: string;
  dealerAddress?: string;
  dealerPhone?: string;
  employeeSignatureData?: string;
  employeeSignedById?: string;
  employeeSignedByName?: string;
  employeeSignedAt?: string;
  customerSignatureData?: string;
  customerSignedDocumentUrl?: string;
  customerSignedDocumentNote?: string;
  customerSignedMethod?: 'IN_PERSON' | 'REMOTE' | 'UPLOAD';
  customerSignedByName?: string;
  customerSignedAt?: string;
  signingToken?: string;
  signingTokenExpiresAt?: string;
  signingTokenUsed?: boolean;
  signatureStatus: SignatureStatus;
  termsAndConditions?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InstallationRequest {
  id: string;
  invoiceId: string;
  branchId: string;
  currentProductId?: string | null;
  currentSerialNumber?: string | null;
  currentModelId?: string | null;
  assignedByEmployeeId: string;
  assignedByEmployeeName: string;
  technicianId?: string;
  technicianName?: string;
  customerName: string;
  customerAddress?: string;
  invoiceNumber: string;
  notes?: string;
  startTime?: string;
  endTime?: string;
  durationSeconds?: number;
  saleType?: string;
  initialReadingEnteredAt?: string;
  initialReadingEnteredByName?: string;
  initialReadingPhotoUrl?: string;
  initialReadingTakenDate?: string;
  status: 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';
  createdAt: string;
  updatedAt: string;
}

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
  cashAccountId?: string;
  chequeNumber?: string;
  chequeBankName?: string;
  chequeDueDate?: string;
  chequeDate?: string;
  receiptUrl?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedById?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  paymentTransactionId?: string;
  collectLater?: boolean;
  paymentContext?: 'SALE' | 'RENT_ADVANCE' | 'RENT_PERIODIC' | 'LEASE_ADVANCE' | 'LEASE_PERIODIC';
  /** Links a RENT_PERIODIC/LEASE_PERIODIC collection to the billing period it pays toward. */
  usageRecordId?: string;
  /** Informational only, present for RENT_ADVANCE/LEASE_ADVANCE rows once an Advance
   *  Bill exists — the customer's sign-off on the Bill, separate from and never gating
   *  this payment's own approval status above. */
  advanceBillId?: string;
  advanceBillStatus?: BillStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SaleContract {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string | null;
  createdByEmployeeId?: string | null;
  createdByEmployeeName?: string | null;
  status: string;
  contractStatus: string;
  deliveryStatus: 'DELIVERED' | 'NOT_DELIVERED';
  saleType: string;
  totalAmount: number;
  currencyCode: string;
  createdAt: string;
  agreement: ContractAgreement | null;
  installation: InstallationRequest | null;
  currentProductId?: string | null;
  currentSerialNumber?: string | null;
  currentModelId?: string | null;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  /** Non-blocking heads-up alongside a successful response — e.g. recordSalePayment's
   * amount-looks-too-high check. Never present on failure; never a reason to retry. */
  warning?: string;
}

// ─── Contract Agreements ──────────────────────────────────────────────────────

export const getContractAgreement = async (
  invoiceId: string,
): Promise<ContractAgreement | null> => {
  const res = await api.get<ApiResponse<ContractAgreement | null>>(
    `/b/invoices/${invoiceId}/contract-agreement`,
  );
  return res.data.data;
};

export const createOrGetContractAgreement = async (
  invoiceId: string,
  data: {
    customerName: string;
    customerAddress?: string;
    customerPhone?: string;
    customerEmail?: string;
    customerVatNumber?: string;
    dealerName: string;
    dealerAddress?: string;
    dealerPhone?: string;
    termsAndConditions?: string;
  },
): Promise<ContractAgreement> => {
  const res = await api.post<ApiResponse<ContractAgreement>>(
    `/b/invoices/${invoiceId}/contract-agreement`,
    data,
  );
  return res.data.data;
};

export const signContractEmployee = async (
  invoiceId: string,
  signatureData: string,
): Promise<ContractAgreement> => {
  const res = await api.post<ApiResponse<ContractAgreement>>(
    `/b/invoices/${invoiceId}/contract-agreement/sign-employee`,
    { signatureData },
  );
  return res.data.data;
};

export const signContractCustomerInPerson = async (
  invoiceId: string,
  signatureData: string,
  customerName?: string,
): Promise<ContractAgreement> => {
  const res = await api.post<ApiResponse<ContractAgreement>>(
    `/b/invoices/${invoiceId}/contract-agreement/sign-customer`,
    { signatureData, customerName },
  );
  return res.data.data;
};

export const signContractCustomerByUpload = async (
  invoiceId: string,
  file: File,
  attestationNote: string,
  customerName?: string,
): Promise<ContractAgreement> => {
  const form = new FormData();
  form.append('file', file);
  form.append('attestationNote', attestationNote);
  if (customerName) form.append('customerName', customerName);
  const res = await api.post<ApiResponse<ContractAgreement>>(
    `/b/invoices/${invoiceId}/contract-agreement/sign-customer-upload`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return res.data.data;
};

export const generateSigningToken = async (
  invoiceId: string,
): Promise<{ token: string; expiresAt: string }> => {
  const res = await api.post<ApiResponse<{ token: string; expiresAt: string }>>(
    `/b/invoices/${invoiceId}/contract-agreement/signing-token`,
  );
  return res.data.data;
};

export const sendContractAgreementEmail = async (
  invoiceId: string,
  recipient?: string,
): Promise<{ message: string; recipient: string; link: string }> => {
  const res = await api.post<ApiResponse<{ message: string; recipient: string; link: string }>>(
    `/b/invoices/${invoiceId}/contract-agreement/notify/email`,
    recipient ? { recipient } : {},
  );
  return res.data.data;
};

export const sendContractAgreementWhatsApp = async (
  invoiceId: string,
  recipient?: string,
): Promise<{ message: string; recipient: string; link: string }> => {
  const res = await api.post<ApiResponse<{ message: string; recipient: string; link: string }>>(
    `/b/invoices/${invoiceId}/contract-agreement/notify/whatsapp`,
    recipient ? { recipient } : {},
  );
  return res.data.data;
};

// Public (no auth header needed — for the remote signing page). Returns the full
// linked invoice alongside the agreement so the customer sees the actual contract
// document (equipment, pricing/rent/lease terms, advance/deposit, warranty) via the
// same ContractDocumentBody the authenticated employee-facing view renders, not
// just a name/date summary.
export interface ContractForSigning {
  agreement: Partial<ContractAgreement>;
  invoice: Invoice | null;
}

export const getContractForSigning = async (token: string): Promise<ContractForSigning> => {
  const res = await api.get<ApiResponse<ContractForSigning>>(`/b/contract/sign/${token}`);
  return res.data.data;
};

export const signContractRemote = async (
  token: string,
  signatureData: string,
  customerName?: string,
): Promise<{ agreementNumber: string; customerName: string; signedAt: string }> => {
  const res = await api.post<
    ApiResponse<{ agreementNumber: string; customerName: string; signedAt: string }>
  >(`/b/contract/sign/${token}`, { signatureData, customerName });
  return res.data.data;
};

// ─── Installation Requests ────────────────────────────────────────────────────

export const getInstallationRequests = async (): Promise<InstallationRequest[]> => {
  const res = await api.get<ApiResponse<InstallationRequest[]>>('/b/installation-requests');
  return res.data.data;
};

export const createInstallationRequest = async (
  invoiceId: string,
  data: {
    customerName: string;
    customerAddress?: string;
    invoiceNumber: string;
    notes?: string;
  },
): Promise<InstallationRequest> => {
  const res = await api.post<ApiResponse<InstallationRequest>>(
    `/b/invoices/${invoiceId}/installation-request`,
    data,
  );
  return res.data.data;
};

export const assignTechnician = async (
  requestId: string,
  technicianId: string,
  technicianName: string,
): Promise<InstallationRequest> => {
  const res = await api.patch<ApiResponse<InstallationRequest>>(
    `/b/installation-requests/${requestId}/assign`,
    { technicianId, technicianName },
  );
  return res.data.data;
};

export const startInstallation = async (requestId: string): Promise<InstallationRequest> => {
  const res = await api.post<ApiResponse<InstallationRequest>>(
    `/b/installation-requests/${requestId}/start`,
  );
  return res.data.data;
};

export const stopInstallation = async (
  requestId: string,
  readings?: {
    bwCount?: number;
    bwA3Count?: number;
    colorCount?: number;
    colorA3Count?: number;
    readingPhotoUrl?: string;
    readingTakenDate?: string;
  },
): Promise<InstallationRequest> => {
  const res = await api.post<ApiResponse<InstallationRequest>>(
    `/b/installation-requests/${requestId}/stop`,
    readings ?? {},
  );
  return res.data.data;
};

// ─── Sale Payments ────────────────────────────────────────────────────────────

export const getSalePaymentsForInvoice = async (
  invoiceId: string,
): Promise<SalePaymentRequest[]> => {
  const res = await api.get<ApiResponse<SalePaymentRequest[]>>(
    `/b/invoices/${invoiceId}/sale-payments`,
  );
  return res.data.data;
};

export const getPendingSalePayments = async (): Promise<SalePaymentRequest[]> => {
  const res = await api.get<ApiResponse<SalePaymentRequest[]>>('/b/sale-payments/pending');
  return res.data.data;
};

export const getAllSalePayments = async (params?: {
  /** ADMIN only — comma-separated branch ids. Ignored by the server for other roles,
   *  which stay locked to their own branch. */
  branchIds?: string;
}): Promise<SalePaymentRequest[]> => {
  const res = await api.get<ApiResponse<SalePaymentRequest[]>>('/b/sale-payments', { params });
  return res.data.data;
};

export interface PendingUsagePayment {
  usageRecordId: string;
  contractId: string;
  invoiceNumber: string;
  customerName: string | null;
  saleType: string | null;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  totalCharge: number;
  amountGiven: number;
  amountPending: number;
  billStatus?: BillStatus;
  createdAt: string;
}

/** Rent/Lease billing periods whose full charge hasn't yet been collected — a partial
 *  collection's shortfall, or a period recorded with nothing collected at all. */
export const getPendingUsagePayments = async (): Promise<PendingUsagePayment[]> => {
  const res = await api.get<ApiResponse<PendingUsagePayment[]>>('/b/usage-payments/pending');
  return res.data.data;
};

/** Collects a further amount against a specific period's outstanding shortfall. Creates
 *  its own PENDING SalePaymentRequest linked to the same usageRecordId. */
export const collectPendingUsagePayment = async (
  usageRecordId: string,
  data: {
    amount: number;
    paymentMode: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE';
    paymentDate: string;
    referenceNumber?: string;
    cashAccountId?: string;
    chequeNumber?: string;
    chequeBankName?: string;
    chequeDueDate?: string;
    chequeDate?: string;
  },
): Promise<SalePaymentRequest> => {
  const res = await api.post<ApiResponse<SalePaymentRequest>>(
    `/b/usage-records/${usageRecordId}/collect-pending`,
    data,
  );
  return res.data.data;
};

export const recordSalePayment = async (
  invoiceId: string,
  data: {
    amount: number;
    paymentMode: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE';
    paymentDate: string;
    referenceNumber?: string;
    remarks?: string;
    cashAccountId?: string;
    chequeNumber?: string;
    chequeBankName?: string;
    chequeDueDate?: string;
    chequeDate?: string;
    collectLater?: boolean;
    paymentContext?: 'SALE' | 'RENT_ADVANCE' | 'RENT_PERIODIC' | 'LEASE_ADVANCE' | 'LEASE_PERIODIC';
  },
): Promise<SalePaymentRequest> => {
  const res = await api.post<ApiResponse<SalePaymentRequest>>(
    `/b/invoices/${invoiceId}/sale-payments`,
    data,
  );
  // Soft, non-blocking: the request was already created successfully by the time this
  // fires — a toast here is a heads-up to double-check the amount, not an error state.
  if (res.data.warning) {
    toast.warning('Check this amount', { description: res.data.warning, duration: 10000 });
  }
  return res.data.data;
};

export const approveSalePayment = async (
  requestId: string,
  cashAccountId?: string,
): Promise<SalePaymentRequest> => {
  const res = await api.post<ApiResponse<SalePaymentRequest>>(
    `/b/sale-payments/${requestId}/approve`,
    cashAccountId ? { cashAccountId } : {},
  );
  return res.data.data;
};

export const rejectSalePayment = async (
  requestId: string,
  rejectionReason: string,
): Promise<SalePaymentRequest> => {
  const res = await api.post<ApiResponse<SalePaymentRequest>>(
    `/b/sale-payments/${requestId}/reject`,
    { rejectionReason },
  );
  return res.data.data;
};

export const generateSalePaymentReceipt = async (
  requestId: string,
): Promise<{ receiptUrl: string }> => {
  const res = await api.post<ApiResponse<{ receiptUrl: string }>>(
    `/b/sale-payments/${requestId}/generate-receipt`,
  );
  return res.data.data;
};

export const sendReceiptEmail = async (
  requestId: string,
  recipient?: string,
): Promise<{ message: string; recipient: string }> => {
  const res = await api.post<ApiResponse<{ message: string; recipient: string }>>(
    `/b/sale-payments/${requestId}/notify/email`,
    recipient ? { recipient } : {},
  );
  return res.data.data;
};

export const sendReceiptWhatsApp = async (
  requestId: string,
  recipient?: string,
): Promise<{ message: string; recipient: string }> => {
  const res = await api.post<ApiResponse<{ message: string; recipient: string }>>(
    `/b/sale-payments/${requestId}/notify/whatsapp`,
    recipient ? { recipient } : {},
  );
  return res.data.data;
};

// ─── Sale Contracts ───────────────────────────────────────────────────────────

export const getSaleContracts = async (): Promise<SaleContract[]> => {
  const res = await api.get<ApiResponse<SaleContract[]>>('/b/sale-contracts');
  return res.data.data;
};

export const updateDeliveryStatus = async (
  contractId: string,
  deliveryStatus: 'DELIVERED' | 'NOT_DELIVERED',
): Promise<{ id: string; deliveryStatus: string }> => {
  const res = await api.patch<ApiResponse<{ id: string; deliveryStatus: string }>>(
    `/b/sale-contracts/${contractId}/delivery-status`,
    { deliveryStatus },
  );
  return res.data.data;
};

// ─── Bill (UsageRecord) creation + customer approval — Stage A ───────────────
// A UsageRecord doubles as the period's Bill — submitting usage creates it (Outstanding
// posts immediately), and it must be Customer Approved (remote link or a Finance manual
// override with a required note) before any payment may be collected against it. See
// collectPendingUsagePayment's hard gate.

export type BillStatus = 'PENDING_APPROVAL' | 'CUSTOMER_APPROVED' | 'CUSTOMER_REJECTED';
export type BillApprovalMethod = 'REMOTE_LINK' | 'FINANCE_MANUAL';
/** USAGE = a periodic billing-period Bill (readings apply). ADVANCE = wraps the
 *  contract's already-collected RENT_ADVANCE/LEASE_ADVANCE payment for customer sign-off
 *  only — no period, no readings, same entity/pipeline either way. */
export type BillType = 'USAGE' | 'ADVANCE';

export interface Bill {
  id: string;
  contractId: string;
  billType: BillType;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  bwA4Count: number;
  bwA3Count: number;
  colorA4Count: number;
  colorA3Count: number;
  bwA4Delta: number;
  bwA3Delta: number;
  colorA4Delta: number;
  colorA3Delta: number;
  exceededTotal: number;
  exceededCharge: number;
  monthlyRent: number;
  advanceAdjusted: number;
  totalCharge: number;
  taxableAmount: number;
  taxAmount: number;
  taxPercent?: number;
  discountBwCopies: number;
  discountColorCopies: number;
  discountAmount: number;
  remarks?: string;
  meterImageUrl?: string;
  createdAt: string;
  billStatus: BillStatus;
  billCreatedByName?: string;
  billSentAt?: string;
  signingTokenExpiresAt?: string;
  signingTokenUsed?: boolean;
  customerApprovedByName?: string;
  customerApprovedAt?: string;
  customerApprovalMethod?: BillApprovalMethod;
  customerApprovalNote?: string;
  customerRejectionReason?: string;
  customerRejectedAt?: string;
  items?: Array<{
    allocationId: string;
    allocation?: { serialNumber: string; modelId: string };
    startBwA4: number;
    endBwA4: number;
    deltaBwA4: number;
    startBwA3: number;
    endBwA3: number;
    deltaBwA3: number;
    startColorA4: number;
    endColorA4: number;
    deltaColorA4: number;
    startColorA3: number;
    endColorA3: number;
    deltaColorA3: number;
  }>;
}

export interface BillForContract {
  usageRecordId: string;
  billType: BillType;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  totalCharge: number;
  amountGiven: number;
  amountPending: number;
  billStatus: BillStatus;
  billCreatedByName?: string;
  customerApprovedByName?: string;
  customerApprovedAt?: string;
  customerApprovalMethod?: BillApprovalMethod;
  customerRejectionReason?: string;
  createdAt: string;
}

export const getBill = async (
  usageRecordId: string,
): Promise<{ usage: Bill; invoice: Invoice; advancePayment: SalePaymentRequest | null }> => {
  const res = await api.get<
    ApiResponse<{ usage: Bill; invoice: Invoice; advancePayment: SalePaymentRequest | null }>
  >(`/b/usage/${usageRecordId}/bill`);
  return res.data.data;
};

/** Get-or-create the Advance Bill for a contract — idempotent, safe to call again. */
export const generateAdvanceBill = async (contractId: string): Promise<Bill> => {
  const res = await api.post<ApiResponse<Bill>>(`/b/usage/contract/${contractId}/advance-bill`);
  return res.data.data;
};

/** "Edit & Resend" for a disputed Advance Bill — resets the approval trail only, never
 *  the amount (that's the real collected payment, corrected elsewhere if ever needed). */
export const resetBillForResend = async (usageRecordId: string): Promise<Bill> => {
  const res = await api.post<ApiResponse<Bill>>(`/b/usage/${usageRecordId}/bill/reset-for-resend`);
  return res.data.data;
};

export interface AdvanceBillStatus {
  hasAdvancePayment: boolean;
  advanceBillId?: string;
  advanceBillStatus?: BillStatus;
}

export const getAdvanceBillStatus = async (
  contractIds: string[],
): Promise<Record<string, AdvanceBillStatus>> => {
  if (contractIds.length === 0) return {};
  const res = await api.get<ApiResponse<Record<string, AdvanceBillStatus>>>(
    '/b/usage/advance-bill-status',
    { params: { contractIds: contractIds.join(',') } },
  );
  return res.data.data;
};

export const getBillsForContract = async (contractId: string): Promise<BillForContract[]> => {
  const res = await api.get<ApiResponse<BillForContract[]>>(
    `/b/usage/by-contract/${contractId}/bills`,
  );
  return res.data.data;
};

export const generateBillSigningToken = async (
  usageRecordId: string,
): Promise<{ token: string; expiresAt: string }> => {
  const res = await api.post<ApiResponse<{ token: string; expiresAt: string }>>(
    `/b/usage/${usageRecordId}/bill/signing-token`,
  );
  return res.data.data;
};

export const sendBillEmail = async (
  usageRecordId: string,
  recipient?: string,
): Promise<{ message: string; recipient: string; link: string }> => {
  const res = await api.post<ApiResponse<{ message: string; recipient: string; link: string }>>(
    `/b/usage/${usageRecordId}/bill/notify/email`,
    recipient ? { recipient } : {},
  );
  return res.data.data;
};

export const sendBillWhatsApp = async (
  usageRecordId: string,
  recipient?: string,
): Promise<{ message: string; recipient: string; link: string }> => {
  const res = await api.post<ApiResponse<{ message: string; recipient: string; link: string }>>(
    `/b/usage/${usageRecordId}/bill/notify/whatsapp`,
    recipient ? { recipient } : {},
  );
  return res.data.data;
};

export const markBillApprovedManually = async (
  usageRecordId: string,
  data: { customerName?: string; approvalNote: string },
): Promise<Bill> => {
  const res = await api.post<ApiResponse<Bill>>(
    `/b/usage/${usageRecordId}/bill/mark-approved`,
    data,
  );
  return res.data.data;
};

// Public (no auth header needed — for the remote bill-approval page).
export interface BillForSigning {
  usage: Partial<Bill>;
  invoice: Invoice | null;
  advancePayment?: SalePaymentRequest | null;
}

export const getBillForSigning = async (token: string): Promise<BillForSigning> => {
  const res = await api.get<ApiResponse<BillForSigning>>(`/b/bill/sign/${token}`);
  return res.data.data;
};

export const approveBillRemote = async (
  token: string,
  customerName: string,
): Promise<{ billingPeriodEnd: string; approvedAt: string }> => {
  const res = await api.post<ApiResponse<{ billingPeriodEnd: string; approvedAt: string }>>(
    `/b/bill/sign/${token}/approve`,
    { customerName },
  );
  return res.data.data;
};

export const rejectBillRemote = async (
  token: string,
  reason: string,
): Promise<{ rejectedAt: string }> => {
  const res = await api.post<ApiResponse<{ rejectedAt: string }>>(`/b/bill/sign/${token}/reject`, {
    reason,
  });
  return res.data.data;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
