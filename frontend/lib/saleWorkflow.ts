import api from './api';

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

// Public (no auth header needed — for the remote signing page)
export const getContractForSigning = async (token: string): Promise<Partial<ContractAgreement>> => {
  const res = await api.get<ApiResponse<Partial<ContractAgreement>>>(`/b/contract/sign/${token}`);
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

export const getAllSalePayments = async (): Promise<SalePaymentRequest[]> => {
  const res = await api.get<ApiResponse<SalePaymentRequest[]>>('/b/sale-payments');
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
