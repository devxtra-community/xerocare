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
    items: LotItem[];
    createdAt: string;
    updatedAt: string;
}

export interface CreateLotItemData {
    itemType: LotItemType;
    modelId?: string;
    sparePartId?: string;
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
    items: CreateLotItemData[];
}

interface ApiResponse<T> {
    success: boolean;
    message?: string;
    data: T;
}

export const lotService = {
    getAllLots: async (): Promise<Lot[]> => {
        const response = await api.get<ApiResponse<Lot[]>>('/i/lots');
        return response.data.data;
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
