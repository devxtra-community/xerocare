import { LotItemType } from '../entities/lotItemEntity';

export interface CreateLotItemDto {
  itemType: LotItemType;
  modelId?: string;
  modelIds?: string[];
  sparePartId?: string;
  brand?: string;
  partName?: string;
  quantity: number;
  unitPrice: number;
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
