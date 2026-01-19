import api from '@/lib/api';

export interface SparePartInventoryItem {
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
};
