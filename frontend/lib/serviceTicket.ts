import api from './api';
import { ServiceContract } from './serviceContract';

export interface ServiceTicketItem {
  id?: string;
  itemSource: 'SPARE_PART' | 'CUSTOM';
  sparePartId?: string;
  sku?: string;
  barcodeId?: string;
  customPartName?: string;
  customPartBrand?: string;
  customPartDescription?: string;
  partName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  isFree: boolean;
}

export interface ServiceTicket {
  id: string;
  ticketNumber: string;
  customerId?: string;
  leadId?: string;
  productId?: string;
  productBrand?: string;
  productModel?: string;
  productName?: string;
  serialNumber?: string;
  serviceContext: string;
  contractReferenceId?: string;
  issueDescription: string;
  jobType: string;
  status: string;
  scheduledVisitDate?: string;
  assignedTechnicianId?: string;
  diagnosisNotes?: string;
  serviceQuotationId?: string;
  completionNotes?: string;
  completedAt?: string;
  created_at: string;
  updated_at: string;
  diagnosisStartedAt?: string;
  repairStartedAt?: string;
  items: ServiceTicketItem[];
}

export const getServiceTickets = async (): Promise<ServiceTicket[]> => {
  const response = await api.get('/i/service/tickets');
  return response.data.data;
};

export const getServiceTicketById = async (id: string): Promise<ServiceTicket> => {
  const response = await api.get(`/i/service/tickets/${id}`);
  return response.data.data;
};

export const createServiceTicket = async (data: Partial<ServiceTicket>): Promise<ServiceTicket> => {
  const response = await api.post('/i/service/tickets', data);
  return response.data.data;
};

export const assignTechnician = async (
  id: string,
  assignedTechnicianId: string,
  scheduledVisitDate?: string,
): Promise<ServiceTicket> => {
  const response = await api.post(`/i/service/tickets/${id}/assign`, {
    assignedTechnicianId,
    scheduledVisitDate,
  });
  return response.data.data;
};

export const diagnoseServiceTicket = async (
  id: string,
  payload: {
    problemFound: string;
    rootCause: string;
    technicianNotes: string;
    meterReading: number;
    items: Partial<ServiceTicketItem>[];
  },
): Promise<ServiceTicket> => {
  const response = await api.post(`/i/service/tickets/${id}/diagnose`, payload);
  return response.data.data;
};

export const submitServiceQuotation = async (
  id: string,
  laborCost: number,
): Promise<ServiceTicket> => {
  const response = await api.post(`/i/service/tickets/${id}/quote`, { laborCost });
  return response.data.data;
};

export const approveServiceQuotation = async (id: string): Promise<ServiceTicket> => {
  const response = await api.post(`/i/service/tickets/${id}/customer-approve`);
  return response.data.data;
};

export const rejectServiceQuotation = async (id: string): Promise<ServiceTicket> => {
  const response = await api.post(`/i/service/tickets/${id}/customer-reject`);
  return response.data.data;
};

export const startServiceTicket = async (id: string): Promise<ServiceTicket> => {
  const response = await api.post(`/i/service/tickets/${id}/start`);
  return response.data.data;
};

export const completeServiceTicket = async (
  id: string,
  payload: {
    workPerformed: string;
    resolutionDetails: string;
    meterReading: number;
    customerRemarks?: string;
    technicianRemarks?: string;
    customerSignature?: string;
    technicianSignature?: string;
  },
): Promise<ServiceTicket> => {
  const response = await api.post(`/i/service/tickets/${id}/complete`, payload);
  return response.data.data;
};

export const cancelServiceTicket = async (id: string): Promise<ServiceTicket> => {
  const response = await api.post(`/i/service/tickets/${id}/cancel`);
  return response.data.data;
};

export interface ServiceTechnicianInfo {
  id: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  email: string;
  employeeJob: string;
}

export interface AssignedProduct {
  id: string;
  name: string;
  serial_no: string;
  ownership?: string;
  warranty_end_date?: string;
  brand?: string;
  meter_reading?: number;
}

export interface CustomerServiceHistory {
  tickets: ServiceTicket[];
  billingHistory: Record<string, unknown[]> | null;
  assignedProducts?: AssignedProduct[];
}

export const getTechnicians = async (): Promise<ServiceTechnicianInfo[]> => {
  const response = await api.get('/i/service/technicians');
  return response.data.data;
};

export const getCustomerServiceHistory = async (
  customerId: string,
): Promise<CustomerServiceHistory> => {
  const response = await api.get(`/i/service/customers/${customerId}/history`);
  return response.data.data;
};

// NEW ERP SERVICE MANAGEMENT MODULE ENDPOINTS

export const startDiagnosis = async (id: string): Promise<ServiceTicket> => {
  const response = await api.post(`/i/service/tickets/${id}/start-diagnosis`);
  return response.data.data;
};

export const startRepair = async (id: string): Promise<ServiceTicket> => {
  const response = await api.post(`/i/service/tickets/${id}/start-repair`);
  return response.data.data;
};

export interface ServiceEstimateItem {
  id?: string;
  itemSource: 'SPARE_PART' | 'CUSTOM';
  sparePartId?: string;
  sku?: string;
  partName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  isFree: boolean;
  isApproved: boolean;
}

export interface ServiceEstimate {
  id: string;
  ticketId: string;
  labourCost: number;
  partsCost?: number;
  totalCost: number;
  status: string;
  version: number;
  items: ServiceEstimateItem[];
  created_at: string;
}

export interface ServiceEstimateRevision {
  id: string;
  estimateId: string;
  ticketId: string;
  version: number;
  labourCost: number;
  partsCost?: number;
  totalCost: number;
  status: string;
  items: ServiceEstimateItem[];
  created_at: string;
}

export const getTicketEstimates = async (
  id: string,
): Promise<{ estimates: ServiceEstimate[]; revisions: ServiceEstimateRevision[] }> => {
  const response = await api.get(`/i/service/tickets/${id}/estimates`);
  return response.data.data;
};

export const createServiceEstimate = async (
  id: string,
  labourCost: number,
  items: Partial<ServiceEstimateItem>[],
): Promise<ServiceEstimate> => {
  const response = await api.post(`/i/service/tickets/${id}/estimates`, { labourCost, items });
  return response.data.data;
};

export const submitEstimateForApproval = async (id: string): Promise<ServiceEstimate> => {
  const response = await api.post(`/i/service/tickets/${id}/estimates/submit`);
  return response.data.data;
};

export const approveEstimateFinance = async (estimateId: string): Promise<ServiceEstimate> => {
  const response = await api.post(`/i/service/estimates/${estimateId}/approve-finance`);
  return response.data.data;
};

export const rejectEstimateFinance = async (
  estimateId: string,
  remarks?: string,
): Promise<ServiceEstimate> => {
  const response = await api.post(`/i/service/estimates/${estimateId}/reject-finance`, { remarks });
  return response.data.data;
};

export const approveEstimateCustomer = async (estimateId: string): Promise<ServiceEstimate> => {
  const response = await api.post(`/i/service/estimates/${estimateId}/approve-customer`);
  return response.data.data;
};

export const rejectEstimateCustomer = async (estimateId: string): Promise<ServiceEstimate> => {
  const response = await api.post(`/i/service/estimates/${estimateId}/reject-customer`);
  return response.data.data;
};

export const createEstimateRevision = async (
  id: string,
  labourCost: number,
  items: Partial<ServiceEstimateItem>[],
): Promise<ServiceEstimateRevision> => {
  const response = await api.post(`/i/service/tickets/${id}/estimates/revisions`, {
    labourCost,
    items,
  });
  return response.data.data;
};

export const approveRevisionFinance = async (
  revisionId: string,
): Promise<ServiceEstimateRevision> => {
  const response = await api.post(`/i/service/estimates/revisions/${revisionId}/approve-finance`);
  return response.data.data;
};

export const approveRevisionCustomer = async (
  revisionId: string,
): Promise<ServiceEstimateRevision> => {
  const response = await api.post(`/i/service/estimates/revisions/${revisionId}/approve-customer`);
  return response.data.data;
};

export interface MachineLifetimeCost {
  totalTicketsCount: number;
  totalPartsCost: number;
  totalConsumablesCost: number;
  totalLabourCost: number;
  lifetimeCost: number;
  history: unknown[];
}

export const getMachineLifetimeCost = async (
  serialNumber: string,
): Promise<MachineLifetimeCost> => {
  const response = await api.get(`/i/service/machines/${serialNumber}/lifetime-cost`);
  return response.data.data;
};

export interface ConsumableYieldHistory {
  id: string;
  productId: string;
  serialNumber: string;
  tonerSku: string;
  installedDate: string;
  installedMeterReading: number;
  replacedDate?: string;
  replacedMeterReading?: number;
  yieldPages?: number;
  ticketId: string;
}

export const getMachineYieldHistory = async (
  serialNumber: string,
): Promise<ConsumableYieldHistory[]> => {
  const response = await api.get(`/i/service/machines/${serialNumber}/yield-history`);
  return response.data.data;
};

export interface ServiceFinanceDashboard {
  totalRevenue: number;
  totalPartsCost: number;
  totalConsumablesCost: number;
  totalLaborCost: number;
  netServiceMargin: number;
}

export const getServiceFinanceDashboard = async (params?: {
  branchId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<ServiceFinanceDashboard> => {
  const response = await api.get(`/i/service/finance/dashboard`, { params });
  return response.data.data;
};

export interface TechnicianPerformance {
  totalTicketsResolved: number;
  mttd: number;
  mttr: number;
  firstTimeFixRate: number;
}

export const getTechnicianPerformance = async (
  technicianId: string,
): Promise<TechnicianPerformance> => {
  const response = await api.get(`/i/service/technicians/${technicianId}/performance`);
  return response.data.data;
};

export const markSparePartDamaged = async (id: string, quantity: number): Promise<unknown> => {
  const response = await api.post(`/i/service/spare-parts/${id}/mark-damaged`, { quantity });
  return response.data.data;
};

export const getMachineContext = async (
  serialNumber: string,
): Promise<{
  serviceContext: string;
  contractReferenceId: string | null;
  productId: string | null;
  coverage: {
    labour: boolean;
    consumables: boolean;
    travel: boolean;
  };
  contract: ServiceContract | null;
}> => {
  const response = await api.get(`/i/service/machines/${serialNumber}/context`);
  return response.data.data;
};
