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
  modelId?: string; // Added for finance flow
  initialBwCount?: number;
  initialBwA3Count?: number;
  initialColorCount?: number;
  initialColorA3Count?: number;
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
  securityDepositMode?: 'CASH' | 'CHEQUE' | 'UPI' | 'BANK_TRANSFER';
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
  displayAmount?: number; // Backend aggregated lifetime total
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
  // Extended pricing details for UI breakdown
  rentType?: string;
  bwFreeLimit?: number;
  colorFreeLimit?: number;
  combinedFreeLimit?: number;
  bwExcessRate?: number;
  colorExcessRate?: number;
  combinedExcessRate?: number;
}

/**
 * Sends a monthly usage invoice for a specific usage record.
 * @param usageId The ID of the usage record to send
 */
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

/**
 * Retrieves all invoices in the system.
 * @returns Array of Invoice objects
 */
export const getInvoices = async (): Promise<Invoice[]> => {
  const response = await api.get('/b/invoices');
  return response.data.data;
};

/**
 * Retrieves invoices created by or assigned to the current user.
 */
export const getMyInvoices = async (): Promise<Invoice[]> => {
  const response = await api.get('/b/invoices/my-invoices');
  return response.data.data;
};

/**
 * Retrieves all invoices for the current branch.
 */
export const getBranchInvoices = async (): Promise<Invoice[]> => {
  const response = await api.get('/b/invoices/branch-invoices');
  return response.data.data;
};

/**
 * Creates a new invoice, quotation, or contract record.
 * @param payload Creation data including customer, items, and sale type
 */
export const createInvoice = async (payload: CreateInvoicePayload): Promise<Invoice> => {
  const response = await api.post('/b/invoices', payload);
  return response.data.data;
};

/**
 * Updates an existing quotation or invoice.
 * @param id The ID of the record to update
 * @param payload Partial update data
 */
export const updateQuotation = async (
  id: string,
  payload: Partial<CreateInvoicePayload>,
): Promise<Invoice> => {
  const response = await api.put(`/b/invoices/${id}`, payload);
  return response.data.data;
};

/**
 * Approves a quotation and handles security deposit recording.
 * @param invoiceId The ID of the quotation to approve
 * @param deposit Optional deposit information
 */
export const approveQuotation = async (
  invoiceId: string,
  deposit?: {
    amount: number;
    mode: 'CASH' | 'CHEQUE' | 'UPI' | 'BANK_TRANSFER';
    reference?: string;
    receivedDate?: string;
  },
): Promise<Invoice> => {
  const response = await api.put(`/b/invoices/${invoiceId}/approve`, { deposit });
  return response.data.data;
};

/**
 * Marks an invoice as approved by the employee.
 */
export const employeeApproveInvoice = async (id: string): Promise<Invoice> => {
  const response = await api.post(`/b/invoices/${id}/employee-approve`);
  return response.data.data;
};

/**
 * Performs final finance approval for an invoice, including initial meter readings.
 * @param id The ID of the invoice
 * @param payload Approval data including deposit and item updates
 */
export const financeApproveInvoice = async (
  id: string,
  payload: {
    deposit?: {
      amount: number;
      mode: 'CASH' | 'CHEQUE' | 'UPI' | 'BANK_TRANSFER';
      reference?: string;
      receivedDate?: string;
    };
    itemUpdates?: {
      id: string;
      productId: string;
      initialBwCount?: number;
      initialBwA3Count?: number;
      initialColorCount?: number;
      initialColorA3Count?: number;
    }[];
  },
): Promise<Invoice> => {
  const response = await api.post(`/b/invoices/${id}/finance-approve`, payload);
  return response.data.data;
};

/**
 * Rejects an invoice from a finance perspective with a provided reason.
 * @param id The ID of the invoice
 * @param reason The reason for rejection
 */
export const financeRejectInvoice = async (id: string, reason: string): Promise<Invoice> => {
  const response = await api.post(`/b/invoices/${id}/finance-reject`, { reason });
  return response.data.data;
};

/**
 * Retrieves a single invoice by its ID.
 */
export const getInvoiceById = async (id: string): Promise<Invoice> => {
  const response = await api.get(`/b/invoices/${id}`);
  return response.data.data;
};
/**
 * Retrieves aggregate statistics for invoices (counts by status/type).
 */
export const getInvoiceStats = async (): Promise<Record<string, number>> => {
  const response = await api.get('/b/invoices/stats');
  return response.data.data;
};

/**
 * Retrieves counts of invoices pending approval or action.
 */
export const getPendingCounts = async (): Promise<Record<string, number>> => {
  const response = await api.get('/b/invoices/pending-counts');
  return response.data.data;
};

/**
 * Retrieves total sales figures for the user's branch.
 */
export const getBranchSalesTotals = async (
  year?: number,
): Promise<{
  totalSales: number;
  salesByType: { saleType: string; total: number }[];
  totalInvoices: number;
}> => {
  const url = year
    ? `/b/invoices/sales/branch-totals?year=${year}`
    : '/b/invoices/sales/branch-totals';
  const response = await api.get(url);
  return response.data.data;
};

/**
 * Retrieves comprehensive finance stats (Revenue, Expenses, Profit).
 */
export const getBranchFinanceStats = async (
  year?: number,
): Promise<{
  totalRevenue: number;
  totalExpenses: number;
  purchaseExpenses: number;
  totalSalaries: number;
  netProfit: number;
  salesByType: { saleType: string; total: number }[];
}> => {
  const url = year
    ? `/b/invoices/sales/branch-finance-stats?year=${year}`
    : '/b/invoices/sales/branch-finance-stats';
  const response = await api.get(url);
  return response.data.data;
};

/**
 * Retrieves global sales totals across all branches.
 */
export const getGlobalSalesTotals = async (
  year?: number,
): Promise<{
  totalSales: number;
  salesByType: { saleType: string; total: number }[];
  totalInvoices: number;
}> => {
  const url = year
    ? `/b/invoices/sales/global-totals?year=${year}`
    : '/b/invoices/sales/global-totals';
  const response = await api.get(url);
  return response.data.data;
};

/**
 * Retrieves a historical overview of global sales for charting.
 * @param period The time period to look back (e.g., '1M', '1Y')
 */
export const getGlobalSalesOverview = async (
  period: string = '1M',
  year?: number,
): Promise<{ date: string; saleType: string; totalSales: number }[]> => {
  const url = year
    ? `/b/invoices/sales/global-overview?period=${period}&year=${year}`
    : `/b/invoices/sales/global-overview?period=${period}`;
  const response = await api.get(url);
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
  totalAmount?: number;
  status: string;
  securityDepositAmount?: number;
  securityDepositMode?: string;
  securityDepositDate?: string;
  securityDepositBank?: string;
  securityDepositReference?: string;
  advanceAmount?: number;
  customerEmail?: string;
}

/**
 * Retrieves collection-related alerts (pending usage, invoicing, etc.).
 * @param date Optional date to filter alerts for
 */
export const getCollectionAlerts = async (date?: string): Promise<CollectionAlert[]> => {
  const url = date ? `/b/invoices/alerts?date=${date}` : '/b/invoices/alerts';
  const response = await api.get(url);
  return response.data.data;
};

/**
 * Records meter usage for a contract.
 * @param payload FormData containing meter readings and images
 */
export const recordUsage = async (payload: FormData): Promise<unknown> => {
  const response = await api.post('/b/usage', payload, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data.data;
};

/**
 * Retrieves the history of usage records for a specific contract.
 */
export const getUsageHistory = async (contractId: string): Promise<UsageRecord[]> => {
  const response = await api.get(`/b/usage/contract/${contractId}`);
  return response.data.data;
};

/**
 * Retrieves a list of contracts where all collections are completed.
 */
export const getCompletedCollections = async (): Promise<CompletedCollection[]> => {
  const response = await api.get('/b/invoices/completed-collections');
  return response.data.data;
};

/**
 * Generates a final monthly invoice based on recorded usage.
 * @param payload Contract and billing period details
 */
export const generateMonthlyInvoice = async (payload: {
  contractId: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
}): Promise<Invoice> => {
  const response = await api.post('/b/invoices/settlements/generate', payload);
  // Returns Final Invoice
  return response.data.data;
};

/**
 * Triggers the creation of the invoice for the subsequent billing month.
 */
export const createNextMonthInvoice = async (contractId: string): Promise<Invoice> => {
  const response = await api.post('/b/invoices/settlements/next-month', { contractId });
  return response.data.data;
};

/**
 * Generates a consolidated statement and final final invoice for a completed contract.
 */
export const generateConsolidatedFinalInvoice = async (contractId: string): Promise<Invoice> => {
  const response = await api.post('/b/invoices/settlements/consolidate', { contractId });
  return response.data.data;
};

export interface FinanceReportItem {
  month: string;
  income: number;
  expense: number;
  purchaseExpense?: number;
  salaryExpense?: number;
  source: 'SALE' | 'LEASE' | 'RENT' | 'All';
  branchId: string;
  profit: number;
  profitStatus: 'profit' | 'loss';
  count: number;
}

/**
 * Retrieves a detailed financial report with income, expenses, and profit.
 * @param filters Optional filters for branch, sale type, month, and year
 */
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

/**
 * Updates an actual usage record.
 * @param usageId The ID of the usage record to update
 * @param payload Updated usage and charge details
 */
export const updateUsageRecord = async (
  usageId: string,
  payload: {
    bwA4Count: number;
    bwA3Count: number;
    colorA4Count: number;
    colorA3Count: number;
    billingPeriodEnd?: string;
  },
): Promise<unknown> => {
  const response = await api.put(`/b/usage/${usageId}`, payload);
  return response.data;
};

export interface AdminSalesStats {
  totalRevenue: number;
  totalOrders: number;
  productsSold: number;
  topProduct: string;
  monthlySales: { month: string; sales: number }[];
  soldProductsByQty: { product: string; qty: number }[];
}

/**
 * Retrieves sales statistics specifically for the admin dashboard.
 */
export const getAdminSalesStats = async (year?: number): Promise<AdminSalesStats> => {
  const url = year ? `/b/invoices/sales/admin-stats?year=${year}` : '/b/invoices/sales/admin-stats';
  const response = await api.get(url);
  return response.data.data;
};

/**
 * Retrieves a history of invoices, optionally filtered by sale type.
 */
export const getInvoiceHistory = async (saleType?: string): Promise<Invoice[]> => {
  const url = saleType ? `/b/invoices/history?saleType=${saleType}` : '/b/invoices/history';
  const response = await api.get(url);
  return response.data.data;
};

/**
 * Downloads a consolidated statement in binary format (e.g., PDF).
 */
export const downloadConsolidatedInvoice = async (contractId: string): Promise<Blob> => {
  const response = await api.get(`/b/invoices/completed-collections/${contractId}/download`, {
    responseType: 'blob',
  });
  return response.data;
};

/**
 * Sends a consolidated statement to the customer.
 */
export const sendConsolidatedInvoice = async (contractId: string): Promise<unknown> => {
  const response = await api.post(`/b/invoices/completed-collections/${contractId}/send`);
  return response.data;
};

/**
 * Sends an email notification related to a specific invoice.
 */
export const sendEmailNotification = async (
  id: string,
  payload: { recipient: string; subject: string; body: string },
): Promise<unknown> => {
  const response = await api.post(`/b/invoices/${id}/notify/email`, payload);
  return response.data;
};

/**
 * Sends a WhatsApp notification related to a specific invoice.
 */
export const sendWhatsappNotification = async (
  id: string,
  payload: { recipient: string; body: string },
): Promise<unknown> => {
  const response = await api.post(`/b/invoices/${id}/notify/whatsapp`, payload);
  return response.data;
};

/**
 * Retrieves available years for filtering reports.
 */
export const getAvailableYears = async (): Promise<number[]> => {
  const response = await api.get('/b/invoices/stats/available-years');
  return response.data.data;
};
