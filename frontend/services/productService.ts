import api from '@/lib/api';
import { Model } from './modelService';

export interface Product {
  id: string;
  name: string;
  model_id: string;
  model?: Model;
  model_no?: string;
  warehouse_id: string;
  warehouse_name?: string;
  vendor_id: string;
  vendor_name?: string;
  vendor?: { id: string; name: string };
  warehouse?: { id: string; warehouseName: string };
  serial_no: string;
  brand: string;
  MFD: string;
  tax_rate: number;
  sale_price: number;
  product_status: 'AVAILABLE' | 'RENTED' | 'LEASE' | 'SOLD' | 'DAMAGED';
  print_colour: 'BLACK_WHITE' | 'COLOUR' | 'BOTH';
  max_discount_amount: number;
  imageUrl?: string;
  stock?: number;
  lot_id?: string;
  lot?: { lotNumber: string; lot_number?: string };
}

export interface CreateProductDTO {
  model_id: string;
  warehouse_id: string;
  vendor_id: string;
  serial_no: string;
  product_status: Product['product_status'];
  name: string;
  brand: string;
  MFD: string | Date;
  sale_price: number;
  tax_rate: number;
  print_colour: 'BLACK_WHITE' | 'COLOUR' | 'BOTH';
  max_discount_amount: number;
  imageUrl?: string;
  lot_id?: string;
}

export interface BulkProductRow {
  model_no?: string;
  model_id?: string;
  warehouse_id: string;
  vendor_id: string;
  product_status: 'AVAILABLE' | 'RENTED' | 'LEASE' | 'SOLD' | 'DAMAGED';
  serial_no: string;
  name: string;
  brand: string;
  MFD: string | Date;
  sale_price: number;
  tax_rate: number;
  print_colour: 'BLACK_WHITE' | 'COLOUR' | 'BOTH';
  max_discount_amount: number;
  lot_id?: string;
}

export interface BulkCreateResponse {
  success: boolean;
  inserted: number;
  failed: { row: number; error: string }[];
}

export const productService = {
  /**
   * Retrieves all products.
   */
  getAllProducts: async (): Promise<Product[]> => {
    const response = await api.get('/i/products');
    return response.data.data;
  },

  /**
   * Creates a new product.
   */
  createProduct: async (data: CreateProductDTO | FormData): Promise<Product> => {
    const response = await api.post('/i/products', data);
    return response.data.data;
  },

  /**
   * Creates multiple products in bulk.
   */
  bulkCreateProducts: async (rows: BulkProductRow[]): Promise<BulkCreateResponse> => {
    const response = await api.post('/i/products/bulk', { rows });
    return response.data;
  },

  /**
   * Updates a product.
   */
  updateProduct: async (id: string, data: Partial<CreateProductDTO> | FormData): Promise<void> => {
    await api.put(`/i/products/${id}`, data);
  },

  /**
   * Deletes a product.
   */
  deleteProduct: async (id: string): Promise<void> => {
    await api.delete(`/i/products/${id}`);
  },
};
