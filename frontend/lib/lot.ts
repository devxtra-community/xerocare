import api from './api';
import { Model } from './model';
import { SparePart } from './spare-part';

export enum LotItemType {
  MODEL = 'MODEL',
  SPARE_PART = 'SPARE_PART',
}

export enum LotStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface Vendor {
  id: string;
  name: string;
}

export interface LotItem {
  id: string;
  lotId: string;
  itemType: LotItemType;
  modelId?: string;
  model?: Model;
  sparePartId?: string;
  sparePart?: SparePart;
  usedQuantity: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Lot {
  id: string;
  lotNumber: string;
  vendorId: string;
  vendor: Vendor;
  purchaseDate: string;
  transportationCost: number;
  documentationCost: number;
  shippingCost: number;
  groundFieldCost: number;
  certificationCost: number;
  labourCost: number;
  totalAmount: number;
  status: LotStatus;
  notes?: string;
  warehouseId?: string;
  warehouse_id?: string;
  items: LotItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateLotItemData {
  itemType: LotItemType;
  modelId?: string;
  sparePartId?: string;
  brand?: string;
  partName?: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateLotData {
  vendorId: string;
  lotNumber: string;
  purchaseDate: string;
  transportationCost?: number;
  documentationCost?: number;
  shippingCost?: number;
  groundFieldCost?: number;
  certificationCost?: number;
  labourCost?: number;
  notes?: string;
  branchId?: string;
  warehouseId?: string;
  createdBy?: string;
  items: CreateLotItemData[];
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export const lotService = {
  getAllLots: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedResponse<Lot>> => {
    const response = await api.get('/i/lots', { params });
    const resData = response.data;
    const coreData = resData.data || resData; // Handle both direct array and wrapped standard response

    // If it's the new paginated format
    if (coreData && coreData.page !== undefined) {
      return coreData as PaginatedResponse<Lot>;
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

  getLotById: async (id: string): Promise<Lot> => {
    const response = await api.get<ApiResponse<Lot>>(`/i/lots/${id}`);
    return response.data.data;
  },

  createLot: async (data: CreateLotData): Promise<Lot> => {
    const response = await api.post<ApiResponse<Lot>>('/i/lots', data);
    return response.data.data;
  },

  uploadLotExcel: async (file: File): Promise<Lot> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<ApiResponse<Lot>>('/i/lots/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },
};
