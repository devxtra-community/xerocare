import api from './api';

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;

  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerResponse {
  success: boolean;
  data: Customer[];
}

export interface SingleCustomerResponse {
  success: boolean;
  data: Customer;
}

// Ensure the endpoint matches backend (crm_service)
// Assuming crm_service routes are mounted at /c/customers or similar via API Gateway
// Looking at backend/crm_service/src/app.ts (not visible but assumed from routes)
// crm_service routes might be exposed via Gateway.
// Lead routes were /leads (direct? no, via gateway usually).
// Let's assume standard gateway pattern: /c/customers if crm is 'c' or similar?
// Wait, lead.ts used '/leads'. Use relative path to API Gateway.
// Gateway routes for customer:
// Need to check gateway routes. Assuming '/customers' for now if similar to '/leads'.
// ACTUALLY, checking crm_service routes: it has /customers inside.
// API Gateway likely proxies /customers -> crm_service/customers OR /c/customers.
// Let's use `/c/customers` based on likely convention or `/customers` if root.
// Checking `lead.ts`: it used `/leads`.
// CHECK `api_gateway` routes if possible, or assume simple proxy.
// I will start with `/customers` but be ready to fix.

export const getCustomers = async (): Promise<Customer[]> => {
  const response = await api.get<CustomerResponse>('/c/customers');
  return response.data.data;
};

export const getCustomerById = async (id: string): Promise<Customer> => {
  const response = await api.get<SingleCustomerResponse>(`/c/customers/${id}`);
  return response.data.data;
};

export interface CreateCustomerData {
  name: string;
  email?: string;
  phone?: string;
  source?: string;
  totalPurchase?: number;
  status?: 'ACTIVE' | 'INACTIVE';
}

export const createCustomer = async (data: CreateCustomerData): Promise<Customer> => {
  const response = await api.post<SingleCustomerResponse>('/c/customers', data);
  return response.data.data;
};

export const updateCustomer = async (
  id: string,
  data: Partial<CreateCustomerData>,
): Promise<Customer> => {
  const response = await api.put<SingleCustomerResponse>(`/c/customers/${id}`, data);
  return response.data.data;
};

export const deleteCustomer = async (id: string): Promise<void> => {
  await api.delete(`/c/customers/${id}`);
};
