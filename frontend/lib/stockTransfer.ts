import api from './api';

export type TransferType = 'INTRA_BRANCH' | 'INTER_BRANCH';
export type TransferStatus =
  | 'DRAFT'
  | 'SENT'
  | 'APPROVED'
  | 'REJECTED'
  | 'IN_TRANSIT'
  | 'COMPLETED'
  | 'CANCELLED';
export type TransferItemType = 'SPARE_PART' | 'PRODUCT';
export type TransferItemStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface StockTransferItem {
  id: string;
  item_type: TransferItemType;
  spare_part_id?: string;
  model_id?: string;
  product_id?: string;
  requested_qty: number;
  approved_qty?: number;
  item_status: TransferItemStatus;
  assigned_product_ids?: string[];
  source_warehouse_id?: string;
  dispatched_qty?: number;
  received_qty?: number;
  unit_cost: number;
  spare_part?: { id: string; part_name: string; brand: string; sku?: string };
  model?: { id: string; model_no: string; model_name: string; brandRelation?: { name: string } };
  product?: { id: string; name?: string; serial_no: string; barcode_id?: string };
}

export interface StockTransfer {
  id: string;
  transfer_number: string;
  transfer_type: TransferType;
  status: TransferStatus;
  source_branch_id: string;
  source_warehouse_id?: string;
  destination_branch_id: string;
  destination_warehouse_id: string;
  requested_by_id: string;
  approved_by_id?: string;
  reason: string;
  notes?: string;
  rejection_reason?: string;
  lot_id?: string;
  dispatched_at?: string;
  received_at?: string;
  created_at: string;
  items?: StockTransferItem[];
  /** Attached by the backend when a receiving lot exists. */
  lot?: {
    id: string;
    lotNumber: string;
    status: string;
    currencyCode?: string;
    exchangeRateSnapshot?: number;
  };
  source_branch?: { id: string; name: string };
  destination_branch?: { id: string; name: string };
  source_warehouse?: { id: string; warehouseName: string };
  destination_warehouse?: { id: string; warehouseName: string };
}

export interface CreateTransferPayload {
  transfer_type: TransferType;
  source_branch_id: string;
  // INTRA only — INTER requests target a branch, not a specific warehouse.
  source_warehouse_id?: string;
  destination_branch_id: string;
  destination_warehouse_id: string;
  reason: string;
  notes?: string;
  items: {
    item_type: TransferItemType;
    spare_part_id?: string;
    // INTER product lines are requested by model; INTRA lines pick a machine.
    model_id?: string;
    product_id?: string;
    requested_qty: number;
  }[];
}

/** Giving manager's approval payload: per-line edits + serial assignments. */
export interface ApproveLine {
  item_id: string;
  approved_qty: number;
  assigned_product_ids?: string[];
}

export interface BranchInventory {
  models: {
    model_id: string;
    model_no: string;
    model_name: string;
    brand: string | null;
    available: number;
  }[];
  products: { id: string; serial_no: string; model_id: string; model_name: string }[];
  spare_parts: {
    spare_part_id: string;
    part_name: string;
    brand: string;
    item_code: string;
    available: number;
  }[];
}

export const createStockTransfer = async (
  payload: CreateTransferPayload,
): Promise<StockTransfer> => {
  const res = await api.post<{ success: boolean; data: StockTransfer }>(
    '/i/stock-transfers',
    payload,
  );
  return res.data.data;
};

export const listStockTransfers = async (filters?: {
  status?: TransferStatus;
  transfer_type?: TransferType;
  dateFrom?: string;
  dateTo?: string;
  branch?: string;
}): Promise<StockTransfer[]> => {
  const res = await api.get<{ success: boolean; data: StockTransfer[] }>('/i/stock-transfers', {
    params: filters,
  });
  return res.data.data;
};

export const getStockTransfer = async (id: string): Promise<StockTransfer> => {
  const res = await api.get<{ success: boolean; data: StockTransfer }>(`/i/stock-transfers/${id}`);
  return res.data.data;
};

export const submitTransfer = async (id: string): Promise<StockTransfer> => {
  const res = await api.post<{ success: boolean; data: StockTransfer }>(
    `/i/stock-transfers/${id}/submit`,
  );
  return res.data.data;
};

export const approveTransfer = async (id: string, lines: ApproveLine[]): Promise<StockTransfer> => {
  const res = await api.post<{ success: boolean; data: StockTransfer }>(
    `/i/stock-transfers/${id}/approve`,
    { lines },
  );
  return res.data.data;
};

export const rejectTransfer = async (id: string, reason: string): Promise<StockTransfer> => {
  const res = await api.post<{ success: boolean; data: StockTransfer }>(
    `/i/stock-transfers/${id}/reject`,
    { reason },
  );
  return res.data.data;
};

export const dispatchTransfer = async (id: string): Promise<StockTransfer> => {
  const res = await api.post<{ success: boolean; data: StockTransfer }>(
    `/i/stock-transfers/${id}/dispatch`,
  );
  return res.data.data;
};

export const cancelTransfer = async (id: string): Promise<StockTransfer> => {
  const res = await api.post<{ success: boolean; data: StockTransfer }>(
    `/i/stock-transfers/${id}/cancel`,
  );
  return res.data.data;
};

export const getPendingTransferCount = async (): Promise<number> => {
  const res = await api.get<{ success: boolean; data: { count: number } }>(
    '/i/stock-transfers/pending-count',
  );
  return res.data.data.count;
};

/** Wizard/approval picklists. With warehouseId → machines + per-warehouse spare stock (INTRA). */
export const getTransferBranchInventory = async (
  branchId: string,
  warehouseId?: string,
): Promise<BranchInventory> => {
  const res = await api.get<{ success: boolean; data: BranchInventory }>(
    `/i/stock-transfers/branch-inventory/${branchId}`,
    { params: warehouseId ? { warehouseId } : undefined },
  );
  return res.data.data;
};

/** Free machines of a model at a branch — for the giver's serial assignment. */
export const getAssignableProducts = async (
  branchId: string,
  modelId: string,
): Promise<{ id: string; serial_no: string; warehouse_id: string }[]> => {
  const res = await api.get<{
    success: boolean;
    data: { id: string; serial_no: string; warehouse_id: string }[];
  }>(`/i/stock-transfers/assignable-products/${branchId}/${modelId}`);
  return res.data.data;
};

export const STATUS_LABELS: Record<TransferStatus, string> = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  IN_TRANSIT: 'In Transit',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const STATUS_COLORS: Record<TransferStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  SENT: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  REJECTED: 'bg-red-100 text-red-700',
  IN_TRANSIT: 'bg-purple-100 text-purple-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-slate-100 text-slate-500',
};
