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
  MFD: string; // Manufacturing Date
  tax_rate: number;
  sale_price: number;
  purchase_price?: number;
  wholesale_price?: number;
  /** Current state of the item: is it for sale, rented out, or sold? */
  product_status: 'AVAILABLE' | 'RENTED' | 'LEASE' | 'SOLD' | 'DAMAGED';
  /** Does it print in color or simple black and white? */
  print_colour: 'BLACK_WHITE' | 'COLOUR' | 'BOTH';
  max_discount_amount: number;
  imageUrl?: string;
  stock?: number;
  lot_id?: string;
  lot?: { lotNumber: string };
}

/**
 * Information needed to add a new product to our catalog.
 */
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
  purchase_price?: number;
  tax_rate: number;
  print_colour: 'BLACK_WHITE' | 'COLOUR' | 'BOTH';
  max_discount_amount: number;
  wholesale_price?: number;
  imageUrl?: string;
  lot_id?: string;
}

/**
 * A simpler way to add many products at once from a list or spreadsheet.
 */
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
  purchase_price?: number;
  tax_rate: number;
  print_colour: 'BLACK_WHITE' | 'COLOUR' | 'BOTH';
  max_discount_amount: number;
  wholesale_price?: number;
  lot_id?: string;
}

/**
 * Result of adding many products at once.
 */
export interface BulkCreateResponse {
  success: boolean;
  inserted: number;
  failed: { row: number; error: string }[];
}

/**
 * How we handle long lists of data by breaking them into "Pages" (like a book).
 */
export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
}

/**
 * The Product Service handles all communication with our database regarding
 * the machines and items we sell.
 */
export const productService = {
  /**
   * Get a list of all products. Since the list can be very long,
   * we show them a few at a time (on different pages).
   */
  getAllProducts: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedResponse<Product>> => {
    const response = await api.get('/i/products', { params });
    // Safety check: ensure we handle the data correctly whether it's one page or many.
    if (response.data.page !== undefined) {
      return response.data;
    }
    return {
      data: response.data.data || response.data || [],
      page: 1,
      limit: 10,
      total: (response.data.data || response.data || []).length,
    };
  },

  /**
   * Add a brand new product to the list.
   */
  createProduct: async (data: CreateProductDTO | FormData): Promise<Product> => {
    const response = await api.post('/i/products', data);
    return response.data.data;
  },

  /**
   * Add many products at once from a list.
   */
  bulkCreateProducts: async (rows: BulkProductRow[]): Promise<BulkCreateResponse> => {
    const response = await api.post('/i/products/bulk', { rows });
    return response.data;
  },

  /**
   * Change the details of an existing product (like its price or status).
   */
  updateProduct: async (id: string, data: Partial<CreateProductDTO> | FormData): Promise<void> => {
    await api.put(`/i/products/${id}`, data);
  },

  /**
   * Remove a product from our active list.
   */
  deleteProduct: async (id: string): Promise<void> => {
    await api.delete(`/i/products/${id}`);
  },
};
