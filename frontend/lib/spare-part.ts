import api from './api';
import type { Model } from './model';

export interface SparePart {
  id: string;
  item_code: string; // Matches backend entity
  part_name: string;
  brand: string;
  description?: string;
  model_id?: string;
  model?: Model; // Populated when joined (e.g. via lot items)
  branch_id?: string;
  base_price: number; // Decimal string or number
  image_url?: string;
  created_at: string;
  updated_at: string;
  lot_number?: string;
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
