import api from './api';

export interface InvoiceItem {
  id?: string;
  productId: string;
  productName?: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  branchId: string;
  createdBy: string;
  totalAmount: number;
  status: string;
  saleType: string;
  createdAt: string;
  employeeName: string;
  branchName: string;
  items?: InvoiceItem[];
  startDate?: string;
  endDate?: string;
  billingCycleInDays?: number;
}

export interface CreateInvoicePayload {
  saleType: 'SALE' | 'RENT' | 'LEASE';
  items: {
    productId: string;
    description: string;
    quantity: number;
    unitPrice: number;
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

export const getInvoiceById = async (id: string): Promise<Invoice> => {
  const response = await api.get(`/b/invoices/${id}`);
  return response.data.data;
};
export const getInvoiceStats = async (): Promise<Record<string, number>> => {
  const response = await api.get('/b/invoices/stats');
  return response.data.data;
};
