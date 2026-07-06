import api from './api';

export type HistoryEventType =
  | 'RECEIVED'
  | 'ALLOCATED'
  | 'DEALLOCATED'
  | 'REPLACED'
  | 'SERVICE_TICKET'
  | 'USAGE_RECORD';

export interface HistoryEvent {
  type: HistoryEventType;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface MachineHistory {
  totalServiceVisits: number;
  totalPreventativeVisits: number;
  lastServiceDate: string | null;
  totalPartsSpend: number;
  totalLabourSpend: number;
  totalLifetimeCost: number;
}

export interface ProductHistoryResponse {
  product: Record<string, unknown>;
  machineHistory: MachineHistory | null;
  events: HistoryEvent[];
}

export const getProductHistory = async (productId: string): Promise<ProductHistoryResponse> => {
  const res = await api.get<{ success: boolean; data: ProductHistoryResponse }>(
    `/i/products/${productId}/history`,
  );
  return res.data.data;
};
