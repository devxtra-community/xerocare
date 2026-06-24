import api from './api';

export type BalanceType =
  | 'SALE_OUTSTANDING'
  | 'RENT_CONTRACT'
  | 'LEASE_CONTRACT'
  | 'SERVICE_DEBT'
  | 'OTHER_DEBT';

export interface OpeningBalanceEntry {
  id: string;
  entryNumber: string;
  customerId: string;
  branchId: string;
  branchName?: string;
  balanceType: BalanceType;
  openingBalance: number;
  remainingBalance: number;
  originalTotalAmount: number;
  alreadyPaidAmount: number;
  invoiceId?: string;
  invoice?: {
    id: string;
    invoiceNumber: string;
    status: string;
  };
  isFullySettled: boolean;
  migratedAt: string;
  monthlyBillingAmount?: number;
  billingCycleInDays?: number;
  nextPaymentDueDate?: string;
  totalContractMonths?: number;
  monthsCompleted?: number;
  monthsRemaining?: number;
  remainingContractValue?: number;
  contractStartDate?: string;
  productBrand?: string;
  productModel?: string;
  serialNumber?: string;
  productId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOpeningBalanceEntryDto {
  customerId: string;
  balanceType: BalanceType;
  originalTotalAmount: number;
  alreadyPaidAmount: number;
  monthlyBillingAmount?: number;
  billingCycleInDays?: number;
  nextPaymentDueDate?: string;
  totalContractMonths?: number;
  monthsCompleted?: number;
  productBrand?: string;
  productModel?: string;
  serialNumber?: string;
  productId?: string;
  notes?: string;
  migratedAt?: string;
}

export interface UpdateOpeningBalanceEntryDto {
  monthlyBillingAmount?: number;
  billingCycleInDays?: number;
  nextPaymentDueDate?: string;
  totalContractMonths?: number;
  monthsCompleted?: number;
  productBrand?: string;
  productModel?: string;
  serialNumber?: string;
  productId?: string;
  notes?: string;
}

export const createOpeningBalanceEntry = async (
  data: CreateOpeningBalanceEntryDto,
): Promise<OpeningBalanceEntry> => {
  const response = await api.post('/b/opening-balance', data);
  return response.data.data;
};

export const getOpeningBalanceEntries = async (params?: {
  page?: number;
  limit?: number;
  customerId?: string;
  balanceType?: BalanceType;
  isFullySettled?: boolean;
}): Promise<{ data: OpeningBalanceEntry[]; total: number; page: number; limit: number }> => {
  const response = await api.get('/b/opening-balance', { params });
  return response.data;
};

export const getOpeningBalanceEntry = async (id: string): Promise<OpeningBalanceEntry> => {
  const response = await api.get(`/b/opening-balance/${id}`);
  return response.data.data;
};

export const getCustomerOpeningBalances = async (
  customerId: string,
): Promise<OpeningBalanceEntry[]> => {
  const response = await api.get(`/b/opening-balance/customer/${customerId}`);
  return response.data.data;
};

export const updateOpeningBalanceEntry = async (
  id: string,
  data: UpdateOpeningBalanceEntryDto,
): Promise<OpeningBalanceEntry> => {
  const response = await api.put(`/b/opening-balance/${id}`, data);
  return response.data.data;
};

export const deleteOpeningBalanceEntry = async (id: string): Promise<void> => {
  await api.delete(`/b/opening-balance/${id}`);
};
