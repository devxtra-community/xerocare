import api from './api';

export type TransferType = 'INTRA_BRANCH' | 'INTER_BRANCH';
export type TransferStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'ACCEPTED'
  | 'PARTIALLY_ACCEPTED'
  | 'REJECTED'
  | 'IN_TRANSIT'
  | 'RECEIVED'
  | 'COMPLETED'
  | 'CANCELLED';

export type TransferItemType = 'SPARE_PART' | 'PRODUCT';

export interface TransferItem {
  id: string;
  transfer_id: string;
  item_type: TransferItemType;
  spare_part_id?: string;
  product_id?: string;
  spare_part?: { id: string; part_name: string; sku: string };
  product?: { id: string; serial_number: string; model?: { model_name: string } };
  requested_qty: number;
  fulfilled_qty?: number;
  received_qty?: number;
  source_warehouse_id?: string;
  source_warehouse?: { id: string; warehouseName: string };
  destination_warehouse_id?: string;
  destination_warehouse?: { id: string; warehouseName: string };
  item_name?: string;
}

export interface StockTransfer {
  id: string;
  transfer_number: string;
  transfer_type: TransferType;
  status: TransferStatus;
  requesting_branch_id: string;
  requesting_branch?: { id: string; name: string };
  requesting_warehouse_id?: string;
  requesting_warehouse?: { id: string; warehouseName: string };
  source_branch_id: string;
  source_branch?: { id: string; name: string };
  source_warehouse_id?: string;
  source_warehouse?: { id: string; warehouseName: string };
  requested_by_id: string;
  responded_by_id?: string;
  notes?: string;
  rejection_reason?: string;
  responded_at?: string;
  dispatched_at?: string;
  received_at?: string;
  items: TransferItem[];
  created_at: string;
  updated_at: string;
}

export interface CreateTransferPayload {
  transfer_type: TransferType;
  source_branch_id: string;
  requesting_branch_id?: string;
  source_warehouse_id?: string;
  requesting_warehouse_id?: string;
  notes?: string;
  items: {
    item_type: TransferItemType;
    spare_part_id?: string;
    product_id?: string;
    requested_qty: number;
    item_name?: string;
  }[];
}

export interface RespondPayload {
  items: {
    itemId: string;
    fulfilled_qty: number;
    source_warehouse_id?: string;
  }[];
  rejection_reason?: string;
}

export interface ReceivePayload {
  destination_warehouse_id: string;
  items: {
    itemId: string;
    received_qty: number;
  }[];
}

// Status display helpers
export const STATUS_LABELS: Record<TransferStatus, string> = {
  DRAFT: 'Draft',
  PENDING: 'Pending Response',
  ACCEPTED: 'Accepted',
  PARTIALLY_ACCEPTED: 'Partially Accepted',
  REJECTED: 'Rejected',
  IN_TRANSIT: 'In Transit',
  RECEIVED: 'Received',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const STATUS_COLORS: Record<TransferStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PENDING: 'bg-amber-100 text-amber-700',
  ACCEPTED: 'bg-green-100 text-green-700',
  PARTIALLY_ACCEPTED: 'bg-blue-100 text-blue-700',
  REJECTED: 'bg-red-100 text-red-700',
  IN_TRANSIT: 'bg-purple-100 text-purple-700',
  RECEIVED: 'bg-teal-100 text-teal-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

// API functions
export async function createStockTransfer(data: CreateTransferPayload): Promise<StockTransfer> {
  const res = await api.post('/i/stock-transfers', data);
  return res.data.data;
}

export async function listStockTransfers(params?: {
  status?: string;
  transfer_type?: string;
  search?: string;
}): Promise<StockTransfer[]> {
  const res = await api.get('/i/stock-transfers', { params });
  return res.data.data;
}

export async function getStockTransfer(id: string): Promise<StockTransfer> {
  const res = await api.get(`/i/stock-transfers/${id}`);
  return res.data.data;
}

export async function submitTransfer(id: string): Promise<StockTransfer> {
  const res = await api.post(`/i/stock-transfers/${id}/submit`);
  return res.data.data;
}

export async function respondToTransfer(
  id: string,
  payload: RespondPayload,
): Promise<StockTransfer> {
  const res = await api.post(`/i/stock-transfers/${id}/respond`, payload);
  return res.data.data;
}

export async function dispatchTransfer(id: string): Promise<StockTransfer> {
  const res = await api.post(`/i/stock-transfers/${id}/dispatch`);
  return res.data.data;
}

export async function receiveTransfer(id: string, payload: ReceivePayload): Promise<StockTransfer> {
  const res = await api.post(`/i/stock-transfers/${id}/receive`, payload);
  return res.data.data;
}

export async function cancelTransfer(id: string): Promise<StockTransfer> {
  const res = await api.post(`/i/stock-transfers/${id}/cancel`);
  return res.data.data;
}

export async function getPendingTransferCount(): Promise<number> {
  const res = await api.get('/i/stock-transfers/pending-count');
  return res.data.data.count;
}

export async function getBranchInventory(branchId: string): Promise<{
  inventory: Array<{
    spare_part_id: string;
    part_name: string;
    sku: string;
    warehouse_id: string;
    warehouse_name: string;
    quantity: number;
  }>;
  products: Array<{
    id: string;
    serial_number: string;
    model_name: string;
    warehouse_id: string;
    warehouse_name: string;
    status: string;
  }>;
}> {
  const res = await api.get(`/i/stock-transfers/branch-inventory/${branchId}`);
  return res.data.data;
}

export async function getAllBranches(): Promise<{ id: string; name: string }[]> {
  const res = await api.get('/i/branch/all');
  return res.data.data;
}
