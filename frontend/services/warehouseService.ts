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
  getWarehouses: async (): Promise<Warehouse[]> => {
    const response = await api.get('/i/warehouses');
    return response.data.data;
  },

  getWarehousesByBranch: async (): Promise<Warehouse[]> => {
    const response = await api.get('/i/warehouses/my-branch');
    return response.data.data;
  },
};
