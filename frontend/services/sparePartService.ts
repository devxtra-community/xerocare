import api from '@/lib/api';

export interface SparePartInventoryItem {
  id: string; // Added ID
  lot_number: string;
  part_name: string;
  brand: string;
  compatible_model: string;
  warehouse_name: string;
  vendor_name: string;
  quantity: number;
  status: string;
  price: number;
  image_url?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
}

export const sparePartService = {
  /**
   * Retrieves all spare parts with optional pagination/search.
   */
  getSpareParts: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedResponse<SparePartInventoryItem>> => {
    const response = await api.get('/i/spare-parts', { params });
    const resData = response.data;
    const coreData = resData.data || resData;

    // Support new paginated backend
    if (coreData && coreData.page !== undefined) {
      return coreData as PaginatedResponse<SparePartInventoryItem>;
    }

    // Fallback if backend still returns array
    const dataArray = Array.isArray(coreData) ? coreData : [];
    return {
      data: dataArray,
      page: 1,
      limit: 10,
      total: dataArray.length,
    };
  },

  /**
   * Bulk uploads spare parts.
   */
  bulkUpload: async (rows: Record<string, unknown>[]) => {
    const response = await api.post('/i/spare-parts/bulk', { rows });
    return response.data;
  },
  /**
   * Adds a new spare part.
   */
  addSparePart: async (data: Record<string, unknown>) => {
    const response = await api.post('/i/spare-parts/add', data);
    return response.data;
  },
  /**
   * Updates a spare part.
   */
  updateSparePart: async (id: string, data: Record<string, unknown>) => {
    const response = await api.put(`/i/spare-parts/${id}`, data);
    return response.data;
  },
  /**
   * Deletes a spare part.
   */
  deleteSparePart: async (id: string) => {
    const response = await api.delete(`/i/spare-parts/${id}`);
    return response.data;
  },
};
