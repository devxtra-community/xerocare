import api from '@/lib/api';

export interface Model {
  id: string;
  model_no: string;
  model_name: string;
  brandRelation?: { id: string; name: string };
  description: string;
  quantity: number;
}

export interface CreateModelDTO {
  model_no: string;
  model_name: string;
  brand_id: string;
  description: string;
}

export const modelService = {
  getAllModels: async (): Promise<Model[]> => {
    const response = await api.get('/i/models');
    return response.data.data;
  },

  createModel: async (data: CreateModelDTO): Promise<Model> => {
    const response = await api.post('/i/models', data);
    return response.data.data;
  },

  updateModel: async (id: string, data: Partial<CreateModelDTO>): Promise<void> => {
    await api.put(`/i/models/${id}`, data);
  },

  deleteModel: async (id: string): Promise<void> => {
    await api.delete(`/i/models/${id}`);
  },
};
