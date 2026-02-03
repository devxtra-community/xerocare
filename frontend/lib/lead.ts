import api from './api';

export interface Lead {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
  source?: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  metadata?: Record<string, unknown>;
  customerId?: string;
  isCustomer?: boolean;
  assignedTo?: string;
  createdBy?: string;
  convertedBy?: string;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateLeadData {
  name: string;
  email?: string;
  phone?: string;
  source?: string;
  status?: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  metadata?: Record<string, unknown>;
}

export interface LeadResponse {
  success: boolean;
  data: Lead[];
}

export interface SingleLeadResponse {
  success: boolean;
  data: Lead;
}

export interface ConvertLeadResponse {
  success: boolean;
  data: {
    customerId: string;
  };
}

export const getLeads = async (includeDeleted: boolean = false): Promise<Lead[]> => {
  const response = await api.get<LeadResponse>('/c/leads', {
    params: { includeDeleted },
  });
  return response.data.data;
};

export const getLeadById = async (id: string): Promise<Lead> => {
  const response = await api.get<SingleLeadResponse>(`/c/leads/${id}`);
  return response.data.data;
};

export const createLead = async (data: CreateLeadData): Promise<Lead> => {
  const response = await api.post<SingleLeadResponse>('/c/leads', data);
  return response.data.data;
};

export const convertLead = async (
  id: string,
  payload?: { name?: string; email?: string; phone?: string },
): Promise<string> => {
  const response = await api.post<ConvertLeadResponse>(`/c/leads/${id}/convert`, payload);
  return response.data.data.customerId;
};

export const updateLead = async (id: string, data: Partial<CreateLeadData>): Promise<Lead> => {
  const response = await api.put<SingleLeadResponse>(`/c/leads/${id}`, data);
  return response.data.data;
};

export const deleteLead = async (id: string): Promise<void> => {
  await api.delete(`/c/leads/${id}`);
};
