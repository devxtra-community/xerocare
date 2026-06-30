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

// Derives payment records from invoice paidAmount — no bulk payment endpoint exists in billing service
export async function fetchPayments(params?: {
  branchId?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<PaymentRecord[]> {
  const res = await api.get('/b/invoices');
  const invoices: InvoiceSummary[] = res.data?.data ?? res.data ?? [];
  return invoices
    .filter((inv) => (inv.paidAmount ?? 0) > 0)
    .filter((inv) => {
      if (!params?.fromDate && !params?.toDate) return true;
      const d = inv.createdAt?.slice(0, 10) ?? '';
      return (!params.fromDate || d >= params.fromDate) && (!params.toDate || d <= params.toDate);
    })
    .map((inv) => ({
      id: inv.id,
      invoiceId: inv.id,
      amount: inv.paidAmount ?? 0,
      method: 'BANK_TRANSFER',
      paymentDate: inv.dueDate ?? inv.createdAt,
      currency: inv.currency,
      branchId: inv.branchId,
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
  vendorId: string;
  vendorName: string;
  totalCost: number;
  labour: number;
  shipping: number;
  handling: number;
  currency: string;
  branchId: string;
  createdAt: string;
  status?: string;
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
