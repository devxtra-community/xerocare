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
  rentType?: 'FIXED_LIMIT' | 'FIXED_COMBO' | 'CPC' | 'CPC_COMBO';
  rentPeriod?: 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY';
  monthlyRent?: number;
  advanceAmount?: number;
  discountPercent?: number;
  effectiveFrom?: string;
  effectiveTo?: string;
  createdAt: string;
  employeeName: string;
  branchName: string;
  customerName: string;
  items?: InvoiceItem[];
  startDate?: string;
  endDate?: string;
  billingCycleInDays?: number;
  securityDepositAmount?: number;
  securityDepositMode?: 'CASH' | 'CHEQUE';
  securityDepositReference?: string;
  securityDepositReceivedDate?: string;
}

export interface CreateInvoicePayload {
  customerId: string;
  saleType: 'SALE' | 'RENT' | 'LEASE';

  // Rent Fields
  rentType?: 'FIXED_LIMIT' | 'FIXED_COMBO' | 'CPC' | 'CPC_COMBO';
  rentPeriod?: 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY';
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

export const getInvoiceById = async (id: string): Promise<Invoice> => {
  const response = await api.get(`/b/invoices/${id}`);
  return response.data.data;
};
export const getInvoiceStats = async (): Promise<Record<string, number>> => {
  const response = await api.get('/b/invoices/stats');
  return response.data.data;
};
