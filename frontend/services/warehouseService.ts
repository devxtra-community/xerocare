import api from '@/lib/api';

export interface Warehouse {
  id: string;
  warehouseName: string;
  warehouseCode: string;
  location: string;
  status: 'ACTIVE' | 'INACTIVE' | 'DELETED';
  branchId?: string;
  capacity?: string;
}

export const warehouseService = {
  /**
   * Retrieves all warehouses.
   */
  getWarehouses: async (): Promise<Warehouse[]> => {
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
