import api from './api';
import { Model } from './model';

export enum ProductStatus {
    AVAILABLE = 'available',
    RENTED = 'rented',
    SOLD = 'sold',
    DAMAGED = 'damaged',
}

export interface Product {
    id: string;
    model: Model; // Controller returns nested model data if TypeORM loads it, need to verify or make optional. Usually it's an object.
    vendor_id: number;
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
    created_at: string;
}

export interface CreateProductData {
    model_id: string; // Sending ID to link model
    vendor_id: number;
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
    vendor_id?: number;
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
    const response = await api.get<ApiResponse<Product[]>>('/i/products');
    return response.data.data || [];
};

export const addProduct = async (data: CreateProductData): Promise<Product> => {
    const response = await api.post<ApiResponse<Product>>('/i/products', data);
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
