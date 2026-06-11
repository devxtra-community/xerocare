import api from './api';

export interface ServiceContract {
  id: string;
  productId: string;
  customerId: string;
  contractType: 'FSMA' | 'SMA' | 'AMC';
  startDate: string;
  endDate: string;
  contractValue: number;
  coverageRules: {
    labour: boolean;
    consumables: boolean;
    travel: boolean;
    [key: string]: boolean;
  };
  status: string;
  created_at?: string;
  updated_at?: string;
}

export const getServiceContracts = async (
  params?: Record<string, unknown>,
): Promise<ServiceContract[]> => {
  const response = await api.get('/i/service/contracts', { params });
  return response.data.data;
};

export const getServiceContractById = async (id: string): Promise<ServiceContract> => {
  const response = await api.get(`/i/service/contracts/${id}`);
  return response.data.data;
};

export const createServiceContract = async (
  data: Partial<ServiceContract>,
): Promise<ServiceContract> => {
  const response = await api.post('/i/service/contracts', data);
  return response.data.data;
};

export const updateServiceContract = async (
  id: string,
  data: Partial<ServiceContract>,
): Promise<ServiceContract> => {
  const response = await api.put(`/i/service/contracts/${id}`, data);
  return response.data.data;
};

export const deleteServiceContract = async (id: string): Promise<void> => {
  await api.delete(`/i/service/contracts/${id}`);
};
