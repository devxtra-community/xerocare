import api from './api';
import type { Model } from './model';

export interface SparePart {
  id: string;
  sku: string;
  mpn?: string;
  part_name: string;
  brand: string;
  brand_id?: string;
  description?: string;
  yield?: string;
  compatible_models?: string;
  compatible_model?: string;
  model_ids?: string[] | string;
  model_id?: string;
  model?: Model;
  models?: Model[];
  branch_id?: string;
  branch?: { id: string; name: string };
  lot_id?: string;
  lot?: { id: string; lotNumber?: string; lot_number?: string };
  warehouse_id?: string;
  warehouse?: { id: string; warehouseName?: string };
  vendor_id?: string;
  vendor?: { id: string; name?: string };
  base_price: number;
  purchase_price?: number;
  wholesale_price?: number;
  tax_rate?: number;
  max_discount_amount?: number;
  maxDiscountableAmount?: number;
  quantity?: number;
  reserved_quantity?: number;
  consumed_quantity?: number;
  damaged_quantity?: number;
  barcode_id?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
  lotNumber?: string;
}

export interface SparePartStock {
  totalStock: number;
  warehouses: { id: string; name: string; quantity: number }[];
}

export const getSparePartStock = async (id: string): Promise<SparePartStock> => {
  const response = await api.get<{ success: boolean; data: SparePartStock }>(
    `/i/spareparts/${id}/stock`,
  );
  return response.data.data;
};

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

export const getAllSpareParts = async (params?: {
  limit?: number;
  page?: number;
}): Promise<SparePart[]> => {
  const response = await api.get<ApiResponse<SparePart[]>>('/i/spare-parts/', { params });
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

/**
 * Retrieves a single spare part by its ID.
 */
export const getSparePartById = async (id: string): Promise<SparePart> => {
  const response = await api.get<ApiResponse<SparePart>>(`/i/spare-parts/${id}`);
  if (!response.data.data) {
    throw new Error('Spare part not found');
  }
  return response.data.data;
};
