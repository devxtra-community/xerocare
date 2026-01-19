import api from '@/lib/api';

// Simplified interfaces for dropdowns
export interface Vendor {
  id: number;
  name: string;
}

export interface Warehouse {
  id: string;
  warehouse_name: string;
}

export const commonService = {
  getAllVendors: async (): Promise<Vendor[]> => {
    // Assuming this endpoint exists based on backend analysis
    const response = await api.get('/i/vendors');
    return response.data.data;
  },

  getAllWarehouses: async (): Promise<Warehouse[]> => {
    // Assuming this endpoint exists based on backend analysis
    const response = await api.get('/i/warehouses');
    return response.data.data;
  },
};
