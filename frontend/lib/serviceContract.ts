import api from './api';

export type ServiceContractType = 'FSMA' | 'SMA' | 'AMC';
export type FsmaBillingMode = 'INDIVIDUAL' | 'COMBINED';

export interface ContractCoverage {
  labour: boolean;
  spareParts: boolean;
  toner: boolean;
  travel: boolean;
  [key: string]: boolean;
}

export interface ContractUsageSummary {
  readingCount: number;
  totalBilled: number;
  lastTotalReading: number | null;
  lastReadingDate: string | null;
  copiesUsed: number | null;
  copiesRemaining: number | null;
}

export interface ServiceContract {
  id: string;
  productId: string;
  customerId: string;
  contractType: ServiceContractType;
  startDate: string;
  endDate: string;
  contractValue: number;
  coverageRules: ContractCoverage;
  status: string;
  notes?: string | null;
  // AMC (also optional base fee for SMA)
  monthlyCharge?: number | null;
  // SMA
  copyLimit?: number | null;
  overagePerCopyRate?: number | null;
  startMeterReading?: number | null;
  // FSMA
  fsmaBillingMode?: FsmaBillingMode | null;
  ratePerClickBW?: number | null;
  ratePerClickColor?: number | null;
  ratePerClickCombined?: number | null;
  startMeterBW?: number | null;
  startMeterColor?: number | null;
  usageSummary?: ContractUsageSummary;
  created_at?: string;
  updated_at?: string;
}

export interface ContractMeterReading {
  id: string;
  contractId: string;
  readingDate: string;
  totalReading: number | null;
  bwReading: number | null;
  colorReading: number | null;
  clicksTotal: number;
  clicksBW: number;
  clicksColor: number;
  amountCharged: number;
  chargeBreakdown: Record<string, unknown> | null;
  notes?: string | null;
  recordedBy?: string | null;
  created_at: string;
}

export const getServiceContracts = async (
  params?: Record<string, unknown>,
): Promise<ServiceContract[]> => {
  const response = await api.get('/i/service/contracts', { params });
  return response.data.data;
};

export const getServiceContractById = async (id: string): Promise<ServiceContract> => {
  const response = await api.get(`/i/service/contracts/${id}`);
  return response.data.data;
};

export const createServiceContract = async (
  data: Partial<ServiceContract>,
): Promise<ServiceContract> => {
  const response = await api.post('/i/service/contracts', data);
  return response.data.data;
};

export const updateServiceContract = async (
  id: string,
  data: Partial<ServiceContract>,
): Promise<ServiceContract> => {
  const response = await api.put(`/i/service/contracts/${id}`, data);
  return response.data.data;
};

export const deleteServiceContract = async (id: string): Promise<void> => {
  await api.delete(`/i/service/contracts/${id}`);
};

export const recordContractMeterReading = async (
  contractId: string,
  data: {
    totalReading?: number;
    bwReading?: number;
    colorReading?: number;
    readingDate?: string;
    notes?: string;
  },
): Promise<ContractMeterReading> => {
  const response = await api.post(`/i/service/contracts/${contractId}/meter-readings`, data);
  return response.data.data;
};

export interface ExternalMachineInput {
  customerId: string;
  brand: string;
  modelName: string;
  serialNumber: string;
  meterReading: number;
  printColour?: 'BLACK_WHITE' | 'COLOUR' | 'BOTH';
  description?: string;
}

export interface RegisteredExternalMachine {
  id: string;
  serial_no: string;
  name: string;
  brand: string;
  ownership: string;
  meter_reading?: number;
  customer_id?: string | null;
}

/** Registers a machine the customer bought elsewhere (ownership EXTERNAL). */
export const registerExternalMachine = async (
  data: ExternalMachineInput,
): Promise<RegisteredExternalMachine> => {
  const response = await api.post('/i/service/external-machines', data);
  return response.data.data;
};

export const getContractMeterReadings = async (
  contractId: string,
): Promise<{
  contract: ServiceContract;
  readings: ContractMeterReading[];
  totalBilled: number;
}> => {
  const response = await api.get(`/i/service/contracts/${contractId}/meter-readings`);
  return response.data.data;
};
