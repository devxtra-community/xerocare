import { LotItemType } from '../entities/lotItemEntity';
import { TransportMode } from '../entities/enums/transportMode';
import { ShipmentStatus } from '../entities/enums/shipmentStatus';

export interface CreateLotItemDto {
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

export interface CreateLotDto {
  vendorId: string;
  lotNumber: string;
  purchaseDate: string;
  items: CreateLotItemDto[];
  notes?: string;
  branchId?: string;
  warehouseId?: string;
  createdBy?: string;
  // Shipment info is usually unknown at creation (booking happens after PO),
  // so all of it is optional here — set later via updateLotShipment.
  transportMode?: TransportMode;
  carrierName?: string;
  dispatchDate?: string;
  estimatedArrival?: string;
  shipmentStatus?: ShipmentStatus;
  shipmentDetails?: Record<string, string>;
}

export interface UpdateLotShipmentDto {
  transportMode?: TransportMode;
  carrierName?: string;
  dispatchDate?: string;
  estimatedArrival?: string;
  actualArrival?: string;
  shipmentStatus?: ShipmentStatus;
  shipmentDetails?: Record<string, string>;
}

export interface ExcelLotItemRow {
  'Item Type'?: string;
  'Item Name'?: string;
  'Item Code'?: string;
  'Part Name'?: string;
  'Model Name'?: string;
  part_name?: string;
  name?: string;
  model_no?: string;
  Brand?: string;
  brand?: string;
  Quantity?: number | string;
  'Unit Price'?: number | string;
  [key: string]: unknown;
}
