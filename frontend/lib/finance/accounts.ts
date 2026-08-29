/**
 * Xerocare Accounts Module — API functions + shared types
 * All data is read from existing backend services via the api axios instance.
 * No new DB tables are created; all calculations happen here on the frontend.
 */

import api from '../api';

// ─────────────────────────────────────────────
// SHARED TYPES
// ─────────────────────────────────────────────

export type AccountGroup = 'ASSETS' | 'LIABILITIES' | 'EQUITY' | 'INCOME' | 'EXPENSES';

export interface ChartAccount {
  code: string;
  name: string;
  group: AccountGroup;
  description: string;
  balance?: number;
}

export const CHART_OF_ACCOUNTS: ChartAccount[] = [
  // ASSETS
  {
    code: '1001',
    name: 'Cash in Hand',
    group: 'ASSETS',
    description: 'Physical cash held at branches',
  },
  { code: '1002', name: 'Cash at Bank', group: 'ASSETS', description: 'Bank account balances' },
  {
    code: '1003',
    name: 'Accounts Receivable',
    group: 'ASSETS',
    description: 'Amounts owed by customers with active invoices',
  },
  {
    code: '1004',
    name: 'Security Deposits Receivable',
    group: 'ASSETS',
    description: 'Deposits paid to third parties',
  },
  {
    code: '1005',
    name: 'Prepaid Expenses',
    group: 'ASSETS',
    description: 'Expenses paid in advance',
  },
  {
    code: '1006',
    name: 'Inventory / Spare Parts Stock',
    group: 'ASSETS',
    description: 'Value of spare parts held in warehouses',
  },
  {
    code: '1007',
    name: 'Printer Equipment / Fixed Assets',
    group: 'ASSETS',
    description: 'Cost of all printers and equipment owned',
  },
  {
    code: '1008',
    name: 'Accumulated Depreciation',
    group: 'ASSETS',
    description: 'Contra-asset: total depreciation charged to date',
  },
  // LIABILITIES
  {
    code: '2001',
    name: 'Accounts Payable',
    group: 'LIABILITIES',
    description: 'Amounts owed to vendors from purchase orders',
  },
  {
    code: '2002',
    name: 'Accrued Expenses',
    group: 'LIABILITIES',
    description: 'Expenses incurred but not yet paid',
  },
  {
    code: '2003',
    name: 'VAT / Tax Payable',
    group: 'LIABILITIES',
    description: 'VAT collected from customers awaiting remittance',
  },
  {
    code: '2004',
    name: 'Security Deposits Received',
    group: 'LIABILITIES',
    description: 'Deposits received from customers (liability until contract end)',
  },
  {
    code: '2005',
    name: 'Deferred Revenue',
    group: 'LIABILITIES',
    description: 'Advance payments received for future service periods',
  },
  // EQUITY
  {
    code: '3001',
    name: "Owner's Capital",
    group: 'EQUITY',
    description: 'Capital contributed by the owner',
  },
  {
    code: '3002',
    name: 'Retained Earnings',
    group: 'EQUITY',
    description: 'Cumulative net profit retained in the business',
  },
  // INCOME
  {
    code: '4001',
    name: 'Rental Revenue',
    group: 'INCOME',
    description: 'Revenue from RENT contract invoices',
  },
  {
    code: '4002',
    name: 'Lease Revenue',
    group: 'INCOME',
    description: 'Revenue from LEASE contract invoices',
  },
  {
    code: '4003',
    name: 'Sales Revenue',
    group: 'INCOME',
    description: 'Revenue from direct sales invoices',
  },
  {
    code: '4004',
    name: 'Service Revenue',
    group: 'INCOME',
    description: 'Revenue from CHARGEABLE service ticket invoices',
  },
  {
    code: '4005',
    name: 'Usage / Copy Revenue',
    group: 'INCOME',
    description: 'Per-page billing from usage records',
  },
  {
    code: '4006',
    name: 'AMC Revenue',
    group: 'INCOME',
    description: 'Annual Maintenance Contract revenue',
  },
  {
    code: '4007',
    name: 'Spare Parts Sales Revenue',
    group: 'INCOME',
    description: 'Revenue from spare parts sold to customers',
  },
  {
    code: '4008',
    name: 'Other Income',
    group: 'INCOME',
    description: 'Non-invoice cash income (e.g. scrap sale) — not tied to any Accounts Receivable',
  },
  {
    code: '4009',
    name: 'Accessories Sales Revenue',
    group: 'INCOME',
    description:
      'Accessory line items (stand, tray, stapler unit…) supplied alongside a machine — billed once, up front, with the first-month advance',
  },
  // EXPENSES
  {
    code: '5001',
    name: 'Cost of Goods Sold',
    group: 'EXPENSES',
    description: 'Spare parts consumed during service jobs',
  },
  {
    code: '5002',
    name: 'Technician Labour Cost',
    group: 'EXPENSES',
    description: 'Labour charges from service estimates',
  },
  {
    code: '5003',
    name: 'Depreciation Expense',
    group: 'EXPENSES',
    description: 'Monthly depreciation on printer equipment',
  },
  {
    code: '5004',
    name: 'Vendor Purchase Cost',
    group: 'EXPENSES',
    description: 'Cost of goods purchased from vendors',
  },
  {
    code: '5005',
    name: 'Shipping & Handling',
    group: 'EXPENSES',
    description: 'Freight and handling charges on purchase orders',
  },
  {
    code: '5006',
    name: 'Employee Salary Expense',
    group: 'EXPENSES',
    description: 'Monthly payroll net salaries',
  },
  {
    code: '5007',
    name: 'Maintenance & Repair Expense',
    group: 'EXPENSES',
    description: 'Internal maintenance and repair costs',
  },
  {
    code: '5008',
    name: 'Office & Admin Expense',
    group: 'EXPENSES',
    description: 'General office and administrative costs',
  },
  {
    code: '5014',
    name: 'Import / Purchase Labour Cost',
    group: 'EXPENSES',
    description:
      'Purchase-side labour (e.g. import/customs-clearance) — distinct from 5002 Technician Labour',
  },
  {
    code: '5015',
    name: 'Customs Duty',
    group: 'EXPENSES',
    description: 'Import customs duty on International purchases, expensed directly',
  },
  {
    code: '5009',
    name: 'Travel Expense',
    group: 'EXPENSES',
    description: 'Employee/business travel costs (expense_entries category TRAVEL)',
  },
  {
    code: '5010',
    name: 'Premises Rent Expense',
    group: 'EXPENSES',
    description: 'Rent paid for branch/office premises (expense_entries category RENT)',
  },
  {
    code: '5011',
    name: 'Utilities Expense',
    group: 'EXPENSES',
    description: 'Electricity, water, internet, etc. (expense_entries category UTILITIES)',
  },
  {
    code: '5012',
    name: 'Marketing Expense',
    group: 'EXPENSES',
    description: 'Advertising and marketing spend (expense_entries category MARKETING)',
  },
  {
    code: '5013',
    name: 'Insurance Expense',
    group: 'EXPENSES',
    description: 'Insurance premiums (expense_entries category INSURANCE)',
  },
];

// ─────────────────────────────────────────────
// INVOICE / BILLING
// ─────────────────────────────────────────────

export interface InvoiceSummary {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  contractType: string;
  saleType: string;
  /** Rent plan type — 'FIXED_LIMIT'|'FIXED_COMBO'|'FIXED_FLAT'|'CPC'|'CPC_COMBO'. Only present when saleType === 'RENT'. */
  rentType?: string | null;
  /** 'EMI'|'FSM'. Only present when saleType === 'LEASE'. */
  leaseType?: string | null;
  status: string;
  totalAmount: number;
  paidAmount: number;
  taxAmount: number;
  currency: string;
  createdAt: string;
  dueDate?: string;
  branchId: string;
}

export interface PaymentRecord {
  id: string;
  invoiceId: string;
  amount: number;
  method: string;
  paymentDate: string;
  currency: string;
  branchId: string;
  /** What generated this cashbook entry — e.g. 'INVOICE_PAYMENT', 'CHEQUE_CLEAR',
   * 'RECEIVABLE_PAYMENT'. Used to know how to interpret sourceId. */
  sourceType?: string;
  /** ID of the record named by sourceType — a PaymentTransaction id for
   * INVOICE_PAYMENT, a Cheque id for CHEQUE_CLEAR, etc. */
  sourceId?: string;
  /** Cheque number, when this receipt came from a cleared cheque. */
  chequeNo?: string;
  description?: string;
  createdBy?: string;
}

export interface UsageRecord {
  id: string;
  invoiceId: string;
  periodStart: string;
  periodEnd: string;
  totalAmount: number;
  currency: string;
  branchId: string;
}

export interface CreditNote {
  id: string;
  creditNoteNo: string;
  invoiceId: string;
  amount: number;
  currency: string;
  createdAt: string;
  branchId: string;
}

// ─────────────────────────────────────────────
// AR — fetch unpaid/partial invoices
// ─────────────────────────────────────────────

export async function fetchARInvoices(params?: {
  branchId?: string;
  contractType?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<InvoiceSummary[]> {
  const res = await api.get('/b/invoices', {
    params: {
      ...params,
      status: 'ACTIVE_CONTRACT,INVOICED,PARTIAL',
    },
  });
  return res.data?.data ?? res.data ?? [];
}

// ─────────────────────────────────────────────
// PAYMENTS — for cash flow + AR
// ─────────────────────────────────────────────

interface CashbookReceipt {
  id: string;
  linkedInvoiceId?: string;
  amount: number;
  paymentMode?: string;
  date: string;
  branchId: string;
  sourceType?: string;
  sourceId?: string;
  chequeNo?: string;
  description?: string;
  createdBy?: string;
}

// Real customer receipts from the cashbook (auto-posted from invoice payments).
export async function fetchPayments(params?: {
  branchId?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<PaymentRecord[]> {
  const res = await api.get('/b/accounts/cashbook', {
    params: {
      entryType: 'RECEIPT',
      fromDate: params?.fromDate,
      toDate: params?.toDate,
      branchId: params?.branchId,
    },
  });
  const entries: CashbookReceipt[] = res.data?.data ?? res.data ?? [];
  return entries.map((e) => ({
    id: e.id,
    invoiceId: e.linkedInvoiceId ?? '',
    amount: Number(e.amount),
    method: e.paymentMode ?? 'CASH',
    sourceType: e.sourceType,
    sourceId: e.sourceId,
    chequeNo: e.chequeNo,
    description: e.description,
    createdBy: e.createdBy,
    paymentDate: e.date,
    currency: '',
    branchId: e.branchId,
  }));
}

// ─────────────────────────────────────────────
// BILLING SUMMARY — Income Statement
// ─────────────────────────────────────────────

export interface BillingRevenueSummary {
  totalSales: number;
  salesByType: Array<{ saleType: string; total: number }>;
  byMonth?: Array<{ month: number; year: number; rent: number; sale: number; lease: number }>;
}

export async function fetchRevenueSummary(params?: {
  year?: number;
  branchId?: string;
}): Promise<BillingRevenueSummary> {
  const res = await api.get('/b/invoices/sales/branch-totals', { params });
  return res.data ?? { totalSales: 0, salesByType: [] };
}

// All invoices regardless of status — for income statement date-range revenue
export async function fetchAllInvoices(): Promise<InvoiceSummary[]> {
  const res = await api.get('/b/invoices');
  return res.data?.data ?? res.data ?? [];
}

// ─────────────────────────────────────────────
// PRODUCTS / ASSETS — Asset Register
// ─────────────────────────────────────────────

export interface ProductAsset {
  id: string;
  serialNumber: string;
  modelName: string;
  brandName: string;
  status: string;
  warehouseName?: string;
  branchId: string;
  createdAt: string;
}

export async function fetchProducts(params?: {
  branchId?: string;
  status?: string;
}): Promise<ProductAsset[]> {
  const res = await api.get('/i/products', { params });
  return res.data?.data ?? res.data ?? [];
}

// ─────────────────────────────────────────────
// SPARE PARTS — Inventory value
// ─────────────────────────────────────────────

export interface SparePart {
  id: string;
  sku: string;
  name: string;
  costPrice: number;
  quantity: number;
  branchId?: string;
}

export async function fetchSpareParts(params?: { branchId?: string }): Promise<SparePart[]> {
  const res = await api.get('/i/spare-parts', { params });
  return res.data?.data ?? res.data ?? [];
}

// ─────────────────────────────────────────────
// VENDORS / PURCHASES — AP + Expense
// ─────────────────────────────────────────────

export interface PurchaseOrder {
  id: string;
  lotId?: string;
  vendorId: string;
  vendor?: { id: string; name: string };
  vendorCountry?: string | null;
  totalAmount: number;
  purchaseAmount?: number;
  documentationFee?: number;
  labourCost?: number;
  shippingCost?: number;
  handlingFee?: number;
  transportationCost?: number;
  groundfieldCost?: number;
  currencyCode?: string;
  branchId: string;
  createdAt: string;
  status?: string;
  paidAmount?: number;
  remainingAmount?: number;
  purchaseCategory?: 'PRODUCT' | 'SPARE_PART' | 'SERVICE' | 'OTHER' | null;
  purchaseOrigin?: string | null;
  taxableAmount?: number | null;
  taxPercent?: number | null;
  taxName?: string | null;
  inputVatAmount?: number | null;
  reverseChargeVatAmount?: number | null;
  customsEntryNo?: string | null;
  customsDuty?: number | null;
  importInvoiceNo?: string | null;
  goodsOrService?: 'GOODS' | 'SERVICE' | null;
  vatClaimable?: boolean;
}

export async function fetchPurchases(params?: {
  branchId?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<PurchaseOrder[]> {
  const res = await api.get('/i/purchases', { params });
  return res.data?.data ?? res.data ?? [];
}

// ─────────────────────────────────────────────
// PAYROLL — Expense
// ─────────────────────────────────────────────

export interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName?: string;
  month: number;
  year: number;
  netSalary: number;
  branchId: string;
}

interface PayrollSummaryItem {
  id: string;
  name?: string;
  salary?: number;
  status?: string;
  paid_date?: string | null;
  payroll_id?: string | null;
}

export async function fetchPayroll(params?: {
  branchId?: string;
  year?: number;
  month?: number;
}): Promise<PayrollRecord[]> {
  const now = new Date();
  const res = await api.get('/e/payroll/summary');
  const records: PayrollSummaryItem[] = res.data?.data ?? res.data ?? [];
  return records.map((r) => ({
    id: r.payroll_id ?? r.id,
    employeeId: r.id,
    employeeName: r.name,
    month: params?.month ?? now.getMonth() + 1,
    year: params?.year ?? now.getFullYear(),
    netSalary: r.salary ?? 0,
    branchId: '',
  }));
}

// ─────────────────────────────────────────────
// OPENING BALANCES
// ─────────────────────────────────────────────

export interface OpeningBalance {
  id: string;
  invoiceId: string;
  amount: number;
  currency: string;
  createdAt: string;
}

export async function fetchOpeningBalances(): Promise<OpeningBalance[]> {
  const res = await api.get('/b/opening-balances');
  return res.data?.data ?? res.data ?? [];
}

// ─────────────────────────────────────────────
// CREDIT NOTES
// ─────────────────────────────────────────────

export async function fetchCreditNotes(params?: {
  branchId?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<CreditNote[]> {
  const res = await api.get('/b/credit-notes', { params });
  return res.data?.data ?? res.data ?? [];
}

// ─────────────────────────────────────────────
// BRANCHES
// ─────────────────────────────────────────────

export interface Branch {
  id: string;
  name: string;
  currency: string;
  taxPercentage: number;
  taxName: string;
  country: string;
  address?: string;
  tax_registration_number?: string;
}

export async function fetchBranches(): Promise<Branch[]> {
  const res = await api.get('/i/branch/');
  return res.data?.data ?? res.data ?? [];
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

export function agingBucket(dueDate: string): string {
  const today = new Date();
  const due = new Date(dueDate);
  const diffDays = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 'Current';
  if (diffDays <= 30) return '1-30 days';
  if (diffDays <= 60) return '31-60 days';
  if (diffDays <= 90) return '61-90 days';
  return '90+ days';
}

export function depreciationStraightLine(params: {
  cost: number;
  salvageRatio?: number;
  usefulLifeMonths?: number;
  monthsElapsed: number;
}): { monthly: number; accumulated: number; netBookValue: number } {
  const { cost, salvageRatio = 0.1, usefulLifeMonths = 60, monthsElapsed } = params;
  const salvage = cost * salvageRatio;
  const depreciable = cost - salvage;
  const monthly = depreciable / usefulLifeMonths;
  const accumulated = Math.min(monthly * monthsElapsed, depreciable);
  const netBookValue = cost - accumulated;
  return { monthly, accumulated, netBookValue };
}

export function getDateRangeForPeriod(
  period: 'month' | 'quarter' | 'year' | 'custom',
  customFrom?: string,
  customTo?: string,
) {
  const now = new Date();
  if (period === 'month') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
  }
  if (period === 'quarter') {
    const q = Math.floor(now.getMonth() / 3);
    const from = new Date(now.getFullYear(), q * 3, 1);
    const to = new Date(now.getFullYear(), q * 3 + 3, 0);
    return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
  }
  if (period === 'year') {
    return { from: `${now.getFullYear()}-01-01`, to: `${now.getFullYear()}-12-31` };
  }
  return { from: customFrom ?? '', to: customTo ?? '' };
}
