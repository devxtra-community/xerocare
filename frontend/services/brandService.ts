import api from '@/lib/api';

export interface Brand {
  id: string;
  name: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
}

export const brandService = {
  /**
   * Retrieves all brands.
   */
  getAllBrands: async (): Promise<Brand[]> => {
    const response = await api.get('/i/brands');
    return response.data.data;
  },

  /**
   * Creates a new brand.
   */
  createBrand: async (data: { name: string; description?: string }): Promise<Brand> => {
    const response = await api.post('/i/brands', data);
    return response.data.data;
  },

  /**
   * Updates an existing brand.
   */
  updateBrand: async (id: string, data: Partial<Brand>): Promise<void> => {
    await api.patch(`/i/brands/${id}`, data);
  },

  /**
   * Deletes a brand.
   */
  deleteBrand: async (id: string): Promise<void> => {
    await api.delete(`/i/brands/${id}`);
  },
};
