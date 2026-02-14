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
  productId?: string;
  initialBwCount?: number;
  initialColorCount?: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  branchId: string;
  customerId: string;
  createdBy: string;
  totalAmount: number;
  status: string;
  contractStatus?: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  type?: 'QUOTATION' | 'PROFORMA' | 'FINAL';
  saleType: string;
  rentType?: 'FIXED_LIMIT' | 'FIXED_COMBO' | 'FIXED_FLAT' | 'CPC' | 'CPC_COMBO';
  rentPeriod?: 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY' | 'CUSTOM';

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
  extraBwA4Count?: number;
  extraColorA4Count?: number;
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
  additionalCharges?: number;
  additionalChargesRemarks?: string;
  referenceContractId?: string; // Link to PROFORMA contract
  advanceAdjusted?: number;
  grossAmount?: number;
  invoiceHistory?: Invoice[];
}

export interface UsageRecord {
  id: string;
  periodStart: string;
  periodEnd: string;
  freeLimit: number | string;
  totalUsage: number;
  exceededCount: number;
  rate: number;
  exceededAmount: number;
  rent: number;
  finalTotal: number;
  meterImageUrl?: string;
  emailSentAt?: string;
  whatsappSentAt?: string;
  bwA4Count: number;
  bwA3Count: number;
  colorA4Count: number;
  bwA4Delta: number;
  bwA3Delta: number;
  colorA4Delta: number;
  colorA3Delta: number;
  colorA3Count: number;
  remarks?: string;
  advanceAdjusted?: number;
}

export const sendMonthlyUsageInvoice = async (usageId: string): Promise<unknown> => {
  const response = await api.post(`/b/usage/${usageId}/send-invoice`);
  return response.data.data;
};

export interface CreateInvoicePayload {
  customerId: string;
  saleType: 'SALE' | 'RENT' | 'LEASE';

  // Rent Fields
  rentType?: 'FIXED_LIMIT' | 'FIXED_COMBO' | 'FIXED_FLAT' | 'CPC' | 'CPC_COMBO';
  rentPeriod?: 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY' | 'CUSTOM';

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

export const financeApproveInvoice = async (
  id: string,
  payload: {
    deposit?: {
      amount: number;
      mode: 'CASH' | 'CHEQUE';
      reference?: string;
      receivedDate?: string;
    };
    itemUpdates?: {
      id: string;
      productId: string;
      initialBwCount?: number;
      initialColorCount?: number;
    }[];
  },
): Promise<Invoice> => {
  const response = await api.post(`/b/invoices/${id}/finance-approve`, payload);
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
  type: 'USAGE_PENDING' | 'INVOICE_PENDING' | 'SEND_PENDING' | 'SUMMARY_PENDING';
  saleType: string;
  dueDate: string;
  finalInvoiceId?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  monthlyRent?: number;
  totalAmount?: number;
  usageData?: {
    bwA4Count: number;
    bwA3Count: number;
    colorA4Count: number;
    colorA3Count: number;
    billingPeriodStart: string;
    billingPeriodEnd: string;
  };
  recordedMonths?: number;
  tenure?: number;
  contractStatus?: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
}

export interface CompletedCollection {
  contractId: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  invoiceNumber: string;
  saleType: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  completedAt?: string;
  finalInvoiceId?: string;
  finalInvoiceNumber?: string;
  totalCollected: number; // Total amount collected from all usage records
  finalAmount: number;
  grossAmount: number;
  advanceAdjusted: number;
  status: string;
}

export const getCollectionAlerts = async (date?: string): Promise<CollectionAlert[]> => {
  const url = date ? `/b/invoices/alerts?date=${date}` : '/b/invoices/alerts';
  const response = await api.get(url);
  return response.data.data;
};

export const recordUsage = async (payload: FormData): Promise<unknown> => {
  const response = await api.post('/b/usage', payload, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data.data;
};

export const getUsageHistory = async (contractId: string): Promise<UsageRecord[]> => {
  const response = await api.get(`/b/usage/contract/${contractId}`);
  return response.data.data;
};

export const getCompletedCollections = async (): Promise<CompletedCollection[]> => {
  const response = await api.get('/b/invoices/completed-collections');
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

export const createNextMonthInvoice = async (contractId: string): Promise<Invoice> => {
  const response = await api.post('/b/invoices/settlements/next-month', { contractId });
  return response.data.data;
};

export const generateConsolidatedFinalInvoice = async (contractId: string): Promise<Invoice> => {
  const response = await api.post('/b/invoices/settlements/consolidate', { contractId });
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
    extraBwA4Count?: number;
    extraColorA4Count?: number;
    monthlyRent?: number;
    additionalCharges?: number;
    additionalChargesRemarks?: string;
    billingPeriodStart?: string;
    billingPeriodEnd?: string;
  },
): Promise<unknown> => {
  const response = await api.put(`/b/invoices/${invoiceId}/usage`, payload);
  return response.data;
};

export const getInvoiceHistory = async (saleType?: string): Promise<Invoice[]> => {
  const url = saleType ? `/b/invoices/history?saleType=${saleType}` : '/b/invoices/history';
  const response = await api.get(url);
  return response.data.data;
};

export const downloadConsolidatedInvoice = async (contractId: string): Promise<Blob> => {
  const response = await api.get(`/b/invoices/completed-collections/${contractId}/download`, {
    responseType: 'blob',
  });
  return response.data;
};

export const sendConsolidatedInvoice = async (contractId: string): Promise<unknown> => {
  const response = await api.post(`/b/invoices/completed-collections/${contractId}/send`);
  return response.data;
};
