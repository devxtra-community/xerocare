import api from './api';
import type { Model } from './model';

export interface SparePart {
  id: string;
  sku: string; // Matches backend entity
  mpn?: string;
  part_name: string;
  brand: string;
  brand_id?: string;
  description?: string;
  compatible_models?: string;
  model_ids?: string[] | string;
  model_id?: string;
  model?: Model; // Populated when joined (e.g. via lot items)
  branch_id?: string;
  base_price: number; // Decimal string or number
  purchase_price?: number;
  wholesale_price?: number;
  image_url?: string;
  created_at: string;
  updated_at: string;
  lotNumber?: string;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

export const getAllSpareParts = async (): Promise<SparePart[]> => {
  const response = await api.get<ApiResponse<SparePart[]>>('/i/spare-parts/');
  return response.data.data || [];
};

/**
 * Filters available spare parts by their associated model ID.
 */
export const getAvailableSparePartsByModel = async (modelId: string): Promise<SparePart[]> => {
  const all = await getAllSpareParts();
  return all.filter((p) => {
    // Exact model_id match
    if (p.model_id === modelId) return true;
    // Check compatible_models string
    if (p.compatible_models?.toLowerCase().includes(modelId.toLowerCase())) return true;
    // Check model_ids array
    if (Array.isArray(p.model_ids) && p.model_ids.includes(modelId)) return true;
    return false;
  });
};
