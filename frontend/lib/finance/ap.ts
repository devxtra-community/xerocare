// Accounts Payable types and mock data

export type APInvoiceStatus = 'Paid' | 'Posted' | 'Draft' | 'Pending_Approval' | 'Approved';

export interface APInvoice {
  id: string;
  invoiceNumber: string;
  vendorId: string;
  dueDate: string;
  totalAmount: number;
  currency: string;
  status: APInvoiceStatus;
}

export interface Vendor {
  id: string;
  name: string;
}

// Mock data
export const vendors: Vendor[] = [
  { id: '1', name: 'Vendor A' },
  { id: '2', name: 'Vendor B' },
  { id: '3', name: 'Vendor C' },
];

export const apInvoices: APInvoice[] = [
  {
    id: '1',
    invoiceNumber: 'INV-001',
    vendorId: '1',
    dueDate: '2026-01-25',
    totalAmount: 5000,
    currency: 'USD',
    status: 'Posted',
  },
  {
    id: '2',
    invoiceNumber: 'INV-002',
    vendorId: '2',
    dueDate: '2026-01-30',
    totalAmount: 3000,
    currency: 'USD',
    status: 'Posted',
  },
];
