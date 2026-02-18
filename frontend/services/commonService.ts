import api from '@/lib/api';

// Simplified interfaces for dropdowns
export interface Vendor {
  id: number;
  name: string;
}

export interface Warehouse {
  id: string;
  warehouseName: string; // Updated from warehouse_name
}

export const commonService = {
  /**
   * Retrieves all vendors for dropdowns.
   */
  getAllVendors: async (): Promise<Vendor[]> => {
    // Assuming this endpoint exists based on backend analysis
    const response = await api.get('/i/vendors');
    return response.data.data;
  },

  /**
   * Retrieves all warehouses for dropdowns.
   */
  getAllWarehouses: async (): Promise<Warehouse[]> => {
    // Assuming this endpoint exists based on backend analysis
    const response = await api.get('/i/warehouses');
    return response.data.data;
  },

  /**
   * Retrieves warehouses associated with the current user's branch.
   */
  getWarehousesByBranch: async (): Promise<Warehouse[]> => {
    const response = await api.get('/i/warehouses/my-branch');
    return response.data.data;
  },
};
