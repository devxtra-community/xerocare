export enum BillingEventType {
  INVOICE_CREATED = 'billing.invoice.created',
  INVOICE_PAID = 'billing.invoice.paid',
  NOTIFICATION_EMAIL = 'notification.email.request',
  NOTIFICATION_WHATSAPP = 'notification.whatsapp.request',
  NOTIFICATION_IN_APP = 'notification.in_app.request',
  CONTRACT_EXPIRING_SOON = 'contract.expiring.soon',
  CONTRACT_EXPIRED = 'contract.expired',
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
  attachments?: { filename: string; content: string; encoding: string }[]; // Base64 Buffer attachments
}

export interface InAppNotificationRequestEvent {
  // Optional — omit (with notifyAdmins: true) for an admin-only broadcast
  // with no specific individual recipient.
  recipientId?: string;
  // Cross-branch/company-wide broadcast to every Admin — resolved on the
  // employee_service consumer side (Admin records live in that service's
  // own DB, not here), so this is the only way billing_service can reach
  // Admin recipients at all.
  notifyAdmins?: boolean;
  title: string;
  message: string;
  type: string;
  referenceId: string;
  referenceType:
    | 'QUOTATION'
    | 'TEMPLATE'
    | 'CONTRACT'
    | 'OPENING_BALANCE'
    | 'TARGET'
    | 'CHEQUE'
    | 'EXPENSE_REQUEST'
    | 'CREDIT_NOTE'
    | 'PURCHASE_PAYMENT';
}
