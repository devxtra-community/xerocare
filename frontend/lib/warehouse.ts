import api from './api';

export interface Warehouse {
  id: string;
  warehouseName: string;
  warehouseCode: string;
  location: string;
  address: string;
  capacity: string;
  status: 'ACTIVE' | 'INACTIVE' | 'DELETED';
  branchId?: string;
  branch?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export const createWarehouse = async (data: Partial<Warehouse>) => {
  const res = await api.post('/i/warehouses', data);
  return res.data;
};

export const getWarehouses = async () => {
  const res = await api.get('/i/warehouses');
  return res.data;
};

export const getWarehouseById = async (id: string) => {
  const res = await api.get(`/i/warehouses/${id}`);
  return res.data;
};

export const updateWarehouse = async (id: string, data: Partial<Warehouse>) => {
  const res = await api.put(`/i/warehouses/${id}`, data);
  return res.data;
};

export const deleteWarehouse = async (id: string) => {
  const res = await api.delete(`/i/warehouses/${id}`);
  return res.data;
};
