export enum BillingEventType {
  INVOICE_CREATED = 'billing.invoice.created',
  INVOICE_PAID = 'billing.invoice.paid',
}

export interface InvoiceCreatedEvent {
  invoiceId: string;
  branchId: string;
  totalAmount: number;
  createdBy: string;
  createdAt: string;
}

export interface InvoicePaidEvent {
  invoiceId: string;
  paidAt: string;
  paymentMethod: string;
}
