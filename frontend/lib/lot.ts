import api from './api';
import { Model } from './model';
import { SparePart } from './spare-part';

export enum LotItemType {
  MODEL = 'MODEL',
  SPARE_PART = 'SPARE_PART',
}

export enum LotStatus {
  PENDING = 'PENDING',
  RECEIVING = 'RECEIVING',
  RECEIVED = 'RECEIVED',
  COMPLETED = 'COMPLETED', // backward-compat alias for RECEIVED in older lots
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
  /** Expected quantity ordered from vendor */
  expectedQuantity: number;
  /** Quantity actually received in good condition */
  receivedQuantity: number;
  /** Quantity received but damaged */
  damagedQuantity: number;
  /** Quantity sent back to vendor */
  returnedQuantity: number;
  /** Quantity already allocated to inventory */
  usedQuantity: number;
  unitPrice: number;
  totalPrice: number;
  customProductName?: string;
  customSparePartName?: string;
  mpn?: string;
  compatibleModels?: string;
  modelIds?: string[];
  selling_price?: number;
}

export interface Lot {
  id: string;
  lotNumber: string;
  vendorId: string;
  vendor: Vendor;
  purchaseDate: string;
  totalAmount: number;
  status: LotStatus;
  branch_id?: string;
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
  modelIds?: string[];
  sparePartId?: string;
  brand?: string;
  partName?: string;
  quantity: number;
  unitPrice: number;
  sellingPrice?: number;
  mpn?: string;
  compatibleModels?: string;
}

export interface CreateLotData {
  vendorId: string;
  lotNumber: string;
  purchaseDate: string;
  notes?: string;
  branchId?: string;
  warehouseId?: string;
  createdBy?: string;
  items: CreateLotItemData[];
}

export interface ReceiveLotItemPayload {
  item_id: string;
  received_quantity: number;
  damaged_quantity: number;
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
    const coreData = resData.data || resData;

    if (coreData && coreData.page !== undefined) {
      return coreData as PaginatedResponse<Lot>;
    }

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
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  },

  checkLotNumber: async (lotNumber: string): Promise<boolean> => {
    const response = await api.get<{ success: boolean; exists: boolean }>(
      `/i/lots/check-number/${encodeURIComponent(lotNumber)}`,
    );
    return response.data.exists;
  },

  /**
   * Save received / damaged quantities for lot items.
   * Transitions lot status → RECEIVING.
   */
  receiveLot: async (lotId: string, items: ReceiveLotItemPayload[]): Promise<Lot> => {
    const response = await api.patch<ApiResponse<Lot>>(`/i/lots/${lotId}/receive`, { items });
    return response.data.data;
  },

  /**
   * Confirm lot as RECEIVED. Unlocks inventory creation for this lot.
   */
  confirmLotReceived: async (lotId: string): Promise<Lot> => {
    const response = await api.post<ApiResponse<Lot>>(`/i/lots/${lotId}/confirm`);
    return response.data.data;
  },

  /** Download full lot Excel report as blob. */
  downloadLotExcel: async (lotId: string): Promise<ArrayBuffer> => {
    const response = await api.get(`/i/lots/${lotId}/export`, { responseType: 'arraybuffer' });
    return response.data;
  },

  /** Download products-only Excel report as blob. */
  downloadLotProductsExcel: async (lotId: string): Promise<ArrayBuffer> => {
    const response = await api.get(`/i/lots/${lotId}/export-products`, {
      responseType: 'arraybuffer',
    });
    return response.data;
  },

  /** Download spare-parts-only Excel report as blob. */
  downloadLotSparePartsExcel: async (lotId: string): Promise<ArrayBuffer> => {
    const response = await api.get(`/i/lots/${lotId}/export-spareparts`, {
      responseType: 'arraybuffer',
    });
    return response.data;
  },
};
