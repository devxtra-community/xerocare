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

export interface ContractMachineInfo {
  modelName: string;
  brand: string;
  serialNumber: string;
  ownership?: string | null;
  meterReading?: number | null;
}

export interface ContractTicketSummary {
  id: string;
  ticketNumber: string;
  status: string;
  ticketType: string;
  jobType: string;
  issueDescription: string;
  workPerformed?: string | null;
  createdAt: string;
  completedAt?: string | null;
  itemsTotal: number;
  visitChargeAmount: number;
  discountAmount: number;
  totalCost: number;
}

export interface ContractServiceHistory {
  ticketCount: number;
  completedCount: number;
  totalServiceCost: number;
  tickets: ContractTicketSummary[];
}

export interface ContractCustomerInfo {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

export interface ServiceContract {
  id: string;
  productId: string;
  customerId: string;
  branchId?: string | null;
  /** Machine details resolved server-side (works for external machines too). */
  machine?: ContractMachineInfo | null;
  customer?: ContractCustomerInfo | null;
  contractType: ServiceContractType;
  startDate: string;
  endDate: string;
  contractValue: number;
  /** AMC lump-sum invoice raised in billing at signing; null until an AMC contract is saved. */
  invoiceId?: string | null;
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
  /** FSMA only — next date the monthly billing job will generate a bill. */
  nextBillingDate?: string | null;
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

export interface ServiceContractDetail extends ServiceContract {
  readings: ContractMeterReading[];
  totalBilled: number;
  serviceHistory: ContractServiceHistory;
}

export const getServiceContractById = async (id: string): Promise<ServiceContractDetail> => {
  const response = await api.get(`/i/service/contracts/${id}`);
  return response.data.data;
};

export interface ContractInitialPayment {
  amount: number;
  paymentMode: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'CREDIT_CARD';
  paymentDate?: string;
  referenceNumber?: string;
  remarks?: string;
}

export const createServiceContract = async (
  data: Partial<ServiceContract> & { initialPayment?: ContractInitialPayment },
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

/** One monthly bill the FSMA billing job generated for a contract. */
export interface ContractBill {
  invoiceId: string;
  amount: number;
  periodStart: string | null;
  periodEnd: string | null;
  billedAt: string | null;
  invoiceNumber: string | null;
  status: string | null;
  emailSentAt: string | null;
  totalAmount: number | null;
}

export const getContractBills = async (contractId: string): Promise<ContractBill[]> => {
  const response = await api.get(`/i/service/contracts/${contractId}/bills`);
  return response.data.data;
};

/** Emails an already-generated bill (or any invoice) to the customer. */
export const sendInvoiceEmail = async (
  invoiceId: string,
  data: { recipient: string; subject: string; body: string },
): Promise<void> => {
  await api.post(`/b/invoices/${invoiceId}/notify/email`, data);
};
