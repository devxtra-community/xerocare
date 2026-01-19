import api from './api';

export interface Branch {
  id: string;
  branch_id?: string;
  name: string;
  address: string;
  location: string;
  manager_id: string;
  started_date: string;
  status: 'ACTIVE' | 'INACTIVE' | 'DELETED';
  created_at: string;
  updated_at: string;
}

export interface CreateBranchPayload {
  name: string;
  address: string;
  location: string;
  manager_id: string;
  started_date: string;
}

export interface UpdateBranchPayload {
  name?: string;
  address?: string;
  location?: string;
  manager_id?: string;
  started_date?: string;
  status?: 'ACTIVE' | 'INACTIVE';
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
