type Vendor = {
  id: string;
  name: string;
  email: string;
};

export type APInvoiceStatus = 'Draft' | 'Pending_Approval' | 'Approved' | 'Posted' | 'Paid';

export type ApiInvoiceLine = {
  id: string;
  description: string;
  quantity?: number;
  unitPrice: number;
  amount: number;
};

export interface APInvoice {
  id: string;
  invoiceNumber: string;
  vendorId: string;
  invoiceDate: string;
  dueDate: string;
  status: APInvoiceStatus;
  totalAmount: number;
  currency: 'AED';
  lines: ApiInvoiceLine[];
  approvedBy?: string;
  approvedOn?: string;
  paidAmount?: number;
  paymentDate?: string;
  paymentMethod?: string;
  //   vendorName: string;
  //   vendorEmail: string;
  //   description: string;
}

export const vendors: Vendor[] = [
  {
    id: 'ven-1',
    // code: "VEND-OEM-HP",
    name: 'HP Middle East FZ LLC',
    email: 'billing@hp.com',
  },
  {
    id: 'ven-2',
    // code: "VEND-SUP-001",
    name: 'Apex Office Supplies',
    email: 'john.doe@apexoffice.com',
  },
];

export const apInvoices: APInvoice[] = [
  {
    id: 'ap-1',
    invoiceNumber: 'HP-ME-INV-90881',
    vendorId: 'ven-1',
    invoiceDate: '2026-01-10',
    dueDate: '2026-02-09',
    status: 'Approved',
    currency: 'AED',
    lines: [
      {
        id: 'l1',
        description: 'HP LaserJet Pro MFP M428 Printers',
        quantity: 5,
        unitPrice: 6200,
        amount: 31000,
      },
    ],
    totalAmount: 31000,
    approvedBy: 'Sarah Connor',
    approvedOn: '2026-01-12',
  },
  {
    id: 'ap-2',
    invoiceNumber: 'APEX-INV-99850',
    vendorId: 'ven-2',
    invoiceDate: '2025-12-10',
    dueDate: '2026-01-09',
    status: 'Paid',
    currency: 'AED',
    lines: [
      {
        id: 'l2',
        description: 'HP 58A Black Toner Cartridge',
        quantity: 10,
        unitPrice: 420,
        amount: 4200,
      },
      {
        id: 'l3',
        description: 'A4 Copier Paper (Boxes)',
        quantity: 5,
        unitPrice: 180,
        amount: 900,
      },
    ],
    totalAmount: 5100,
    approvedBy: 'Sarah Connor',
    approvedOn: '2025-12-15',
    paidAmount: 5100,
    paymentDate: '2026-01-05',
    paymentMethod: 'Bank Transfer',
  },
  {
    id: 'ap-3',
    invoiceNumber: 'APEX-INV-99850',
    vendorId: 'ven-2',
    invoiceDate: '2025-12-10',
    dueDate: '2026-01-09',
    status: 'Draft',
    currency: 'AED',
    lines: [
      {
        id: 'l2',
        description: 'HP 58A Black Toner Cartridge',
        quantity: 10,
        unitPrice: 420,
        amount: 4200,
      },
      {
        id: 'l3',
        description: 'A4 Copier Paper (Boxes)',
        quantity: 5,
        unitPrice: 180,
        amount: 900,
      },
    ],
    totalAmount: 5100,
    approvedBy: 'Sarah Connor',
    approvedOn: '2025-12-15',
    paidAmount: 5100,
    paymentDate: '2026-01-05',
    paymentMethod: 'Bank Transfer',
  },
];
