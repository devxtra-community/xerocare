import api from './api';

export type SwapRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface MachineSwapRequest {
  id: string;
  branchId: string;
  contractId: string;
  invoiceNumber: string;
  contractType: string;
  customerName?: string;
  modelId?: string;
  modelName?: string;
  currentProductId?: string;
  currentSerialNumber: string;
  requestedProductId: string;
  requestedSerialNumber: string;
  reason?: string;
  requestedById: string;
  requestedByName: string;
  status: SwapRequestStatus;
  reviewedById?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  swapExecutedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const initiateMachineSwap = async (
  contractId: string,
  data: { requestedProductId: string; reason?: string },
): Promise<MachineSwapRequest> => {
  const res = await api.post<ApiResponse<MachineSwapRequest>>(
    `/b/contracts/${contractId}/machine-swap`,
    data,
  );
  return res.data.data;
};

export const getMachineSwapRequests = async (params?: {
  status?: SwapRequestStatus;
  contractId?: string;
}): Promise<MachineSwapRequest[]> => {
  const res = await api.get<ApiResponse<MachineSwapRequest[]>>('/b/machine-swaps', { params });
  return res.data.data;
};

export const approveMachineSwap = async (id: string): Promise<MachineSwapRequest> => {
  const res = await api.post<ApiResponse<MachineSwapRequest>>(`/b/machine-swaps/${id}/approve`);
  return res.data.data;
};

export const rejectMachineSwap = async (
  id: string,
  rejectionReason: string,
): Promise<MachineSwapRequest> => {
  const res = await api.post<ApiResponse<MachineSwapRequest>>(`/b/machine-swaps/${id}/reject`, {
    rejectionReason,
  });
  return res.data.data;
};
