import api from './api';

export interface InvoiceItem {
  id?: string;
  itemType?: 'PRICING_RULE' | 'PRODUCT';
  description: string;
  // Fixed
  bwIncludedLimit?: number;
  colorIncludedLimit?: number;
  combinedIncludedLimit?: number;
  // Excess
  bwExcessRate?: number;
  colorExcessRate?: number;
  combinedExcessRate?: number;
  // Slabs
  bwSlabRanges?: Array<{ from: number; to: number; rate: number }>;
  colorSlabRanges?: Array<{ from: number; to: number; rate: number }>;
  comboSlabRanges?: Array<{ from: number; to: number; rate: number }>;
  // Legacy
  quantity?: number;
  unitPrice?: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  branchId: string;
  customerId: string;
  createdBy: string;
  totalAmount: number;
  status: string;
  saleType: string;
  rentType?: 'FIXED_LIMIT' | 'FIXED_COMBO' | 'FIXED_FLAT' | 'CPC' | 'CPC_COMBO';
  rentPeriod?: 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY';

  // Lease Fields
  leaseType?: 'EMI' | 'FSM';
  leaseTenureMonths?: number;
  totalLeaseAmount?: number;
  monthlyEmiAmount?: number;
  monthlyLeaseAmount?: number;
  monthlyRent?: number;
  advanceAmount?: number;
  discountPercent?: number;
  effectiveFrom?: string;
  effectiveTo?: string;
  createdAt: string;
  employeeName: string;
  branchName: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  items?: InvoiceItem[];
  startDate?: string;
  endDate?: string;
  billingCycleInDays?: number;
  securityDepositAmount?: number;
  securityDepositMode?: 'CASH' | 'CHEQUE';
  securityDepositReference?: string;
  securityDepositReceivedDate?: string;

  // Audit Fields
  employeeApprovedBy?: string;
  employeeApprovedAt?: string;
  financeApprovedBy?: string;
  financeApprovedAt?: string;
  financeRemarks?: string;

  // Usage Snapshot
  bwA4Count?: number;
  bwA3Count?: number;
  colorA4Count?: number;
  colorA3Count?: number;
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
}

export interface CreateInvoicePayload {
  customerId: string;
  saleType: 'SALE' | 'RENT' | 'LEASE';

  // Rent Fields
  rentType?: 'FIXED_LIMIT' | 'FIXED_COMBO' | 'FIXED_FLAT' | 'CPC' | 'CPC_COMBO';
  rentPeriod?: 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY';

  // Lease Fields
  leaseType?: 'EMI' | 'FSM';
  leaseTenureMonths?: number;
  totalLeaseAmount?: number;
  monthlyEmiAmount?: number;
  monthlyLeaseAmount?: number;

  monthlyRent?: number;
  advanceAmount?: number;
  discountPercent?: number;
  effectiveFrom?: string;
  effectiveTo?: string;
  pricingItems?: {
    description: string;
    bwIncludedLimit?: number;
    colorIncludedLimit?: number;
    combinedIncludedLimit?: number;
    bwExcessRate?: number;
    colorExcessRate?: number;
    combinedExcessRate?: number;
    bwSlabRanges?: Array<{ from: number; to: number; rate: number }>;
    colorSlabRanges?: Array<{ from: number; to: number; rate: number }>;
    comboSlabRanges?: Array<{ from: number; to: number; rate: number }>;
  }[];

  // Sale Fields
  items?: {
    description: string;
    quantity: number;
    unitPrice: number;
    itemType?: 'PRODUCT' | 'PRICING_RULE';
  }[];
  startDate?: string;
  endDate?: string;
  billingCycleInDays?: number;
}

export const getInvoices = async (): Promise<Invoice[]> => {
  const response = await api.get('/b/invoices');
  return response.data.data;
};

export const getMyInvoices = async (): Promise<Invoice[]> => {
  const response = await api.get('/b/invoices/my-invoices');
  return response.data.data;
};

export const getBranchInvoices = async (): Promise<Invoice[]> => {
  const response = await api.get('/b/invoices/branch-invoices');
  return response.data.data;
};

export const createInvoice = async (payload: CreateInvoicePayload): Promise<Invoice> => {
  const response = await api.post('/b/invoices', payload);
  return response.data.data;
};

export const updateQuotation = async (
  id: string,
  payload: Partial<CreateInvoicePayload>,
): Promise<Invoice> => {
  const response = await api.put(`/b/invoices/${id}`, payload);
  return response.data.data;
};

export const approveQuotation = async (
  invoiceId: string,
  deposit?: {
    amount: number;
    mode: 'CASH' | 'CHEQUE';
    reference?: string;
    receivedDate?: string;
  },
): Promise<Invoice> => {
  const response = await api.put(`/b/invoices/${invoiceId}/approve`, { deposit });
  return response.data.data;
};

export const employeeApproveInvoice = async (id: string): Promise<Invoice> => {
  const response = await api.post(`/b/invoices/${id}/employee-approve`);
  return response.data.data;
};

export const financeApproveInvoice = async (id: string): Promise<Invoice> => {
  const response = await api.post(`/b/invoices/${id}/finance-approve`);
  return response.data.data;
};

export const financeRejectInvoice = async (id: string, reason: string): Promise<Invoice> => {
  const response = await api.post(`/b/invoices/${id}/finance-reject`, { reason });
  return response.data.data;
};

export const getInvoiceById = async (id: string): Promise<Invoice> => {
  const response = await api.get(`/b/invoices/${id}`);
  return response.data.data;
};
export const getInvoiceStats = async (): Promise<Record<string, number>> => {
  const response = await api.get('/b/invoices/stats');
  return response.data.data;
};

export const getPendingCounts = async (): Promise<Record<string, number>> => {
  const response = await api.get('/b/invoices/pending-counts');
  return response.data.data;
};
// Alerts & Collection
export interface CollectionAlert {
  contractId: string;
  customerId: string;
  customerName: string;
  customerPhone?: string; // Added for display
  invoiceNumber: string;
  type: 'USAGE_PENDING' | 'INVOICE_PENDING' | 'SEND_PENDING';
  saleType: string;
  dueDate: string;
}

export const getCollectionAlerts = async (): Promise<CollectionAlert[]> => {
  const response = await api.get('/b/invoices/alerts');
  return response.data.data;
};

export const recordUsage = async (payload: FormData): Promise<unknown> => {
  const response = await api.post('/b/usage', payload, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data.data;
};

export const generateMonthlyInvoice = async (payload: {
  contractId: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
}): Promise<Invoice> => {
  const response = await api.post('/b/invoices/settlements/generate', payload);
  // Returns Final Invoice
  return response.data.data;
};

export interface FinanceReportItem {
  month: string;
  income: number;
  expense: number;
  source: 'SALE' | 'LEASE' | 'RENT' | 'All';
  branchId: string;
  profit: number;
  profitStatus: 'profit' | 'loss';
}

export const getFinanceReport = async (filters: {
  branchId?: string;
  saleType?: string;
  month?: number;
  year?: number;
}): Promise<FinanceReportItem[]> => {
  const params = new URLSearchParams();
  if (filters.branchId && filters.branchId !== 'All') params.append('branchId', filters.branchId);
  if (filters.saleType && filters.saleType !== 'All') params.append('saleType', filters.saleType);
  if (filters.month) params.append('month', filters.month.toString());
  if (filters.year) params.append('year', filters.year.toString());

  const response = await api.get(`/b/invoices/finance/report?${params.toString()}`);
  return response.data.data;
};
export const updateInvoiceUsage = async (
  invoiceId: string,
  payload: {
    bwA4Count: number;
    bwA3Count: number;
    colorA4Count: number;
    colorA3Count: number;
  },
): Promise<unknown> => {
  const response = await api.put(`/b/invoices/${invoiceId}/usage`, payload);
  return response.data;
};
