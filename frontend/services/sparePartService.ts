import api from '@/lib/api';

export interface SparePartInventoryItem {
  id: string; // Added ID
  item_code: string;
  part_name: string;
  brand: string;
  compatible_model: string;
  warehouse_name: string;
  vendor_name: string;
  quantity: number;
  status: string;
  price: number;
}

export const sparePartService = {
  getSpareParts: async (): Promise<SparePartInventoryItem[]> => {
    const response = await api.get('/i/spare-parts');
    return response.data.data;
  },

  bulkUpload: async (rows: Record<string, unknown>[]) => {
    const response = await api.post('/i/spare-parts/bulk', { rows });
    return response.data;
  },
  addSparePart: async (data: Record<string, unknown>) => {
    const response = await api.post('/i/spare-parts/add', data);
    return response.data;
  },
  updateSparePart: async (id: string, data: Record<string, unknown>) => {
    const response = await api.put(`/i/spare-parts/${id}`, data);
    return response.data;
  },
  deleteSparePart: async (id: string) => {
    const response = await api.delete(`/i/spare-parts/${id}`);
    return response.data;
  },
};
