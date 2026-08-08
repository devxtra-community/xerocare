import api from './api';

export interface CustomerBankAccount {
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  accountType?: 'Savings Account' | 'Current Account' | 'Business Account';
  routingNumber?: string;
  swiftCode?: string;
  /** Country-correct bank identifier: IFSC (India), IBAN (ISO 13616 countries),
   * or a generic bank code elsewhere — see lib/bankCodeType.ts. Field name kept
   * as `iban` for storage continuity with existing data. */
  iban?: string;
  address?: string;
  branch?: string;
  /** ISO2 country of the BANK itself — independent of the customer's own
   * country field above (a customer may bank in a different country than
   * they reside/operate in). Defaults to the customer's own country but is
   * independently changeable. Drives the Bank/Branch dropdowns, the
   * country-correct code field, and the default currency below. */
  bankCountry?: string;
  /** Currency this account is held/paid in — may differ from the branch's local
   * currency (e.g. a customer paying in USD for a purchase made in a SAR branch). */
  currency?: string;
  isPrimary?: boolean;
}

export type CustomerVatStatus = 'REGISTERED' | 'UNREGISTERED_STANDARD' | 'EXEMPT';

export type CustomerType = 'B2B' | 'B2C';

export type CustomerExemptionReason =
  | 'GOVERNMENT_ORGANIZATION'
  | 'EMBASSY_OR_DIPLOMATIC_MISSION'
  | 'INTERNATIONAL_ORGANIZATION'
  | 'CHARITY_OR_NON_PROFIT'
  | 'EDUCATIONAL_OR_HEALTHCARE_INSTITUTION'
  | 'VALID_VAT_EXEMPTION_CERTIFICATE';

export const CUSTOMER_EXEMPTION_REASON_LABELS: Record<CustomerExemptionReason, string> = {
  GOVERNMENT_ORGANIZATION: 'Government Organization',
  EMBASSY_OR_DIPLOMATIC_MISSION: 'Embassy or Diplomatic Mission',
  INTERNATIONAL_ORGANIZATION: 'International Organization',
  CHARITY_OR_NON_PROFIT: 'Charity or Non-Profit Organization',
  EDUCATIONAL_OR_HEALTHCARE_INSTITUTION: 'Educational or Healthcare Institution',
  VALID_VAT_EXEMPTION_CERTIFICATE: 'Customer with a Valid VAT Exemption Certificate',
};

export const CUSTOMER_VAT_STATUS_LABELS: Record<CustomerVatStatus, string> = {
  REGISTERED: 'Registered',
  UNREGISTERED_STANDARD: 'Unregistered (Standard VAT applies)',
  EXEMPT: 'Unregistered — Exempt',
};

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  branch_id?: string;
  location?: string;
  vatNumber?: string | null;
  /** Defaults to UNREGISTERED_STANDARD server-side — standard VAT applies unless
   * explicitly EXEMPT. Only EXEMPT zeroes tax on this customer's invoices. */
  vatStatus?: CustomerVatStatus;
  /** Defaults to B2C server-side. Drives the default transaction type on quotation
   * forms — B2B uses wholesale_price, B2C uses sale_price/base_price. Always
   * overridable per-quotation without changing this stored default. */
  customerType?: CustomerType;
  /** Internal-only (see exemptionReason on Invoice docs) — required when
   * vatStatus is EXEMPT, never shown on a customer-facing document. */
  exemptionReason?: CustomerExemptionReason | null;
  country?: string | null;
  stateProvince?: string | null;
  city?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankAccounts?: CustomerBankAccount[] | null;

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

/**
 * Retrieves a list of all customers from the CRM service.
 * @returns Array of Customer objects
 */
export const getCustomers = async (): Promise<Customer[]> => {
  const response = await api.get<CustomerResponse>('/c/customers');
  return response.data.data;
};

/**
 * Retrieves full details for a specific customer by ID.
 * @param id The ID of the customer to retrieve
 */
export const getCustomerById = async (id: string): Promise<Customer> => {
  const response = await api.get<SingleCustomerResponse>(`/c/customers/${id}`);
  return response.data.data;
};

export interface CreateCustomerData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  source?: string;
  totalPurchase?: number;
  status?: 'ACTIVE' | 'INACTIVE';
  vatNumber?: string;
  vatStatus?: CustomerVatStatus;
  exemptionReason?: CustomerExemptionReason | null;
  customerType?: CustomerType;
  country?: string;
  stateProvince?: string;
  city?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccounts?: CustomerBankAccount[];
}

/**
 * Creates a new customer record.
 * @param data Customer creation data
 */
export const createCustomer = async (data: CreateCustomerData): Promise<Customer> => {
  const response = await api.post<SingleCustomerResponse>('/c/customers', data);
  return response.data.data;
};

/**
 * Updates an existing customer's information.
 * @param id The ID of the customer
 * @param data Partial customer data for update
 */
export const updateCustomer = async (
  id: string,
  data: Partial<CreateCustomerData>,
): Promise<Customer> => {
  const response = await api.put<SingleCustomerResponse>(`/c/customers/${id}`, data);
  return response.data.data;
};

/**
 * Deletes a customer record from the system.
 * @param id The ID of the customer to delete
 */
export const deleteCustomer = async (id: string): Promise<void> => {
  await api.delete(`/c/customers/${id}`);
};
