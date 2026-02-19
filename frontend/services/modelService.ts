import api from '@/lib/api';

export interface Model {
  id: string;
  model_no: string;
  model_name: string;
  brandRelation?: { id: string; name: string };
  brand?: { id: string; name: string }; // Fallback
  brand_id?: string; // Direct ID
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
  /**
   * Retrieves all models.
   */
  getAllModels: async (): Promise<Model[]> => {
    const response = await api.get('/i/models');
    return response.data.data;
  },

  /**
   * Creates a new model.
   */
  createModel: async (data: CreateModelDTO): Promise<Model> => {
    const response = await api.post('/i/models', data);
    return response.data.data;
  },

  /**
   * Updates an existing model.
   */
  updateModel: async (id: string, data: Partial<CreateModelDTO>): Promise<void> => {
    await api.put(`/i/models/${id}`, data);
  },

  /**
   * Deletes a model.
   */
  deleteModel: async (id: string): Promise<void> => {
    await api.delete(`/i/models/${id}`);
  },
};
