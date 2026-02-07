import api from './api';

export interface SparePart {
  id: string;
  lot_number: string; // Replaces item_code
  part_name: string;
  brand: string;
  description?: string;
  model_id?: string;
  branch_id?: string;
  base_price: number; // Decimal string or number
  image_url?: string;
  created_at: string;
  updated_at: string;
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
