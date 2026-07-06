import api from './api';

export type TransferType = 'INTRA_BRANCH' | 'INTER_BRANCH';
export type TransferStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'IN_TRANSIT'
  | 'RECEIVED'
  | 'PARTIALLY_RECEIVED'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED';
export type TransferItemType = 'SPARE_PART' | 'PRODUCT';

export interface StockTransferItem {
  id: string;
  item_type: TransferItemType;
  spare_part_id?: string;
  product_id?: string;
  requested_qty: number;
  dispatched_qty?: number;
  received_qty?: number;
  unit_cost: number;
  spare_part?: { id: string; item_name: string; item_code: string; barcode_id?: string };
  product?: { id: string; name: string; serial_no: string; barcode_id?: string };
}

export interface StockTransfer {
  id: string;
  transfer_number: string;
  transfer_type: TransferType;
  status: TransferStatus;
  source_branch_id: string;
  source_warehouse_id: string;
  destination_branch_id: string;
  destination_warehouse_id: string;
  requested_by_id: string;
  approved_by_id?: string;
  reason: string;
  notes?: string;
  rejection_reason?: string;
  dispatched_at?: string;
  received_at?: string;
  created_at: string;
  items?: StockTransferItem[];
  source_branch?: { id: string; name: string };
  destination_branch?: { id: string; name: string };
  source_warehouse?: { id: string; warehouseName: string };
  destination_warehouse?: { id: string; warehouseName: string };
}

export interface CreateTransferPayload {
  transfer_type: TransferType;
  source_branch_id: string;
  source_warehouse_id: string;
  destination_branch_id: string;
  destination_warehouse_id: string;
  reason: string;
  notes?: string;
  items: {
    item_type: TransferItemType;
    spare_part_id?: string;
    product_id?: string;
    requested_qty: number;
    unit_cost?: number;
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

export const approveTransfer = async (id: string): Promise<StockTransfer> => {
  const res = await api.post<{ success: boolean; data: StockTransfer }>(
    `/i/stock-transfers/${id}/approve`,
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

export const receiveTransfer = async (
  id: string,
  items: { itemId: string; received_qty: number }[],
): Promise<StockTransfer> => {
  const res = await api.post<{ success: boolean; data: StockTransfer }>(
    `/i/stock-transfers/${id}/receive`,
    { items },
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

export const STATUS_LABELS: Record<TransferStatus, string> = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending Approval',
  APPROVED: 'Approved',
  IN_TRANSIT: 'In Transit',
  RECEIVED: 'Received',
  PARTIALLY_RECEIVED: 'Partially Received',
  COMPLETED: 'Completed',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

export const STATUS_COLORS: Record<TransferStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  IN_TRANSIT: 'bg-purple-100 text-purple-700',
  RECEIVED: 'bg-green-100 text-green-700',
  PARTIALLY_RECEIVED: 'bg-orange-100 text-orange-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-slate-100 text-slate-500',
};
