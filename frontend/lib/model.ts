import api from './api';

export interface Model {
  id: string;
  model_no: string;
  model_name: string;
  brandRelation?: {
    id: string;
    name: string;
  };
  description: string;
  quantity: number; // Auto-managed by backend
  available: number;
  rented: number;
  leased: number;
  sold: number;
  product_name?: string;
  print_colour?: 'BLACK_WHITE' | 'COLOUR' | 'BOTH';
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
}

export interface CreateModelData {
  model_no: string;
  model_name: string;
  brand_id: string;
  description: string;
}

export interface UpdateModelData {
  model_no?: string;
  model_name?: string;
  brand_id?: string;
  description?: string;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

export const getAllModels = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<PaginatedResponse<Model>> => {
  const response = await api.get('/i/models', { params });
  const resData = response.data;
  const coreData = resData.data || resData;

  if (coreData && typeof coreData === 'object' && 'page' in coreData) {
    return coreData as PaginatedResponse<Model>;
  }

  const dataArray = Array.isArray(coreData) ? coreData : [];
  return {
    data: dataArray,
    page: 1,
    limit: dataArray.length || 10,
    total: dataArray.length,
  };
};

export const addModel = async (data: CreateModelData): Promise<Model> => {
  const response = await api.post<ApiResponse<Model>>('/i/models', data);
  if (!response.data.data) {
    throw new Error('Failed to create model');
  }
  return response.data.data;
};

export const updateModel = async (id: string, data: UpdateModelData): Promise<void> => {
  await api.put<ApiResponse<void>>(`/i/models/${id}`, data);
};

export const deleteModel = async (id: string): Promise<void> => {
  await api.delete<ApiResponse<void>>(`/i/models/${id}`);
};

export const syncQuantities = async (): Promise<void> => {
  await api.post<ApiResponse<void>>('/i/models/sync-quantities', {});
};
