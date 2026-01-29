import { chartOfAccounts, GLPostingPreview, GLPreviewLine } from './finance';

/* ---------------- PRODUCT ---------------- */
export type ProductMode = 'Sell' | 'Lease' | 'Rent';

export type Product = {
  id: string;
  code: string;
  name: string;
  category?: string;
  hsn?: string;

  mode: ProductMode;

  salePrice?: number;
  purchasePrice?: number;

  leaseRate?: number; // per month
  rentRate?: number; // per day

  incomeAccountId: string; // Sales / Lease / Rent income
  expenseAccountId?: string; // COGS (future)
  inventoryAccountId?: string; // Stock asset

  openingStockQty?: number;
  minStockQty?: number;
};

export const products: Product[] = [
  {
    id: 'prod-1',
    code: 'PRN-SELL-HP-M428',
    name: 'HP LaserJet Pro MFP M428',
    category: 'Printer',
    mode: 'Sell',
    salePrice: 8500,
    incomeAccountId: '5',
  },
  {
    id: 'prod-2',
    code: 'PRN-LEASE-KYO-3500',
    name: 'Kyocera TASKalfa 3500i',
    category: 'Printer',
    mode: 'Lease',
    leaseRate: 1200, // per month
    incomeAccountId: '5',
  },
  {
    id: 'prod-3',
    code: 'PRN-RENT-CAN-ADV',
    name: 'Canon ADVANCE C5535',
    category: 'Printer',
    mode: 'Rent',
    rentRate: 90, // per day
    incomeAccountId: '5',
  },
  {
    id: 'prod-4',
    code: 'CON-TONER-HP-58A',
    name: 'HP 58A Black Toner Cartridge',
    category: 'Consumable',
    mode: 'Sell',
    salePrice: 420,
    incomeAccountId: '5',
  },
];

// **************Payment**************
export type PaymentStatus = 'Draft' | 'Posted';

export type PaymentApplication = {
  invoiceId: string;
  appliedAmount: number;
};

export type ARPayment = {
  id: string;
  receiptNo: string;

  customerId: string;
  date: string;

  paymentMethod: 'Cash' | 'Bank' | 'UPI';
  reference?: string;

  amount: number;
  appliedInvoices: PaymentApplication[];

  status: PaymentStatus;
};

// export const arPayments: ARPayment[] = [];

export const arPayments: ARPayment[] = [
  {
    id: 'pay-1',
    receiptNo: 'RCPT-001',
    customerId: 'cust-1',
    date: '2026-01-18',
    paymentMethod: 'Bank',
    reference: 'NEFT-AXIS-001',
    amount: 10000,
    appliedInvoices: [{ invoiceId: 'inv-1', appliedAmount: 10000 }],
    status: 'Posted',
  },
  {
    id: 'pay-2',
    receiptNo: 'RCPT-002',
    customerId: 'cust-2',
    date: '2026-01-22',
    paymentMethod: 'Cash',
    amount: 5000,
    appliedInvoices: [],
    status: 'Draft',
  },
];

export type Customer = {
  id: string;
  name: string;
  email: string;
  creditLimit?: number;
  paymentTerms?: string;
  taxId?: string;
};

/* ---------------- INVOICE ---------------- */

export type InvoiceStatus = 'Draft' | 'Posted' | 'Paid' | 'Partially_Paid' | 'Cancelled';

export type InvoiceLine = {
  id: string;
  productId: string;
  description: string;
  qty?: number; // Sell
  rate: number;
  startDate?: string; // Lease / Rent
  endDate?: string;
  amount: number;
};

export type Invoice = {
  id: string;
  invoiceNumber: string;

  customerId: string; // or vendorId for AP

  issueDate: string;
  dueDate: string;

  currency: 'USD' | 'AED';

  lines: InvoiceLine[];

  totalAmount: number;
  paidAmount: number;
  balanceDue: number;

  status: InvoiceStatus;

  documents?: string[];
};

export const arInvoices: Invoice[] = [
  {
    id: 'ar-1',
    invoiceNumber: 'AR-INV-4002',
    customerId: 'cust-1',
    issueDate: '2026-01-14',
    dueDate: '2026-02-13',
    currency: 'USD',
    lines: [
      {
        id: 'l1',
        productId: 'prod-1',
        description: 'HP LaserJet Enterprise MFP M528f',
        qty: 5,
        rate: 8500,
        amount: 42500,
      },
    ],
    totalAmount: 42500,
    paidAmount: 5000,
    balanceDue: 37500,
    status: 'Partially_Paid',
    documents: ['20260114_Solaris_AR-INV-4002.pdf'],
  },
  {
    id: 'ar-2',
    invoiceNumber: 'AR-INV-4010',
    customerId: 'cust-2',
    issueDate: '2026-01-2',
    dueDate: '2026-02-19',
    currency: 'AED',
    lines: [
      {
        id: 'l2',
        productId: 'prod-3',
        description: 'Canon ImageRunner Advance Lease – Jan 2026',
        rate: 4200,
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        amount: 4200,
      },
    ],
    totalAmount: 4200,
    paidAmount: 0,
    balanceDue: 4200,
    status: 'Posted',
  },
  {
    id: 'ar-3',
    invoiceNumber: 'AR-INV-4019',
    customerId: 'cust-1',
    issueDate: '2025-12-05',
    dueDate: '2026-01-04',
    currency: 'USD',
    lines: [
      {
        id: 'l3',
        productId: 'prod-3',
        description: 'Canon ImageRunner Advance Lease – Jan 2026',
        rate: 1800,
        startDate: '2025-12-10',
        endDate: '2025-12-31',
        amount: 1800,
      },
    ],
    totalAmount: 1800,
    paidAmount: 0,
    balanceDue: 1800,
    status: 'Draft',
  },
  {
    id: 'ar-4',
    invoiceNumber: 'AR-INV-4018',
    customerId: 'cust-2',
    issueDate: '2025-12-06',
    dueDate: '2026-01-06',
    currency: 'AED',
    lines: [
      {
        id: 'l4',
        productId: 'prod-2',
        description: 'Photocopier Rental – Dec 2025',
        rate: 1800,
        startDate: '2025-12-01',
        endDate: '2025-12-31',
        amount: 1800,
      },
    ],
    totalAmount: 1800,
    paidAmount: 1800,
    balanceDue: 0,
    status: 'Paid',
  },
];

export const arCustomers: Customer[] = [
  {
    id: 'cust-1',
    name: 'Solaris Tech Corp',
    email: 'finance@solaristech.com',
    creditLimit: 50000,
    paymentTerms: 'Net 30',
    taxId: '99-8877665',
  },
  {
    id: 'cust-2',
    name: 'Nova Healthcare Ltd',
    email: 'accounts@novahealth.ae',
    creditLimit: 75000,
    paymentTerms: '2/10 Net 30',
  },
  {
    id: 'cust-3',
    name: 'Greenfield International School',
    email: 'accounts@greenfield.edu',
    creditLimit: 30000,
    paymentTerms: 'Net 45',
  },
  {
    id: 'cust-4',
    name: 'Atlas Logistics LLC',
    email: 'finance@atlaslogistics.com',
    creditLimit: 60000,
    paymentTerms: 'Net 30',
  },
];

export function ARPostingPreview(invoice: Invoice): GLPostingPreview {
  const lines: GLPreviewLine[] = [];

  const arAccount = chartOfAccounts.find((a) => a.code === '1100'); //ar
  lines.push({
    accountNumber: arAccount?.code || '',
    accountName: arAccount?.name || '',
    debit: invoice.totalAmount,
    credit: 0,
  });

  invoice.lines.forEach((line) => {
    const Products = products.find((p) => p.id === line.productId);
    if (!Products) return;

    const arAcc = chartOfAccounts.find((a) => a.id === Products.incomeAccountId);
    if (!arAcc) return;

    lines.push({
      accountNumber: arAcc?.code || '',
      accountName: arAcc?.name || ',',
      debit: 0,
      credit: line.amount,
    });
  });
  return {
    source: 'AR Invoice',
    sourceRef: invoice.invoiceNumber,
    date: invoice.dueDate,
    lines: lines,
    totalCredit: invoice.totalAmount,
    totalDebit: invoice.totalAmount,
  };
}
