import api from '@/lib/api';

export interface Brand {
  id: string;
  name: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
}

export async function getBrands() {
  const res = await api.get('/i/brands');
  return res.data;
}

export async function createBrand(data: { name: string; description?: string }) {
  const res = await api.post('/i/brands', data);
  return res.data;
}

export async function updateBrand(id: string, data: Partial<Brand>) {
  const res = await api.patch(`/i/brands/${id}`, data);
  return res.data;
}

export async function deleteBrand(id: string) {
  const res = await api.delete(`/i/brands/${id}`);
  return res.data;
}
