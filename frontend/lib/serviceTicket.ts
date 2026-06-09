import api from './api';

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
  diagnosisNotes: string,
  items: Partial<ServiceTicketItem>[],
): Promise<ServiceTicket> => {
  const response = await api.post(`/i/service/tickets/${id}/diagnose`, {
    diagnosisNotes,
    items,
  });
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
  completionNotes: string,
): Promise<ServiceTicket> => {
  const response = await api.post(`/i/service/tickets/${id}/complete`, { completionNotes });
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

export interface CustomerServiceHistory {
  tickets: ServiceTicket[];
  billingHistory: Record<string, unknown[]> | null;
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
