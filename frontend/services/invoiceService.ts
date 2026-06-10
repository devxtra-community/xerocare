import api from '@/lib/api';

export const getInvoices = async () => {
  return api.get('/b/invoices');
};

export const getInvoicesByCustomerId = async (customerId: string) => {
  return api.get(`/b/invoices?customerId=${customerId}`);
};

export const getInvoiceById = async (id: string) => {
  return api.get(`/b/invoices/${id}`);
};
