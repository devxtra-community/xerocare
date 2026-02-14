import api from './api';

export interface Vendor {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'DELETED';
  createdAt: string;
  updatedAt: string;
  type?: 'Supplier' | 'Distributor' | 'Service';
  contactPerson?: string;
  totalOrders?: number;
  purchaseValue?: number;
  outstandingAmount?: number;
  gstin?: string;
  creditLimit?: number;
  bankDetails?: {
    accountName: string;
    accountNumber: string;
    ifsc: string;
    bankName: string;
  };
}

export async function createVendor(data: Partial<Vendor>) {
  const res = await api.post('/i/vendors/', data);
  return res.data;
}

export async function getVendors() {
  const res = await api.get('/i/vendors/');
  return res.data;
}

export async function getVendorById(id: string) {
  const res = await api.get(`/i/vendors/${id}`);
  return res.data;
}

export async function updateVendor(id: string, data: Partial<Vendor>) {
  const res = await api.patch(`/i/vendors/${id}`, data);
  return res.data;
}

export async function deleteVendor(id: string) {
  const res = await api.delete(`/i/vendors/${id}`);
  return res.data;
}

export interface VendorRequest {
  id: string;
  vendor_id: string;
  requested_by: string;
  branch_id?: string;
  products: string;
  message?: string;
  total_amount?: number;
  created_at: string;
  branch?: {
    name: string;
  };
  manager?: {
    name: string;
    email: string;
  };
}

export async function requestProducts(
  id: string,
  data: { products: string; message: string; total_amount?: number },
) {
  const res = await api.post(`/i/vendors/${id}/request-products`, data);
  return res.data;
}

export async function getVendorRequests(id: string) {
  const res = await api.get(`/i/vendors/${id}/requests`);
  return res.data;
}
