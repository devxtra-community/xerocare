import api from './api';
import { Model } from './model';

export enum ProductStatus {
  AVAILABLE = 'AVAILABLE',
  RENTED = 'RENTED',
  SOLD = 'SOLD',
  DAMAGED = 'DAMAGED',
  LEASE = 'LEASE',
}

export interface Product {
  id: string;
  model: Model; // Controller returns nested model data if TypeORM loads it, need to verify or make optional. Usually it's an object.
  vendor_id: string;
  serial_no: string;
  name: string;
  brand: string;
  MFD: string; // Date comes as string from JSON
  rent_price_monthly: number;
  rent_price_yearly: number;
  lease_price_monthly: number;
  lease_price_yearly: number;
  sale_price: number;
  tax_rate: number;
  product_status: ProductStatus;
  print_colour?: 'BLACK_WHITE' | 'COLOUR' | 'BOTH';
  max_discount_amount?: number;
  imageUrl?: string;
  created_at: string;
  inventory?: {
    id: string;
    warehouseId: string;
    quantity: number;
    unitPrice: number;
    sku: string | null;
    description: string | null;
    createdAt: string;
    updatedAt: string;
  }[];
}

export interface CreateProductData {
  model_id: string; // Sending ID to link model
  warehouse_id: string;
  vendor_id: string;
  serial_no: string;
  name: string;
  brand: string;
  MFD: Date | string;
  rent_price_monthly: number;
  rent_price_yearly: number;
  lease_price_monthly: number;
  lease_price_yearly: number;
  sale_price: number;
  tax_rate: number;
  product_status?: ProductStatus;
}

export interface UpdateProductData {
  model_id?: string;
  vendor_id?: string;
  serial_no?: string;
  name?: string;
  brand?: string;
  MFD?: Date | string;
  rent_price_monthly?: number;
  rent_price_yearly?: number;
  lease_price_monthly?: number;
  lease_price_yearly?: number;
  sale_price?: number;
  tax_rate?: number;
  product_status?: ProductStatus;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

export const getAllProducts = async (): Promise<Product[]> => {
  const response = await api.get<ApiResponse<Product[]>>('/i/products/');
  return response.data.data || [];
};

export const addProduct = async (data: CreateProductData): Promise<Product> => {
  const response = await api.post<ApiResponse<Product>>('/i/products/', data);
  if (!response.data.data) {
    throw new Error('Failed to create product');
  }
  return response.data.data;
};

export const updateProduct = async (id: string, data: UpdateProductData): Promise<void> => {
  await api.put<ApiResponse<void>>(`/i/products/${id}`, data);
};

export const deleteProduct = async (id: string): Promise<void> => {
  await api.delete<ApiResponse<void>>(`/i/products/${id}`);
};

export interface BulkProductRow {
  model_no: string;
  warehouse_id: string;
  vendor_id: number | string;
  serial_no: string;
  name: string;
  brand: string;
  MFD: string | Date;
  rent_price_monthly: number;
  rent_price_yearly: number;
  lease_price_monthly: number;
  lease_price_yearly: number;
  sale_price: number;
  tax_rate: number;
}

export const bulkCreateProducts = async (
  rows: BulkProductRow[],
): Promise<{ successCount: number; failedRows: { row: number; error: string }[] }> => {
  const response = await api.post<
    ApiResponse<{ successCount: number; failedRows: { row: number; error: string }[] }>
  >('/i/products/bulk', { rows });
  return response.data.data || { successCount: 0, failedRows: [] };
};
