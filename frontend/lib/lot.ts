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

export enum TransportMode {
  SEA = 'SEA',
  AIR = 'AIR',
  ROAD = 'ROAD',
  RAIL = 'RAIL',
  COURIER = 'COURIER',
  PICKUP = 'PICKUP',
  OTHER = 'OTHER',
}

export const TRANSPORT_MODE_LABELS: Record<TransportMode, string> = {
  [TransportMode.SEA]: 'Sea Freight',
  [TransportMode.AIR]: 'Air Freight',
  [TransportMode.ROAD]: 'Road Transport',
  [TransportMode.RAIL]: 'Rail Transport',
  [TransportMode.COURIER]: 'Courier',
  [TransportMode.PICKUP]: 'Pickup',
  [TransportMode.OTHER]: 'Other',
};

/** Which free-text fields are relevant per transport mode, and their labels. */
export const MODE_DETAIL_FIELDS: Record<TransportMode, { key: string; label: string }[]> = {
  [TransportMode.SEA]: [
    { key: 'vessel', label: 'Vessel Name' },
    { key: 'voyageNo', label: 'Voyage No.' },
    { key: 'containerNo', label: 'Container No.' },
    { key: 'billOfLadingNo', label: 'Bill of Lading No.' },
  ],
  [TransportMode.AIR]: [
    { key: 'airline', label: 'Airline' },
    { key: 'flightNo', label: 'Flight No.' },
    { key: 'airwayBillNo', label: 'Airway Bill No.' },
  ],
  [TransportMode.ROAD]: [
    { key: 'transportCompany', label: 'Transport Company' },
    { key: 'vehicleNumber', label: 'Vehicle Number' },
    { key: 'driverName', label: 'Driver Name' },
    { key: 'lrNumber', label: 'LR Number' },
  ],
  [TransportMode.RAIL]: [
    { key: 'railwayCompany', label: 'Railway Company' },
    { key: 'wagonNo', label: 'Wagon No.' },
    { key: 'rrNumber', label: 'RR Number' },
  ],
  [TransportMode.COURIER]: [
    { key: 'courierCompany', label: 'Courier Company' },
    { key: 'trackingNumber', label: 'Tracking Number' },
  ],
  [TransportMode.PICKUP]: [{ key: 'pickedUpBy', label: 'Picked Up By' }],
  [TransportMode.OTHER]: [{ key: 'description', label: 'Description' }],
};

export enum ShipmentStatus {
  PENDING_DISPATCH = 'PENDING_DISPATCH',
  IN_TRANSIT = 'IN_TRANSIT',
  CUSTOMS_CLEARANCE = 'CUSTOMS_CLEARANCE',
  ARRIVED = 'ARRIVED',
  RELEASED = 'RELEASED',
}

export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  [ShipmentStatus.PENDING_DISPATCH]: 'Pending Dispatch',
  [ShipmentStatus.IN_TRANSIT]: 'In Transit',
  [ShipmentStatus.CUSTOMS_CLEARANCE]: 'Customs Clearance',
  [ShipmentStatus.ARRIVED]: 'Arrived',
  [ShipmentStatus.RELEASED]: 'Released',
};

/** Groups document types into the categories purchasing staff think in. */
export enum LotDocumentCategory {
  COMMERCIAL = 'COMMERCIAL',
  TRANSPORT = 'TRANSPORT',
  CUSTOMS = 'CUSTOMS',
  OTHER = 'OTHER',
}

export const LOT_DOCUMENT_CATEGORY_LABELS: Record<LotDocumentCategory, string> = {
  [LotDocumentCategory.COMMERCIAL]: 'Commercial',
  [LotDocumentCategory.TRANSPORT]: 'Transport',
  [LotDocumentCategory.CUSTOMS]: 'Customs',
  [LotDocumentCategory.OTHER]: 'Other',
};

export enum LotDocumentType {
  BILL_OF_LADING = 'BILL_OF_LADING',
  CUSTOMS_DECLARATION = 'CUSTOMS_DECLARATION',
  COMMERCIAL_INVOICE = 'COMMERCIAL_INVOICE',
  PACKING_LIST = 'PACKING_LIST',
  INSURANCE_CERTIFICATE = 'INSURANCE_CERTIFICATE',
  OTHER = 'OTHER',
}

export const LOT_DOCUMENT_TYPE_LABELS: Record<LotDocumentType, string> = {
  [LotDocumentType.BILL_OF_LADING]: 'Bill of Lading',
  [LotDocumentType.CUSTOMS_DECLARATION]: 'Customs Declaration',
  [LotDocumentType.COMMERCIAL_INVOICE]: 'Commercial Invoice',
  [LotDocumentType.PACKING_LIST]: 'Packing List',
  [LotDocumentType.INSURANCE_CERTIFICATE]: 'Insurance Certificate',
  [LotDocumentType.OTHER]: 'Other',
};

export const LOT_DOCUMENT_TYPE_CATEGORY: Record<LotDocumentType, LotDocumentCategory> = {
  [LotDocumentType.BILL_OF_LADING]: LotDocumentCategory.TRANSPORT,
  [LotDocumentType.CUSTOMS_DECLARATION]: LotDocumentCategory.CUSTOMS,
  [LotDocumentType.COMMERCIAL_INVOICE]: LotDocumentCategory.COMMERCIAL,
  [LotDocumentType.PACKING_LIST]: LotDocumentCategory.COMMERCIAL,
  [LotDocumentType.INSURANCE_CERTIFICATE]: LotDocumentCategory.COMMERCIAL,
  [LotDocumentType.OTHER]: LotDocumentCategory.OTHER,
};

export interface LotDocument {
  id: string;
  lotId: string;
  documentType: LotDocumentType;
  /** User-given label, e.g. "Bill of Lading - Container XYZ4521". */
  documentName: string;
  notes?: string;
  fileUrl: string;
  fileName: string;
  mimeType?: string;
  fileSize?: number;
  uploadedBy?: string;
  createdAt: string;
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
  hsCode?: string;
  compatibleModels?: string;
  modelIds?: string[];
  sellingPrice?: number;
}

export interface Lot {
  id: string;
  lotNumber: string;
  // Absent on internal stock-transfer lots
  vendorId?: string;
  vendor?: Vendor;
  /** True for lots auto-created by a stock transfer — no vendor, no amounts. */
  transferOrigin?: boolean;
  transferId?: string;
  purchaseDate: string;
  totalAmount: number;
  status: LotStatus;
  /** Copied from the awarding RFQ. Undefined for manually-created lots. */
  purchaseOrigin?: import('./purchaseOrigin').PurchaseOrigin;
  branch_id?: string;
  notes?: string;
  warehouseId?: string;
  warehouse_id?: string;
  items: LotItem[];
  documents?: LotDocument[];
  // Shipment / logistics info — set at creation or later via updateShipment.
  transportMode?: TransportMode;
  carrierName?: string;
  dispatchDate?: string;
  estimatedArrival?: string;
  actualArrival?: string;
  shipmentStatus?: ShipmentStatus;
  shipmentDetails?: Record<string, string>;
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
  hsCode?: string;
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
  transportMode?: TransportMode;
  carrierName?: string;
  dispatchDate?: string;
  estimatedArrival?: string;
  shipmentDetails?: Record<string, string>;
}

export interface ReceiveLotItemPayload {
  item_id: string;
  received_quantity: number;
  damaged_quantity: number;
}

export interface UpdateLotShipmentPayload {
  transportMode?: TransportMode;
  carrierName?: string;
  dispatchDate?: string;
  estimatedArrival?: string;
  actualArrival?: string;
  shipmentStatus?: ShipmentStatus;
  shipmentDetails?: Record<string, string>;
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

  /**
   * Updates a lot's shipment/logistics info. Callable repeatedly as the
   * shipment progresses — independent of the receiving workflow.
   */
  updateShipment: async (lotId: string, data: UpdateLotShipmentPayload): Promise<Lot> => {
    const response = await api.patch<ApiResponse<Lot>>(`/i/lots/${lotId}/shipment`, data);
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

  /**
   * Uploads a shipping/customs document (bill of lading, customs
   * declaration, etc.) and attaches it to the lot. Some jurisdictions
   * require these kept on file for years — stored durably, not deleted
   * except by an admin correcting a mistake.
   */
  uploadLotDocument: async (
    lotId: string,
    file: File,
    documentType: LotDocumentType,
    documentName: string,
    notes?: string,
  ): Promise<LotDocument> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);
    formData.append('documentName', documentName);
    if (notes) formData.append('notes', notes);
    const response = await api.post<ApiResponse<LotDocument>>(
      `/i/lots/${lotId}/documents`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data.data;
  },

  getLotDocuments: async (lotId: string): Promise<LotDocument[]> => {
    const response = await api.get<ApiResponse<LotDocument[]>>(`/i/lots/${lotId}/documents`);
    return response.data.data;
  },

  /** Admin-only: removes a document record. */
  deleteLotDocument: async (lotId: string, documentId: string): Promise<void> => {
    await api.delete(`/i/lots/${lotId}/documents/${documentId}`);
  },
};
