export const BILLING_ENDPOINTS = {
  SERVICE_QUOTATION: '/invoices/service-quotation',
  FINANCE_APPROVE: '/invoices/:id/finance-approve-quotation',
  FINANCE_REJECT: '/invoices/:id/finance-reject',
  CONTRACT_BY_SERIAL: '/invoices/contract/serial/:serialNumber',
  CUSTOMER_HISTORY: '/invoices/customer/:customerId/history',
} as const;

export const CRM_ENDPOINTS = {
  LEAD_CONVERT: '/leads/:id/convert',
  CUSTOMER_GET: '/customers/:id',
  LEAD_CREATE: '/leads',
} as const;
