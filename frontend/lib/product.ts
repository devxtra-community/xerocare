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

/**
 * Retrieves a list of all products from the inventory service.
 * @returns Array of Product objects
 */
export const getAllProducts = async (): Promise<Product[]> => {
  const response = await api.get<ApiResponse<Product[]>>('/i/products/');
  return response.data.data || [];
};

/**
 * Filters available products by their associated model ID.
 * @param modelId The ID of the model to filter by
 * @returns Array of available products for the specified model
 */
export const getAvailableProductsByModel = async (modelId: string): Promise<Product[]> => {
  const allProducts = await getAllProducts();
  return allProducts.filter(
    (p) =>
      (p.model?.id === modelId || (p.model as { model_id?: string })?.model_id === modelId) &&
      p.product_status === ProductStatus.AVAILABLE,
  );
};

/**
 * Registers a new product in the inventory.
 * @param data Product creation data including model, warehouse, and vendor IDs
 * @returns The newly created Product object
 */
export const addProduct = async (data: CreateProductData): Promise<Product> => {
  const response = await api.post<ApiResponse<Product>>('/i/products/', data);
  if (!response.data.data) {
    throw new Error('Failed to create product');
  }
  return response.data.data;
};

/**
 * Updates an existing product's information.
 * @param id The ID of the product to update
 * @param data Partial product data for update
 */
export const updateProduct = async (id: string, data: UpdateProductData): Promise<void> => {
  await api.put<ApiResponse<void>>(`/i/products/${id}`, data);
};

/**
 * Permanently removes a product from the inventory.
 * @param id The ID of the product to delete
 */
export const deleteProduct = async (id: string): Promise<void> => {
  await api.delete<ApiResponse<void>>(`/i/products/${id}`);
};

/**
 * Retrieves full details for a specific product by its ID.
 * @param id The ID of the product to retrieve
 * @returns The Product object
 */
export const getProductById = async (id: string): Promise<Product> => {
  const response = await api.get<ApiResponse<Product>>(`/i/products/${id}`);
  if (!response.data.data) {
    throw new Error('Product not found');
  }
  return response.data.data;
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

/**
 * Performs a bulk creation of multiple products.
 * @param rows Array of product data rows for bulk insertion
 * @returns Success count and details of any failed rows
 */
export const bulkCreateProducts = async (
  rows: BulkProductRow[],
): Promise<{ successCount: number; failedRows: { row: number; error: string }[] }> => {
  const response = await api.post<
    ApiResponse<{ successCount: number; failedRows: { row: number; error: string }[] }>
  >('/i/products/bulk', { rows });
  return response.data.data || { successCount: 0, failedRows: [] };
};
