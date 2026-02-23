export enum BillingEventType {
  INVOICE_CREATED = 'billing.invoice.created',
  INVOICE_PAID = 'billing.invoice.paid',
  NOTIFICATION_EMAIL = 'notification.email.request',
  NOTIFICATION_WHATSAPP = 'notification.whatsapp.request',
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

export interface NotificationRequestEvent {
  recipient: string; // Email or Phone number
  subject?: string; // For Email
  body: string; // Message content or PDF link
  invoiceId?: string; // Useful for linking
  attachmentUrl?: string; // Link to Invoice PDF
}
