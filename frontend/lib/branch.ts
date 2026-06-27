import api from './api';

export interface Branch {
  id: string;
  branch_id?: string;
  name: string;
  address: string;
  location: string;
  manager_id?: string | null;
  started_date: string;
  status: 'ACTIVE' | 'INACTIVE' | 'DELETED';
  created_at: string;
  updated_at: string;
  // Currency & Country
  country_code?: string;
  currency_code?: string;
  currency_symbol?: string;
  currency_name?: string;
  // Tax
  has_tax?: boolean;
  tax_name?: string | null;
  tax_percent?: number | null;
  tax_registration_number?: string | null;
  // Address details
  city?: string;
  state?: string;
  postal_code?: string;
}

export interface CreateBranchPayload {
  name: string;
  address: string;
  location: string;
  manager_id?: string | null;
  started_date: string;
  // Currency & Country
  country_code?: string;
  currency_code?: string;
  currency_symbol?: string;
  currency_name?: string;
  // Tax
  has_tax?: boolean;
  tax_name?: string | null;
  tax_percent?: number | null;
  tax_registration_number?: string | null;
  // Address details
  city?: string;
  state?: string;
  postal_code?: string;
}

export interface UpdateBranchPayload {
  name?: string;
  address?: string;
  location?: string;
  manager_id?: string | null;
  started_date?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  // Currency & Country
  country_code?: string;
  currency_code?: string;
  currency_symbol?: string;
  currency_name?: string;
  // Tax
  has_tax?: boolean;
  tax_name?: string | null;
  tax_percent?: number | null;
  tax_registration_number?: string | null;
  // Address details
  city?: string;
  state?: string;
  postal_code?: string;
}

export async function createBranch(data: CreateBranchPayload) {
  const res = await api.post('/i/branch/', data);
  return res.data;
}

export async function getBranches() {
  const res = await api.get('/i/branch/');
  return res.data;
}

export async function updateBranch(id: string, data: UpdateBranchPayload) {
  const res = await api.put(`/i/branch/${id}`, data);
  return res.data;
}

export async function deleteBranch(id: string) {
  const res = await api.delete(`/i/branch/${id}`);
  return res.data;
}
