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

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
}

export const modelService = {
  /**
   * Retrieves all models.
   */
  getAllModels: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedResponse<Model>> => {
    const response = await api.get('/i/models', { params });
    const resData = response.data;
    const coreData = resData.data || resData;

    if (coreData && coreData.page !== undefined) {
      return coreData as PaginatedResponse<Model>;
    }

    const dataArray = Array.isArray(coreData) ? coreData : [];
    return {
      data: dataArray,
      page: 1,
      limit: 10,
      total: dataArray.length,
    };
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
