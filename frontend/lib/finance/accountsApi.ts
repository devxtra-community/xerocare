/**
 * Finance Accounts Module — new API functions for cash/bank, expenses, depreciation, receivables, payables.
 * All calls go through /b/accounts (billing_service /accounts route).
 */

import api from '../api';

const BASE = '/b/accounts';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CashBankAccount {
  id: string;
  name: string;
  type: 'CASH' | 'BANK';
  bankName?: string;
  accountNumber?: string;
  iban?: string;
  branchId: string;
  currency: string;
  openingBalance: number;
  currentBalance: number;
  accountType?: 'CURRENT' | 'SAVINGS' | 'FIXED_DEPOSIT';
  openingDate?: string;
  responsiblePersonId?: string;
  contactPerson?: string;
  notes?: string;
  isActive: boolean;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
  // Submission-only (creation time) — a non-zero openingBalance needs a matching Equity
  // entry so it's a documented capital injection rather than money with no origin. Not
  // persisted on the account itself; threaded through to createCashBankAccount, which
  // creates the linked Equity entry of this type. Reuses the same 3 of the 6
  // CREATABLE_EQUITY_TYPES that make sense as a capital-injection source — OTHER is
  // deliberately excluded here since it isn't summed into any Balance Sheet total,
  // unlike OPENING_BALANCE_EQUITY (the "no further categorization" option), which is.
  openingBalanceSource?: 'SHARE_CAPITAL' | 'OWNER_CONTRIBUTION' | 'OPENING_BALANCE_EQUITY';
  ownerId?: string;
  numberOfShares?: number;
  pricePerShare?: number;
  documentUrl?: string;
}

export interface AccountReconciliation {
  id: string;
  accountId: string;
  reconciliationDate: string;
  statementDate: string;
  bookBalance: number;
  statementBalance: number;
  difference: number;
  isBalanced: boolean;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface CashBankTransactionEntry {
  id: string;
  referenceNo: string;
  date: string;
  accountId: string;
  entryType: 'RECEIPT' | 'PAYMENT';
  amount: number;
  category: string;
  description?: string;
  chequeNo?: string;
  notes?: string;
  createdBy: string;
  branchId: string;
  createdAt: string;
  runningBalance: number;
}

export interface CashbookEntry {
  id: string;
  referenceNo: string;
  date: string;
  accountId?: string;
  account?: CashBankAccount;
  entryType: 'RECEIPT' | 'PAYMENT';
  amount: number;
  category: string;
  description?: string;
  linkedInvoiceId?: string;
  linkedPoId?: string;
  linkedExpenseId?: string;
  paymentMode?: string;
  chequeNo?: string;
  notes?: string;
  sourceType?: string;
  sourceId?: string;
  isReversed?: boolean;
  reversedById?: string;
  isPoOrphaned?: boolean | null;
  createdBy: string;
  branchId: string;
  createdAt: string;
}

export interface DayBookDay {
  date: string;
  totalReceipts: number;
  totalPayments: number;
  net: number;
  transactionCount: number;
  entries: CashbookEntry[];
}

export interface DayBook {
  fromDate: string;
  toDate: string;
  days: DayBookDay[];
  totals: {
    totalReceipts: number;
    totalPayments: number;
    net: number;
    transactionCount: number;
  };
}

export interface ExpenseEntry {
  id: string;
  expenseNo: string;
  date: string;
  category: string;
  subCategory?: string;
  description: string;
  branchId: string;
  amount: number;
  vatAmount: number;
  netAmount: number;
  currency: string;
  status: string;
  paidFrom?: string;
  paymentDate?: string;
  paymentMode?: string;
  referenceNo?: string;
  approvedBy?: string;
  receiptUrl?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  isPrepayment?: boolean;
  coveredPeriodStart?: string;
  coveredPeriodEnd?: string;
}

export interface DepreciationBrandRule {
  id: string;
  brandId: string;
  annualDepreciationPct: number;
  usefulLifeMonths: number;
  salvageValuePct: number;
  method: 'STRAIGHT_LINE' | 'DECLINING_BALANCE';
  notes?: string;
  createdAt: string;
}

export interface DepreciationModelRule {
  id: string;
  brandId: string;
  modelId: string;
  annualDepreciationPct: number;
  usefulLifeMonths: number;
  salvageValuePct: number;
  method: 'STRAIGHT_LINE' | 'DECLINING_BALANCE';
  notes?: string;
  createdAt: string;
}

export interface AssetDepreciationRegister {
  id: string;
  productId?: string;
  assetType: 'PRINTER_PRODUCT' | 'MANUAL_ASSET';
  assetCategory: string;
  assetName?: string;
  brandId: string;
  modelId: string;
  branchId: string;
  purchaseDate: string;
  purchasePrice: number;
  annualDepreciationPct: number;
  usefulLifeMonths: number;
  salvageValuePct: number;
  salvageValue: number;
  method: 'STRAIGHT_LINE' | 'DECLINING_BALANCE';
  status: 'ACTIVE' | 'FULLY_DEPRECIATED' | 'DISPOSED' | 'SUSPENDED';
  disposalDate?: string;
  disposalValue?: number;
  notes?: string;
  createdAt: string;
  // computed depreciation fields
  monthlyDep: number;
  accumulated: number;
  nbv: number;
  monthsElapsed: number;
  // enriched product details (only for PRINTER_PRODUCT assets)
  serial_no?: string | null;
  product_status?: string | null;
  brand_name?: string | null;
  model_name?: string | null;
  product_purchase_price?: number | null;
}

export interface DepreciationScheduleRow {
  month: number;
  year: number;
  openingNBV: number;
  monthlyDep: number;
  accumulatedDep: number;
  closingNBV: number;
}

export interface DepreciationJournalEntry {
  id: string;
  periodYear: number;
  periodMonth: number;
  totalAmount: number;
  assetCount?: number;
  branchId: string;
  status: 'PENDING' | 'POSTED';
  postedBy?: string;
  postedAt?: string;
  expenseEntryId?: string;
  createdAt: string;
}

export interface ManualReceivable {
  id: string;
  referenceNo: string;
  type: string;
  customerId?: string;
  customerName?: string;
  description?: string;
  amount: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  amountPaid: number;
  outstanding: number;
  status: string;
  linkedInvoiceId?: string;
  branchId: string;
  notes?: string;
  createdAt: string;
  // computed
  aging: string;
}

export interface ManualPayable {
  id: string;
  referenceNo: string;
  type: string;
  payableTo: string;
  vendorId?: string;
  employeeId?: string;
  description?: string;
  amount: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  amountPaid: number;
  outstanding: number;
  status: string;
  linkedPurchaseId?: string;
  branchId: string;
  notes?: string;
  createdAt: string;
  // computed
  aging: string;
}

// ─── Cash & Bank Accounts ────────────────────────────────────────────────────

export async function fetchCashBankAccounts(params?: {
  branchId?: string;
  branchIds?: string;
  skipErrorToast?: boolean;
}): Promise<CashBankAccount[]> {
  const { skipErrorToast, ...queryParams } = params ?? {};
  const res = await api.get(`${BASE}/cash-bank`, { params: queryParams, skipErrorToast });
  return res.data?.data ?? [];
}

export async function createCashBankAccount(
  data: Partial<CashBankAccount>,
): Promise<CashBankAccount> {
  const res = await api.post(`${BASE}/cash-bank`, data);
  return res.data?.data;
}

export async function updateCashBankAccount(
  id: string,
  data: Partial<CashBankAccount>,
): Promise<CashBankAccount> {
  const res = await api.put(`${BASE}/cash-bank/${id}`, data);
  return res.data?.data;
}

export async function deleteCashBankAccount(id: string): Promise<void> {
  await api.delete(`${BASE}/cash-bank/${id}`);
}

export async function deactivateCashBankAccount(id: string): Promise<void> {
  await api.patch(`${BASE}/cash-bank/${id}/deactivate`);
}

export async function getCashBankSummary(params?: Record<string, string>): Promise<{
  totalCash: number;
  totalBank: number;
  totalCombined: number;
  accountCount: number;
  byCurrency: Record<string, number>;
  byBranch: Record<string, number>;
}> {
  const res = await api.get(`${BASE}/cash-bank/summary`, { params });
  return res.data?.data;
}

export async function depositToCashBank(
  id: string,
  data: {
    date: string;
    amount: number;
    source: string;
    referenceNo?: string;
    description: string;
    notes?: string;
    linkedCashAccountId?: string;
  },
): Promise<CashBankAccount> {
  const res = await api.post(`${BASE}/cash-bank/${id}/deposit`, data);
  return res.data?.data;
}

export async function withdrawFromCashBank(
  id: string,
  data: {
    date: string;
    amount: number;
    purpose: string;
    referenceNo?: string;
    chequeNo?: string;
    description: string;
    notes?: string;
    linkedCashAccountId?: string;
  },
): Promise<CashBankAccount> {
  const res = await api.post(`${BASE}/cash-bank/${id}/withdraw`, data);
  return res.data?.data;
}

export async function transferBetweenAccounts(data: {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: string;
  referenceNo?: string;
  description: string;
  notes?: string;
  exchangeRate?: number;
}): Promise<{ from: CashBankAccount; to: CashBankAccount }> {
  const res = await api.post(`${BASE}/cash-bank/transfer`, data);
  return res.data?.data;
}

export async function getCashBankTransactions(
  id: string,
  params?: {
    fromDate?: string;
    toDate?: string;
    entryType?: string;
    page?: number;
    limit?: number;
  },
): Promise<{
  account: CashBankAccount;
  entries: CashBankTransactionEntry[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}> {
  const res = await api.get(`${BASE}/cash-bank/${id}/transactions`, { params });
  return res.data?.data;
}

export async function reconcileAccount(
  id: string,
  data: {
    reconciliationDate: string;
    statementDate: string;
    statementBalance: number;
    notes?: string;
  },
): Promise<AccountReconciliation> {
  const res = await api.post(`${BASE}/cash-bank/${id}/reconcile`, data);
  return res.data?.data;
}

export async function getReconciliations(id: string): Promise<AccountReconciliation[]> {
  const res = await api.get(`${BASE}/cash-bank/${id}/reconciliations`);
  return res.data?.data ?? [];
}

// ─── Cashbook Entries ────────────────────────────────────────────────────────

export async function fetchCashbookEntries(params?: {
  branchId?: string;
  branchIds?: string;
  accountId?: string;
  fromDate?: string;
  toDate?: string;
  entryType?: string;
}): Promise<CashbookEntry[]> {
  const res = await api.get(`${BASE}/cashbook`, { params });
  return res.data?.data ?? [];
}

export async function createCashbookEntry(data: Partial<CashbookEntry>): Promise<CashbookEntry> {
  const res = await api.post(`${BASE}/cashbook`, data);
  return res.data?.data;
}

export async function reverseCashbookEntry(id: string): Promise<CashbookEntry> {
  const res = await api.post(`${BASE}/cashbook/${id}/reverse`);
  return res.data?.data;
}

export async function fetchOrphanedCashbookEntries(): Promise<{
  data: CashbookEntry[];
  count: number;
}> {
  const res = await api.get<{ success: boolean; data: CashbookEntry[]; count: number }>(
    `${BASE}/admin/orphaned-cashbook`,
  );
  return { data: res.data?.data ?? [], count: res.data?.count ?? 0 };
}

// ─── Day Book ──────────────────────────────────────────────────────────────────

export async function fetchDayBook(params?: {
  fromDate?: string;
  toDate?: string;
  accountId?: string;
  branchId?: string;
  branchIds?: string;
}): Promise<DayBook> {
  const res = await api.get(`${BASE}/daybook`, { params });
  return (
    res.data?.data ?? {
      fromDate: '',
      toDate: '',
      days: [],
      totals: { totalReceipts: 0, totalPayments: 0, net: 0, transactionCount: 0 },
    }
  );
}

// ─── Branch Daily Activity ──────────────────────────────────────────────────
// A broader, non-cash-scoped index of everything that happened in a branch on
// a given day — deliberately separate from Day Book above, whose Total
// Earnings/Expenses/Net Cash figures stay strictly cash-transaction-based.

export interface ActivityEvent {
  id: string;
  type:
    | 'QUOTATION'
    | 'INVOICE'
    | 'PURCHASE'
    | 'SERVICE_TICKET'
    | 'STOCK_TRANSFER'
    | 'CHEQUE'
    | 'EXPENSE'
    | 'EXPENSE_REQUEST'
    | 'CREDIT_NOTE';
  subType: string;
  time: string;
  title: string;
  description?: string;
  amount?: number;
  currency?: string;
  refId: string;
  meta?: Record<string, unknown>;
}

export async function fetchBranchActivity(params?: {
  date?: string;
  branchId?: string;
  branchIds?: string;
}): Promise<{ date: string; events: ActivityEvent[] }> {
  const res = await api.get(`${BASE}/branch-activity`, { params });
  return res.data?.data ?? { date: params?.date ?? '', events: [] };
}

// ─── Expense Entries ─────────────────────────────────────────────────────────

export async function fetchExpenseEntries(params?: {
  branchId?: string;
  branchIds?: string;
  category?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  isPrepayment?: boolean;
}): Promise<ExpenseEntry[]> {
  const res = await api.get(`${BASE}/expenses`, { params });
  return res.data?.data ?? [];
}

export async function createExpenseEntry(data: Partial<ExpenseEntry>): Promise<ExpenseEntry> {
  const res = await api.post(`${BASE}/expenses`, data);
  return res.data?.data;
}

export async function updateExpenseEntry(
  id: string,
  data: Partial<ExpenseEntry>,
): Promise<ExpenseEntry> {
  const res = await api.put(`${BASE}/expenses/${id}`, data);
  return res.data?.data;
}

export async function approveExpenseEntry(id: string): Promise<ExpenseEntry> {
  const res = await api.patch(`${BASE}/expenses/${id}/approve`);
  return res.data?.data;
}

export async function payExpenseEntry(
  id: string,
  data: {
    paidFrom?: string;
    paymentMode?: string;
    paymentDate?: string;
    referenceNo?: string;
    chequeNumber?: string;
    chequeBankName?: string;
    chequeDueDate?: string;
  },
): Promise<ExpenseEntry> {
  const res = await api.patch(`${BASE}/expenses/${id}/pay`, data);
  return res.data?.data;
}

export async function deleteExpenseEntry(id: string): Promise<void> {
  await api.delete(`${BASE}/expenses/${id}`);
}

// ─── Depreciation Brand Rules ─────────────────────────────────────────────────

export async function fetchDepreciationBrandRules(): Promise<DepreciationBrandRule[]> {
  const res = await api.get(`${BASE}/depreciation/brand-rules`);
  return res.data?.data ?? [];
}

export async function upsertDepreciationBrandRule(
  data: Partial<DepreciationBrandRule>,
): Promise<DepreciationBrandRule> {
  const res = await api.post(`${BASE}/depreciation/brand-rules`, data);
  return res.data?.data;
}

export async function deleteDepreciationBrandRule(id: string): Promise<void> {
  await api.delete(`${BASE}/depreciation/brand-rules/${id}`);
}

// ─── Depreciation Model Rules ─────────────────────────────────────────────────

export async function fetchDepreciationModelRules(params?: {
  brandId?: string;
}): Promise<DepreciationModelRule[]> {
  const res = await api.get(`${BASE}/depreciation/model-rules`, { params });
  return res.data?.data ?? [];
}

export async function upsertDepreciationModelRule(
  data: Partial<DepreciationModelRule>,
): Promise<DepreciationModelRule> {
  const res = await api.post(`${BASE}/depreciation/model-rules`, data);
  return res.data?.data;
}

export async function deleteDepreciationModelRule(id: string): Promise<void> {
  await api.delete(`${BASE}/depreciation/model-rules/${id}`);
}

// ─── Asset Depreciation Register ─────────────────────────────────────────────

export async function fetchAssetRegister(params?: {
  branchId?: string;
  branchIds?: string;
  brandId?: string;
  status?: string;
}): Promise<AssetDepreciationRegister[]> {
  const res = await api.get(`${BASE}/depreciation/assets`, { params });
  return res.data?.data ?? [];
}

export async function addAssetToRegister(
  data: Record<string, unknown>,
): Promise<AssetDepreciationRegister> {
  const res = await api.post(`${BASE}/depreciation/assets`, data);
  return res.data?.data;
}

export async function updateAssetInRegister(
  id: string,
  data: Record<string, unknown>,
): Promise<AssetDepreciationRegister> {
  const res = await api.put(`${BASE}/depreciation/assets/${id}`, data);
  return res.data?.data;
}

export async function disposeAsset(
  id: string,
  data: { disposalDate: string; disposalValue: number },
): Promise<AssetDepreciationRegister> {
  const res = await api.patch(`${BASE}/depreciation/assets/${id}/dispose`, data);
  return res.data?.data;
}

export async function fetchDepreciationSchedule(id: string): Promise<DepreciationScheduleRow[]> {
  const res = await api.get(`${BASE}/depreciation/assets/${id}/schedule`);
  return res.data?.data ?? [];
}

// ─── Depreciation Journal ────────────────────────────────────────────────────

export async function fetchDepreciationJournals(params?: {
  branchId?: string;
}): Promise<DepreciationJournalEntry[]> {
  const res = await api.get(`${BASE}/depreciation/journals`, { params });
  return res.data?.data ?? [];
}

export async function postDepreciationJournal(data: {
  periodYear: number;
  periodMonth: number;
  branchId: string;
}): Promise<DepreciationJournalEntry> {
  const res = await api.post(`${BASE}/depreciation/journals/post`, data);
  return res.data?.data;
}

// ─── Manual Receivables ──────────────────────────────────────────────────────

export async function fetchManualReceivables(params?: {
  branchId?: string;
  branchIds?: string;
  type?: string;
  status?: string;
  customerId?: string;
}): Promise<ManualReceivable[]> {
  const res = await api.get(`${BASE}/receivables`, { params });
  return res.data?.data ?? [];
}

export async function createManualReceivable(
  data: Partial<ManualReceivable>,
): Promise<ManualReceivable> {
  const res = await api.post(`${BASE}/receivables`, data);
  return res.data?.data;
}

export async function updateManualReceivable(
  id: string,
  data: Partial<ManualReceivable>,
): Promise<ManualReceivable> {
  const res = await api.put(`${BASE}/receivables/${id}`, data);
  return res.data?.data;
}

export async function recordReceivablePayment(
  id: string,
  data: {
    paymentDate: string;
    amount: number;
    paidToAccount?: string;
    paymentMode?: string;
    referenceNo?: string;
    chequeNumber?: string;
    chequeBankName?: string;
    chequeDueDate?: string;
    chequeDate?: string;
    notes?: string;
  },
): Promise<ManualReceivable> {
  const res = await api.post(`${BASE}/receivables/${id}/payment`, data);
  return res.data?.data;
}

// ─── Manual Payables ─────────────────────────────────────────────────────────

export async function fetchManualPayables(params?: {
  branchId?: string;
  branchIds?: string;
  type?: string;
  status?: string;
  vendorId?: string;
}): Promise<ManualPayable[]> {
  const res = await api.get(`${BASE}/payables`, { params });
  return res.data?.data ?? [];
}

export async function createManualPayable(data: Partial<ManualPayable>): Promise<ManualPayable> {
  const res = await api.post(`${BASE}/payables`, data);
  return res.data?.data;
}

export async function updateManualPayable(
  id: string,
  data: Partial<ManualPayable>,
): Promise<ManualPayable> {
  const res = await api.put(`${BASE}/payables/${id}`, data);
  return res.data?.data;
}

export async function recordPayablePayment(
  id: string,
  data: {
    paymentDate: string;
    amount: number;
    paidFromAccount?: string;
    paymentMode?: string;
    referenceNo?: string;
    notes?: string;
  },
): Promise<ManualPayable> {
  const res = await api.post(`${BASE}/payables/${id}/payment`, data);
  return res.data?.data;
}

// ─── EQUITY ───────────────────────────────────────────────────────────────────

export type EquityType =
  | 'SHARE_CAPITAL'
  | 'RETAINED_EARNINGS'
  | 'RESERVES'
  | 'OWNER_CONTRIBUTION'
  | 'DIVIDEND'
  | 'WITHDRAWAL'
  | 'PROFIT_TRANSFER'
  | 'LOSS_TRANSFER'
  | 'OPENING_BALANCE_EQUITY'
  | 'OTHER';

// The 6 types actually offered on the create form — Retained Earnings,
// Profit Transfer and Loss Transfer stay in EquityType (above) only so
// historical rows of those types keep rendering correctly.
export const CREATABLE_EQUITY_TYPES: EquityType[] = [
  'SHARE_CAPITAL',
  'RESERVES',
  'OWNER_CONTRIBUTION',
  'DIVIDEND',
  'WITHDRAWAL',
  'OTHER',
];

export type EquityReserveSource = 'FROM_RETAINED_EARNINGS' | 'DIRECT_ENTRY';

export interface EquityEntry {
  id: string;
  entryNo: string;
  date: string;
  type: EquityType;
  description: string;
  amount: number;
  currency: string;
  branchId: string;
  referenceNo?: string;
  linkedCashAccountId?: string;
  documentUrl?: string;
  notes?: string;
  // Type-specific fields — see equityEntryEntity.ts for which type(s) use each
  ownerId?: string;
  paymentMode?: string;
  numberOfShares?: number;
  pricePerShare?: number;
  reserveType?: string;
  reserveSource?: EquityReserveSource;
  paymentDate?: string;
  createdBy: string;
  createdAt: string;
}

export interface Owner {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  ownershipPercent?: number;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EquitySummary {
  shareCapital: number;
  retainedEarnings: number;
  reserves: number;
  ownerContribution: number;
  dividends: number;
  netEquity: number;
  totalAssets: number;
  growthLine: { month: string; equity: number }[];
}

export interface EquityStatement {
  year: string;
  opening: { shareCapital: number; retainedEarnings: number; reserves: number; total: number };
  movements: Array<{
    date: string;
    type: string;
    description: string;
    shareCapital: number;
    retainedEarnings: number;
    reserves: number;
    total: number;
  }>;
  closing: { shareCapital: number; retainedEarnings: number; reserves: number; total: number };
}

export interface BalanceSheet {
  assets: {
    cash: number;
    bank: number;
    cashAndBank: number;
    fixedAssetsGross: number;
    accumulatedDepreciation: number;
    fixedAssetsNet: number;
    accountsReceivable: number;
    manualAR?: number;
    invoiceAR?: number;
    securityDepositsReceivable?: number;
    sparePartsInventory?: number;
    inventoryUnavailable?: boolean;
    total: number;
  };
  liabilities: {
    accountsPayable: number;
    accruedExpenses: number;
    vatPayable?: number;
    securityDepositsReceived?: number;
    total: number;
  };
  equity: {
    ownerCapital: number;
    retainedEarnings: number;
    reserves: number;
    dividends: number;
    total: number;
  };
  totalLiabilitiesAndEquity: number;
  difference: number;
  balanced: boolean;
  // flat backward-compat fields
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  cashAndBank: number;
  receivables: number;
  payables: number;
  dataWarnings?: string[];
  currencyWarnings?: string[];
}

export interface ProfitLoss {
  fromDate: string;
  toDate: string;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  margin: number;
  totalTax: number;
  totalIncome: number;
  invoiceCount: number;
  expenseCount: number;
  revenueByType: Record<string, number>;
  expByCategory: Record<string, number>;
  monthly: { month: string; revenue: number; income?: number; expenses: number; net: number }[];
  dataWarnings?: string[];
  currencyWarnings?: string[];
}

export const fetchEquityEntries = (params?: Record<string, string>) =>
  api
    .get<{ success: boolean; data: EquityEntry[] }>(`${BASE}/equity`, { params })
    .then((r) => r.data.data);

export const createEquityEntry = (body: Partial<EquityEntry>) =>
  api
    .post<{ success: boolean; data: EquityEntry }>(`${BASE}/equity`, body)
    .then((r) => r.data.data);

export const updateEquityEntry = (id: string, body: Partial<EquityEntry>) =>
  api
    .patch<{ success: boolean; data: EquityEntry }>(`${BASE}/equity/${id}`, body)
    .then((r) => r.data.data);

export const deleteEquityEntry = (id: string) =>
  api.delete(`${BASE}/equity/${id}`).then((r) => r.data);

export const fetchEquitySummary = (params?: Record<string, string>) =>
  api
    .get<{ success: boolean; data: EquitySummary }>(`${BASE}/equity/summary`, { params })
    .then((r) => r.data.data);

export const fetchEquityStatement = (params?: Record<string, string>) =>
  api
    .get<{ success: boolean; data: EquityStatement }>(`${BASE}/equity/statement`, { params })
    .then((r) => r.data.data);

// ─── OWNERS/SHAREHOLDERS ────────────────────────────────────────────────────

export const fetchOwners = (params?: { includeInactive?: boolean }) =>
  api
    .get<{ success: boolean; data: Owner[] }>(`${BASE}/owners`, {
      params: params?.includeInactive ? { includeInactive: 'true' } : undefined,
    })
    .then((r) => r.data.data);

export const createOwner = (body: Partial<Owner>) =>
  api.post<{ success: boolean; data: Owner }>(`${BASE}/owners`, body).then((r) => r.data.data);

export const updateOwner = (id: string, body: Partial<Owner>) =>
  api
    .patch<{ success: boolean; data: Owner }>(`${BASE}/owners/${id}`, body)
    .then((r) => r.data.data);

export const deactivateOwner = (id: string) =>
  api.delete(`${BASE}/owners/${id}`).then((r) => r.data);

export const fetchBalanceSheet = (params?: Record<string, string>) =>
  api
    .get<{ success: boolean; data: BalanceSheet }>(`${BASE}/balance-sheet`, { params })
    .then((r) => r.data.data);

export const fetchProfitLoss = (params?: Record<string, string>) =>
  api
    .get<{ success: boolean; data: ProfitLoss }>(`${BASE}/profit-loss`, { params })
    .then((r) => r.data.data);

// ─── CHART DATA ───────────────────────────────────────────────────────────────

export const fetchExpenseCharts = (params?: Record<string, string>) =>
  api
    .get<{ success: boolean; data: unknown }>(`${BASE}/expenses/charts`, { params })
    .then((r) => r.data.data);

export const fetchReceivableCharts = (params?: Record<string, string>) =>
  api
    .get<{ success: boolean; data: unknown }>(`${BASE}/receivables/charts`, { params })
    .then((r) => r.data.data);

export const fetchPayableCharts = (params?: Record<string, string>) =>
  api
    .get<{ success: boolean; data: unknown }>(`${BASE}/payables/charts`, { params })
    .then((r) => r.data.data);

export const fetchDepreciationCharts = (params?: Record<string, string>) =>
  api
    .get<{ success: boolean; data: unknown }>(`${BASE}/depreciation/charts`, { params })
    .then((r) => r.data.data);

export const fetchEquityCharts = (params?: Record<string, string>) =>
  api
    .get<{ success: boolean; data: unknown }>(`${BASE}/equity/charts`, { params })
    .then((r) => r.data.data);

// ─── Shared client-side depreciation calc (mirror of backend util) ────────────

export function calcDepreciation(asset: {
  purchasePrice: number;
  salvageValue: number;
  usefulLifeMonths: number;
  annualDepreciationPct: number;
  method: 'STRAIGHT_LINE' | 'DECLINING_BALANCE';
  purchaseDate: string;
}) {
  const asOf = new Date();
  const from = new Date(asset.purchaseDate);
  const y = asOf.getFullYear() - from.getFullYear();
  const m = asOf.getMonth() - from.getMonth();
  const totalMonths = Math.max(0, y * 12 + m);
  const activeMonths = Math.min(totalMonths, asset.usefulLifeMonths);

  if (asset.method === 'STRAIGHT_LINE') {
    const monthlyDep = (asset.purchasePrice - asset.salvageValue) / asset.usefulLifeMonths;
    const accumulated = Math.min(
      monthlyDep * activeMonths,
      asset.purchasePrice - asset.salvageValue,
    );
    const nbv = asset.purchasePrice - accumulated;
    return { monthlyDep, accumulated, nbv, monthsElapsed: activeMonths };
  }

  const monthlyRate = asset.annualDepreciationPct / 100 / 12;
  let nbv = asset.purchasePrice;
  let accumulated = 0;
  for (let i = 0; i < activeMonths; i++) {
    const dep = nbv * monthlyRate;
    if (nbv - dep < asset.salvageValue) break;
    accumulated += dep;
    nbv -= dep;
  }
  const monthlyDep = nbv * monthlyRate;
  return { monthlyDep, accumulated, nbv, monthsElapsed: activeMonths };
}

// ─── CHART OF ACCOUNTS ───────────────────────────────────────────────────────

export interface AccountBalance {
  code: string;
  name: string;
  balance: number;
  currency: string;
  lastUpdated: string;
}

export interface CustomAccountBalance extends AccountBalance {
  id: string;
  parentAccountId: string | null;
  sourceType:
    | 'CASH_BANK_LINKED'
    | 'EXPENSE_CATEGORY_LINKED'
    | 'INCOME_CATEGORY_LINKED'
    | 'MANUAL_JOURNAL';
  category?: string;
  accountGroup?: string;
  isActive: boolean;
}

export interface ChartOfAccountsResponse {
  asOfDate: string;
  periodFrom: string;
  periodTo: string;
  branchIds: string[];
  currency: string;
  warnings: string[];
  assets: {
    currentAssets: {
      cashInHand: AccountBalance;
      cashAtBank: AccountBalance;
      accountsReceivable: AccountBalance;
      securityDepositsReceivable: AccountBalance;
      prepaidExpenses: AccountBalance;
      sparePartsInventory: AccountBalance;
      productInventory: AccountBalance;
      custom: CustomAccountBalance[];
      totalCurrentAssets: number;
    };
    nonCurrentAssets: {
      equipmentGrossCost: AccountBalance;
      accumulatedDepreciation: AccountBalance;
      equipmentNBV: number;
      custom: CustomAccountBalance[];
      totalNonCurrentAssets: number;
    };
    totalAssets: number;
  };
  liabilities: {
    currentLiabilities: {
      accountsPayable: AccountBalance;
      accruedExpenses: AccountBalance;
      vatPayable: AccountBalance;
      securityDepositsReceived: AccountBalance;
      deferredRevenue: AccountBalance;
      salaryPayable: AccountBalance;
      custom: CustomAccountBalance[];
      totalCurrentLiabilities: number;
    };
    nonCurrentLiabilities: { custom: CustomAccountBalance[]; totalNonCurrentLiabilities: number };
    totalLiabilities: number;
  };
  equity: {
    ownerCapital: AccountBalance;
    retainedEarnings: AccountBalance;
    reserves: AccountBalance;
    lessWithdrawals: AccountBalance;
    lessDividends: AccountBalance;
    custom: CustomAccountBalance[];
    totalEquity: number;
  };
  income: {
    rentalRevenue: AccountBalance;
    leaseRevenue: AccountBalance;
    salesRevenue: AccountBalance;
    serviceRevenue: AccountBalance;
    usageRevenue: AccountBalance;
    amcSmaRevenue: AccountBalance;
    sparePartSales: AccountBalance;
    otherIncome: AccountBalance;
    custom: CustomAccountBalance[];
    totalIncome: number;
  };
  expenses: {
    costOfParts: AccountBalance;
    labourCost: AccountBalance;
    depreciation: AccountBalance;
    vendorPurchases: AccountBalance;
    shippingHandling: AccountBalance;
    salaryExpense: AccountBalance;
    travelExpense: AccountBalance;
    rentExpense: AccountBalance;
    utilitiesExpense: AccountBalance;
    marketingExpense: AccountBalance;
    maintenanceExpense: AccountBalance;
    insuranceExpense: AccountBalance;
    otherExpenses: AccountBalance;
    importLabourCost: AccountBalance;
    customsDuty: AccountBalance;
    custom: CustomAccountBalance[];
    totalExpenses: number;
  };
  summary: {
    grossProfit: number;
    netProfit: number;
    accountingEquation: {
      totalAssets: number;
      totalLiabilitiesPlusEquity: number;
      isBalanced: boolean;
      difference: number;
    };
  };
}

export interface ChartOfAccountsParams {
  branchIds?: string[];
  periodFrom?: string;
  periodTo?: string;
}

export const getChartOfAccounts = (params: ChartOfAccountsParams = {}) =>
  api
    .get<{ success: boolean; data: ChartOfAccountsResponse }>(`${BASE}/chart-of-accounts`, {
      params: {
        branchIds: params.branchIds?.join(','),
        periodFrom: params.periodFrom,
        periodTo: params.periodTo,
      },
    })
    .then((r) => r.data.data);

// ─── Chart of Accounts — structure management (ADMIN/FINANCE) ────────────────

export interface ChartOfAccountRow {
  id: string;
  accountNumber: string;
  accountName: string;
  category: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
  accountGroup: string;
  parentAccountId: string | null;
  sourceType:
    | 'SYSTEM'
    | 'CASH_BANK_LINKED'
    | 'EXPENSE_CATEGORY_LINKED'
    | 'INCOME_CATEGORY_LINKED'
    | 'MANUAL_JOURNAL';
  isSystemDefault: boolean;
  linkedCashBankAccountId: string | null;
  categoryKey: string | null;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export const fetchChartOfAccountsStructure = () =>
  api
    .get<{ success: boolean; data: ChartOfAccountRow[] }>(`${BASE}/chart-of-accounts/structure`)
    .then((r) => r.data.data);

export const getNextAccountNumber = (params: { category?: string; parentAccountId?: string }) =>
  api
    .get<{
      success: boolean;
      data: { accountNumber: string };
    }>(`${BASE}/chart-of-accounts/next-number`, { params })
    .then((r) => r.data.data.accountNumber);

export interface CreateChartOfAccountInput {
  accountName: string;
  category?: string;
  accountGroup?: string;
  accountNumber?: string;
  parentAccountId?: string;
  sourceType: string;
  linkedCashBankAccountId?: string;
  categoryKey?: string;
}

export const createChartOfAccount = (data: CreateChartOfAccountInput) =>
  api
    .post<{ success: boolean; data: ChartOfAccountRow }>(`${BASE}/chart-of-accounts`, data)
    .then((r) => r.data.data);

export const renameChartOfAccount = (id: string, accountName: string) =>
  api
    .patch<{ success: boolean; data: ChartOfAccountRow }>(`${BASE}/chart-of-accounts/${id}`, {
      accountName,
    })
    .then((r) => r.data.data);

export const updateChartOfAccount = (
  id: string,
  data: { accountName: string; accountNumber?: string },
) =>
  api
    .patch<{ success: boolean; data: ChartOfAccountRow }>(`${BASE}/chart-of-accounts/${id}`, data)
    .then((r) => r.data.data);

export const setChartOfAccountActive = (id: string, isActive: boolean) =>
  api
    .patch<{
      success: boolean;
      data: ChartOfAccountRow;
    }>(`${BASE}/chart-of-accounts/${id}/active`, { isActive })
    .then((r) => r.data.data);

export const deleteChartOfAccount = (id: string) =>
  api.delete(`${BASE}/chart-of-accounts/${id}`).then((r) => r.data);

// ─── Income Entries (mirrors Expense Entries) ─────────────────────────────────

export interface IncomeEntry {
  id: string;
  incomeNo: string;
  date: string;
  category: string;
  subCategory?: string;
  description: string;
  branchId: string;
  amount: number;
  vatAmount: number;
  netAmount: number;
  currency: string;
  status: 'PENDING' | 'APPROVED' | 'RECEIVED' | 'REJECTED';
  receivedTo?: string;
  receivedDate?: string;
  receivedMode?: string;
  referenceNo?: string;
  approvedBy?: string;
  receiptUrl?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export async function fetchIncomeEntries(params?: {
  category?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<IncomeEntry[]> {
  const res = await api.get(`${BASE}/income`, { params });
  return res.data?.data ?? [];
}

export async function createIncomeEntry(data: Partial<IncomeEntry>): Promise<IncomeEntry> {
  const res = await api.post(`${BASE}/income`, data);
  return res.data?.data;
}

export async function updateIncomeEntry(
  id: string,
  data: Partial<IncomeEntry>,
): Promise<IncomeEntry> {
  const res = await api.put(`${BASE}/income/${id}`, data);
  return res.data?.data;
}

export async function approveIncomeEntry(id: string): Promise<IncomeEntry> {
  const res = await api.patch(`${BASE}/income/${id}/approve`);
  return res.data?.data;
}

export async function receiveIncomeEntry(
  id: string,
  data: {
    receivedTo?: string;
    receivedMode?: string;
    receivedDate?: string;
    referenceNo?: string;
    chequeNumber?: string;
    chequeBankName?: string;
  },
): Promise<IncomeEntry> {
  const res = await api.patch(`${BASE}/income/${id}/receive`, data);
  return res.data?.data;
}

export async function deleteIncomeEntry(id: string): Promise<void> {
  await api.delete(`${BASE}/income/${id}`);
}

export interface IncomeEntryDetail extends IncomeEntry {
  receivedToAccount: { id: string; name: string; type: string } | null;
  cheque: Cheque | null;
}

export async function fetchIncomeEntryDetail(id: string): Promise<IncomeEntryDetail> {
  const res = await api.get(`${BASE}/income/${id}/detail`);
  return res.data?.data;
}

// ─── Manual Journal Entries ────────────────────────────────────────────────────

export interface ManualJournalEntryRow {
  id: string;
  entryNo: string;
  date: string;
  chartOfAccountId: string;
  amount: number;
  description: string;
  branchId: string;
  referenceNo?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export const fetchManualJournalEntries = (params?: { chartOfAccountId?: string }) =>
  api
    .get<{ success: boolean; data: ManualJournalEntryRow[] }>(`${BASE}/manual-journal`, { params })
    .then((r) => r.data.data);

export const createManualJournalEntry = (data: {
  chartOfAccountId: string;
  date: string;
  amount: number;
  description: string;
  referenceNo?: string;
  notes?: string;
}) =>
  api
    .post<{ success: boolean; data: ManualJournalEntryRow }>(`${BASE}/manual-journal`, data)
    .then((r) => r.data.data);

export const reverseManualJournalEntry = (id: string) =>
  api
    .post<{ success: boolean; data: ManualJournalEntryRow }>(`${BASE}/manual-journal/${id}/reverse`)
    .then((r) => r.data.data);

// ─── Revenue Drill-Down (Sale/Rent/Lease sub-category breakdown) ─────────────

export const RENT_PLAN_TYPES = [
  'FIXED_LIMIT',
  'FIXED_COMBO',
  'FIXED_FLAT',
  'CPC',
  'CPC_COMBO',
] as const;
export type RentPlanType = (typeof RENT_PLAN_TYPES)[number];

export const RENT_PLAN_TYPE_LABELS: Record<RentPlanType, string> = {
  FIXED_LIMIT: 'Fixed Rent + Individual Limit',
  FIXED_COMBO: 'Fixed Rent + Combined Limit',
  FIXED_FLAT: 'Fixed Flat Rent (No Limits)',
  CPC: 'CPC (Individual)',
  CPC_COMBO: 'CPC (Combined)',
};

export interface RevenueBreakdown {
  sale: { total: number; productSale: number; sparePartSale: number };
  rent: { total: number; byPlanType: Record<RentPlanType, number> };
  lease: {
    total: number;
    emi: number;
    fsm: { total: number; byPlanType: Record<RentPlanType, number> };
  };
  currencyWarnings: string[];
  periodFrom: string;
  periodTo: string;
  currency: string;
}

export const fetchRevenueBreakdown = (params: {
  periodFrom?: string;
  periodTo?: string;
  branchId?: string;
}) =>
  api
    .get<{ success: boolean; data: RevenueBreakdown }>(`${BASE}/revenue-breakdown`, { params })
    .then((r) => r.data.data);

export interface RevenueTransactionRow {
  id: string;
  rowType: 'INVOICE' | 'ADVANCE' | 'USAGE_PERIOD';
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  date: string;
  amount: number;
  currencyCode: string;
  branchId: string;
  saleType: string;
  rentType: string | null;
  leaseType: string | null;
  rentPeriod: string | null;
  billingPeriodStart: string | null;
  billingPeriodEnd: string | null;
  baseCharge: number | null;
  exceededCharge: number | null;
  meterReadings: {
    bwA4Count: number;
    bwA3Count: number;
    colorA4Count: number;
    colorA3Count: number;
  } | null;
}

export const fetchRevenueTransactions = (params: {
  category: string;
  periodFrom?: string;
  periodTo?: string;
  customerName?: string;
  search?: string;
  amountMin?: string;
  amountMax?: string;
  branchId?: string;
}) =>
  api
    .get<{
      success: boolean;
      data: RevenueTransactionRow[];
    }>(`${BASE}/revenue-breakdown/transactions`, { params })
    .then((r) => r.data.data);

// ─── Line-item drill-downs (Liabilities/Equity lines with no existing API) ────

export interface VatRemittance {
  id: string;
  branchId: string;
  periodFrom: string;
  periodTo: string;
  amountRemitted: number;
  remittedDate: string;
  referenceNo?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export const fetchVatRemittances = () =>
  api
    .get<{ success: boolean; data: VatRemittance[] }>(`${BASE}/vat-remittances`)
    .then((r) => r.data.data);

export interface LineItemFilterParams {
  customerName?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  amountMin?: string;
  amountMax?: string;
  branchId?: string;
  branchIds?: string;
}

export interface OutputVatRow {
  id: string;
  invoiceNumber: string;
  customerName: string;
  date: string;
  amount: number;
  currencyCode: string;
  branchId: string;
}

export const fetchOutputVatTransactions = (params: LineItemFilterParams = {}) =>
  api
    .get<{ success: boolean; data: OutputVatRow[] }>(`${BASE}/line-items/output-vat`, { params })
    .then((r) => r.data.data);

export interface SecurityDepositRow {
  id: string;
  invoiceNumber: string;
  customerName: string;
  date: string;
  amount: number;
  currencyCode: string;
  branchId: string;
  saleType: string;
  depositMode: string | null;
  depositReference: string | null;
  depositDate: string | null;
}

export const fetchSecurityDepositTransactions = (params: LineItemFilterParams = {}) =>
  api
    .get<{ success: boolean; data: SecurityDepositRow[] }>(`${BASE}/line-items/security-deposits`, {
      params,
    })
    .then((r) => r.data.data);

export interface DeferredRevenueRow {
  id: string;
  invoiceNumber: string;
  customerName: string;
  date: string;
  amount: number;
  advanceAmount: number;
  advanceAdjustedSoFar: number;
  currencyCode: string;
  branchId: string;
  saleType: string;
}

export const fetchDeferredRevenueTransactions = (params: LineItemFilterParams = {}) =>
  api
    .get<{ success: boolean; data: DeferredRevenueRow[] }>(`${BASE}/line-items/deferred-revenue`, {
      params,
    })
    .then((r) => r.data.data);

export interface OtherIncomeRow {
  id: string;
  incomeNo: string;
  category: string;
  subCategory: string | null;
  description: string;
  date: string;
  amount: number;
  currencyCode: string;
  branchId: string;
  receivedMode: string | null;
}

export const fetchOtherIncomeTransactions = (params: LineItemFilterParams = {}) =>
  api
    .get<{ success: boolean; data: OtherIncomeRow[] }>(`${BASE}/line-items/other-income`, {
      params,
    })
    .then((r) => r.data.data);

export interface RetainedEarningsMonthRow {
  month: string;
  revenue: number;
  expenses: number;
  netIncome: number;
  cumulative: number;
}

export const fetchRetainedEarningsMonthly = (params: { months?: number; branchId?: string } = {}) =>
  api
    .get<{
      success: boolean;
      data: RetainedEarningsMonthRow[];
      currency: string;
    }>(`${BASE}/line-items/retained-earnings-monthly`, { params })
    .then((r) => r.data);

export interface ReceivableRow {
  id: string;
  invoiceNumber: string;
  customerName: string;
  saleType: string;
  date: string;
  /** Outstanding balance (totalAmount - paid) — 0 for a fully-settled invoice. */
  amount: number;
  totalAmount: number;
  paid: number;
  /** 'OUTSTANDING' | 'PARTIAL' | 'PAID' — derived from amount/paid. */
  status: string;
  currencyCode: string;
  branchId: string;
  aging: string;
  isOpeningEntry?: boolean;
}

export const fetchAccountsReceivableTransactions = (
  params: LineItemFilterParams & { aging?: string; includeSettled?: boolean } = {},
) =>
  api
    .get<{ success: boolean; data: ReceivableRow[] }>(`${BASE}/line-items/accounts-receivable`, {
      params,
    })
    .then((r) => r.data.data);

// ─── Customer Statement of Account ──────────────────────────────────────────

export interface CustomerStatementRow {
  date: string;
  reference: string;
  description: string;
  debit?: number;
  credit?: number;
}

export interface CustomerStatement {
  customerName: string;
  periodFrom: string;
  periodTo: string;
  currency: string;
  openingBalance: number;
  closingBalance: number;
  rows: CustomerStatementRow[];
}

export const fetchCustomerStatement = (params: {
  customerName: string;
  periodFrom?: string;
  periodTo?: string;
  branchId?: string;
  branchIds?: string;
}) =>
  api
    .get<{ success: boolean; data: CustomerStatement }>(`${BASE}/line-items/customer-statement`, {
      params,
    })
    .then((r) => r.data.data);

export interface VendorStatement {
  vendorName: string;
  periodFrom: string;
  periodTo: string;
  currency: string;
  openingBalance: number;
  closingBalance: number;
  rows: CustomerStatementRow[];
}

export const fetchVendorStatement = (params: {
  vendorName: string;
  periodFrom?: string;
  periodTo?: string;
  branchId?: string;
  branchIds?: string;
}) =>
  api
    .get<{ success: boolean; data: VendorStatement }>(`${BASE}/line-items/vendor-statement`, {
      params,
    })
    .then((r) => r.data.data);

export interface AccountStatement {
  accountName: string;
  accountType: string;
  periodFrom: string;
  periodTo: string;
  currency: string;
  openingBalance: number;
  closingBalance: number;
  currentBalance: number;
  rows: CustomerStatementRow[];
}

export const fetchAccountStatement = (params: {
  accountId: string;
  periodFrom?: string;
  periodTo?: string;
  branchId?: string;
  branchIds?: string;
}) =>
  api
    .get<{ success: boolean; data: AccountStatement }>(`${BASE}/line-items/account-statement`, {
      params,
    })
    .then((r) => r.data.data);

// ─── Receivable / Payable row-level "View" drill-down ────────────────────────

export interface PaymentHistoryRow {
  id: string;
  date: string;
  amount: number;
  mode: string | null;
  referenceNumber: string | null;
}

export interface RowChequeInfo {
  id: string;
  chequeNo: string;
  bankName: string | null;
  amount: number;
  dueDate: string;
  status: string;
  type: string;
}

export interface ReceivableRowDetail {
  source: 'INVOICE' | 'MANUAL';
  id: string;
  referenceNo: string;
  saleType: string;
  status: string;
  issueDate: string;
  dueDate: string | null;
  billingPeriodStart: string | null;
  billingPeriodEnd: string | null;
  totalAmount: number;
  paid: number;
  outstanding: number;
  currencyCode: string;
  branchId: string;
  customer: {
    name: string | null;
    vatNumber: string | null;
    country: string | null;
    stateProvince: string | null;
    city: string | null;
    phone: string | null;
    email: string | null;
  };
  paymentHistory: PaymentHistoryRow[];
  cheques: RowChequeInfo[];
}

export const fetchReceivableRowDetail = (type: 'INVOICE' | 'MANUAL', id: string) =>
  api
    .get<{ success: boolean; data: ReceivableRowDetail }>(`${BASE}/line-items/receivable-detail`, {
      params: { type, id },
    })
    .then((r) => r.data.data);

export interface PayableApprovalInfo {
  id: string;
  requestNo: string;
  status: string;
  employeeName: string;
  paymentMode?: string;
  amount: number;
  submittedAt?: string;
  reviewedBy: string | null;
  reviewedAt?: string;
  rejectionReason?: string;
}

export interface PayableRowDetail {
  source: 'PO' | 'MANUAL';
  id: string;
  referenceNo: string;
  category: string | null;
  origin: string | null;
  issueDate: string;
  dueDate: string | null;
  totalAmount: number;
  paid: number;
  outstanding: number;
  currencyCode: string;
  branchId: string;
  vendor: {
    name: string;
    email: string | null;
    phone: string | null;
    contactPerson: string | null;
    vatNumber: string | null;
    country: string | null;
    stateProvince: string | null;
    city: string | null;
    bankAccounts: unknown[];
  } | null;
  paymentHistory: PaymentHistoryRow[];
  cheques: RowChequeInfo[];
  approvals: PayableApprovalInfo[];
}

export const fetchPayableRowDetail = (type: 'PO' | 'MANUAL', id: string) =>
  api
    .get<{ success: boolean; data: PayableRowDetail }>(`${BASE}/line-items/payable-detail`, {
      params: { type, id },
    })
    .then((r) => r.data.data);

// ─── ADMIN CONSOLIDATED API ───────────────────────────────────────────────────

const ADMIN_BASE = '/b/accounts/admin';

export interface ConsolidatedKPIs {
  totalCash: number;
  totalBank: number;
  totalReceivable: number;
  totalPayable: number;
  netProfit: number;
  overdueReceivables: number;
  perBranch: {
    branchId: string;
    cash: number;
    bank: number;
    receivable: number;
    payable: number;
    expenses: number;
    total: number;
  }[];
}

export interface BranchPerformanceRow {
  branchId: string;
  revenue: number;
  expenses: number;
  grossProfit: number;
  netProfit: number;
  marginPct: number;
  receivables: number;
  payables: number;
  cash: number;
  overdueCount: number;
  status: 'HEALTHY' | 'WATCH' | 'ALERT';
}

export interface ExchangeRate {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  setBy: string;
  createdAt: string;
}

export const fetchExchangeRates = () =>
  api
    .get<{ success: boolean; data: ExchangeRate[] }>(`${ADMIN_BASE}/exchange-rates`)
    .then((r) => r.data.data);

export const setExchangeRate = (body: { fromCurrency: string; toCurrency: string; rate: number }) =>
  api
    .post<{ success: boolean; data: ExchangeRate }>(`${ADMIN_BASE}/exchange-rates`, body)
    .then((r) => r.data.data);

export const fetchConsolidatedKPIs = (params?: Record<string, string>) =>
  api
    .get<{
      success: boolean;
      data: ConsolidatedKPIs;
    }>(`${ADMIN_BASE}/consolidated-kpis`, { params })
    .then((r) => r.data.data);

export const fetchBranchPerformance = (params?: Record<string, string>) =>
  api
    .get<{
      success: boolean;
      data: BranchPerformanceRow[];
    }>(`${ADMIN_BASE}/branch-performance`, { params })
    .then((r) => r.data.data);

export const fetchBranchComparison = (params?: Record<string, string>) =>
  api
    .get<{ success: boolean; data: unknown }>(`${ADMIN_BASE}/branch-comparison`, { params })
    .then((r) => r.data.data);

export const fetchConsolidatedPL = (params?: Record<string, string>) =>
  api
    .get<{ success: boolean; data: unknown }>(`${ADMIN_BASE}/consolidated-pl`, { params })
    .then((r) => r.data.data);

export const fetchConsolidatedBalanceSheet = (params?: Record<string, string>) =>
  api
    .get<{
      success: boolean;
      data: unknown;
    }>(`${ADMIN_BASE}/consolidated-balance-sheet`, { params })
    .then((r) => r.data.data);

// ─────────────────────────────────────────────
// CHEQUES
// ─────────────────────────────────────────────

export interface Cheque {
  id: string;
  chequeNo: string;
  bankName?: string;
  partyName: string;
  amount: number;
  dueDate: string;
  /** The date physically written on the cheque — independent of dueDate (a
   * post-dated cheque has chequeDate earlier than dueDate). */
  chequeDate?: string;
  issueDate?: string;
  /** Set when a RECEIVED cheque is deposited. */
  depositDate?: string;
  /** Set when a cheque is marked Cleared — the actual cash-received/paid date. */
  clearedDate?: string;
  type: 'RECEIVED' | 'ISSUED';
  status: 'PENDING' | 'DEPOSITED' | 'CLEARED' | 'BOUNCED' | 'CANCELLED' | 'ISSUED';
  description?: string;
  branchId: string;
  accountId?: string;
  cashbookEntryId?: string;
  sourceType?: string;
  sourceReferenceId?: string;
  sourceLabel?: string;
  invoiceNo?: string;
  /** Transaction type of the source invoice (SALE / PRODUCT_SALE / RENT / LEASE …) */
  saleType?: string | null;
  /** Payment proof (screenshot/PDF) uploaded with the cheque payment, if any */
  receiptUrl?: string | null;
  /** Reason for the most recent BOUNCED/CANCELLED status change, if any. */
  reason?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChequeWithHistory extends Cheque {
  history: {
    id: string;
    fromStatus?: string;
    toStatus: string;
    notes?: string;
    changedBy: string;
    changedAt: string;
  }[];
}

const CHEQUE_BASE = `${BASE}/cheques`;

export const fetchCheques = (params?: {
  status?: string;
  type?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  branchIds?: string;
}) =>
  api.get<{ success: boolean; data: Cheque[] }>(CHEQUE_BASE, { params }).then((r) => r.data.data);

export const fetchChequeSummary = (params?: { branchIds?: string }) =>
  api
    .get<{
      success: boolean;
      data: Record<string, Record<string, { count: number; total: number }>>;
    }>(`${CHEQUE_BASE}/summary`, { params })
    .then((r) => r.data.data);

export const fetchChequeNotifications = () =>
  api
    .get<{ success: boolean; data: Cheque[]; count: number }>(`${CHEQUE_BASE}/notifications`)
    .then((r) => r.data);

export const fetchChequeById = (id: string) =>
  api
    .get<{ success: boolean; data: ChequeWithHistory }>(`${CHEQUE_BASE}/${id}`)
    .then((r) => r.data.data);

export const createCheque = (body: {
  chequeNo: string;
  bankName?: string;
  partyName: string;
  amount: number;
  dueDate: string;
  chequeDate?: string;
  issueDate?: string;
  type: 'RECEIVED' | 'ISSUED';
  description?: string;
  accountId?: string;
  sourceType?: string;
  sourceReferenceId?: string;
  sourceLabel?: string;
  invoiceNo?: string;
}) => api.post<{ success: boolean; data: Cheque }>(CHEQUE_BASE, body).then((r) => r.data.data);

export const updateCheque = (
  id: string,
  body: Partial<
    Pick<
      Cheque,
      | 'chequeNo'
      | 'bankName'
      | 'partyName'
      | 'amount'
      | 'dueDate'
      | 'chequeDate'
      | 'issueDate'
      | 'description'
      | 'accountId'
    >
  >,
) =>
  api
    .patch<{ success: boolean; data: Cheque }>(`${CHEQUE_BASE}/${id}`, body)
    .then((r) => r.data.data);

export const depositCheque = (
  id: string,
  body: { accountId: string; depositDate?: string; notes?: string },
) =>
  api
    .post<{ success: boolean; data: Cheque }>(`${CHEQUE_BASE}/${id}/deposit`, body)
    .then((r) => r.data.data);

export const issueCheque = (
  id: string,
  body: { accountId: string; issueDate?: string; notes?: string },
) =>
  api
    .post<{ success: boolean; data: Cheque }>(`${CHEQUE_BASE}/${id}/issue`, body)
    .then((r) => r.data.data);

export const clearCheque = (id: string, body?: { notes?: string; clearedDate?: string }) =>
  api
    .post<{ success: boolean; data: Cheque }>(`${CHEQUE_BASE}/${id}/clear`, body ?? {})
    .then((r) => r.data.data);

export const bounceCheque = (id: string, body?: { notes?: string }) =>
  api
    .post<{ success: boolean; data: Cheque }>(`${CHEQUE_BASE}/${id}/bounce`, body ?? {})
    .then((r) => r.data.data);

export const cancelCheque = (id: string, body?: { notes?: string }) =>
  api
    .post<{ success: boolean; data: Cheque }>(`${CHEQUE_BASE}/${id}/cancel`, body ?? {})
    .then((r) => r.data.data);

// ─── TAX REPORT ──────────────────────────────────────────────────────────────

export interface TaxReportFilters {
  dateFrom?: string;
  dateTo?: string;
  branchIds?: string;
  branchId?: string;
  country?: string;
  stateProvince?: string;
  city?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface TaxReportTotals {
  count: number;
  [key: string]: number;
}

export interface TaxReportPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface OutputTaxRow {
  invoiceNumber: string;
  invoiceDate: string;
  branchId: string;
  customerId?: string;
  customerName?: string;
  customerVatNumber?: string;
  customerCountry?: string;
  customerStateProvince?: string;
  customerCity?: string;
  taxableAmount: number;
  taxPercent?: number;
  taxName?: string;
  outputVat: number;
  totalInvoice: number;
  currencyCode?: string;
  status: string;
  /** True when the customer was VAT-exempt (a distinct reportable zero-rated
   * category) — permanently snapshotted on the invoice, not a live lookup. */
  isExempt?: boolean;
}

export interface InputTaxLocalRow {
  id: string;
  invoiceDate: string;
  branch: string;
  branchId: string;
  vendorName: string;
  vendorVatNumber?: string;
  vendorCountry?: string;
  vendorStateProvince?: string;
  vendorCity?: string;
  purchaseCategory?: string;
  taxableAmount?: number;
  taxPercent?: number;
  taxName?: string;
  inputVatAmount?: number;
  totalAmount: number;
  currencyCode?: string;
  taxStatus: string;
  vatClaimable: boolean;
}

export interface InputTaxInternationalRow {
  id: string;
  importInvoiceNo?: string;
  invoiceDate: string;
  branch: string;
  branchId: string;
  supplierName: string;
  supplierCountry?: string;
  supplierStateProvince?: string;
  supplierCity?: string;
  supplierVatNumber?: string;
  importCountry?: string;
  goodsOrService?: string;
  taxableAmount?: number;
  importVatReverseCharge?: number;
  taxPercent?: number;
  customsEntryNo?: string;
  customsDuty?: number;
  shippingCost?: number;
  labourCost?: number;
  currencyCode?: string;
  exchangeRate?: number;
  vatClaimable: boolean;
  taxStatus: string;
}

export interface CountryTaxRule {
  id: string;
  country: string;
  taxName: string;
  defaultTaxPercent?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaxReportResponse<T> {
  rows: T[];
  totals: TaxReportTotals;
  pagination: TaxReportPagination;
}

export interface CountryBreakdownState {
  state: string;
  count: number;
  outputVat: number;
}

export interface CountryBreakdownRow {
  country: string;
  count: number;
  taxableAmount: number;
  outputVat: number;
  states: CountryBreakdownState[];
}

export interface OutputTaxResponse extends TaxReportResponse<OutputTaxRow> {
  countryBreakdown: CountryBreakdownRow[];
}

export const getOutputTax = (filters: TaxReportFilters = {}) =>
  api
    .get<{
      success: boolean;
      data: OutputTaxResponse;
    }>(`${BASE}/tax/output`, { params: filters })
    .then((r) => r.data.data);

export const getInputTaxLocal = (filters: TaxReportFilters = {}) =>
  api
    .get<{
      success: boolean;
      data: TaxReportResponse<InputTaxLocalRow>;
    }>('/i/purchases/tax-report/local', { params: filters })
    .then((r) => r.data.data);

export const getInputTaxInternational = (filters: TaxReportFilters = {}) =>
  api
    .get<{
      success: boolean;
      data: TaxReportResponse<InputTaxInternationalRow>;
    }>('/i/purchases/tax-report/international', { params: filters })
    .then((r) => r.data.data);

export const sendTaxDocumentEmail = (payload: {
  recipient: string;
  subject: string;
  body: string;
  attachments: { filename: string; content: string; encoding: string }[];
}) => api.post(`${BASE}/tax/send-email`, payload).then((r) => r.data);

export const fetchCountryTaxRules = () =>
  api
    .get<{ success: boolean; data: CountryTaxRule[] }>(`${BASE}/tax-rules`)
    .then((r) => r.data.data ?? []);

export const upsertCountryTaxRule = (body: {
  country: string;
  taxName: string;
  defaultTaxPercent?: number;
  isActive?: boolean;
}) =>
  api
    .post<{ success: boolean; data: CountryTaxRule }>(`${BASE}/tax-rules`, body)
    .then((r) => r.data.data);

export const deleteCountryTaxRule = (id: string) =>
  api.delete(`${BASE}/tax-rules/${id}`).then((r) => r.data);

// ─── Guarantee Cheques ────────────────────────────────────────────────────────

export type GuaranteeStatus = 'RECEIVED' | 'RETURNED' | 'DEPOSITED';
export type GuaranteePurpose = 'PERFORMANCE_SECURITY' | 'OTHER';

export interface GuaranteeCheque {
  id: string;
  customerId: string;
  customerName: string;
  contractInvoiceId?: string | null;
  contractReference?: string | null;
  chequeNumber: string;
  amount: number;
  currencyCode: string;
  bankName: string;
  receivedDate: string;
  purpose: GuaranteePurpose;
  status: GuaranteeStatus;
  returnedDate?: string | null;
  depositedDate?: string | null;
  depositedToAccountId?: string | null;
  branchId: string;
  createdBy: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GuaranteeStats {
  /** Reporting currency the amounts below are converted into — the branch's own currency
   * for a single-branch view, AED fallback for multi-branch/admin views. */
  currency?: string;
  heldCount: number;
  heldAmount: number;
  returnedCount: number;
  returnedAmount: number;
  depositedCount: number;
  depositedAmount: number;
  pendingReturnCount: number;
  currencyWarnings?: string[];
}

export interface CustomerContract {
  id: string;
  invoiceNumber: string;
  saleType: string;
  status: string;
  totalAmount: string;
  createdAt: string;
}

export interface GuaranteeFilters {
  status?: string;
  purpose?: string;
  branchIds?: string;
  dateFrom?: string;
  dateTo?: string;
  customerId?: string;
  search?: string;
}

export interface CreateGuaranteeChequePayload {
  customerId: string;
  customerName: string;
  contractInvoiceId?: string | null;
  contractReference?: string | null;
  chequeNumber: string;
  amount: number;
  currencyCode: string;
  bankName: string;
  receivedDate: string;
  purpose: GuaranteePurpose;
  notes?: string;
}

export const fetchGuaranteeCheques = (filters: GuaranteeFilters = {}) =>
  api
    .get<{
      success: boolean;
      data: GuaranteeCheque[];
    }>(`${BASE}/guarantee-cheques`, { params: filters })
    .then((r) => r.data.data ?? []);

export const fetchGuaranteeStats = (filters: Pick<GuaranteeFilters, 'branchIds'> = {}) =>
  api
    .get<{
      success: boolean;
      data: GuaranteeStats;
    }>(`${BASE}/guarantee-cheques/stats`, { params: filters })
    .then((r) => r.data.data);

export const fetchCustomerContracts = (customerId: string) =>
  api
    .get<{
      success: boolean;
      data: CustomerContract[];
    }>(`${BASE}/guarantee-cheques/customer-contracts/${customerId}`)
    .then((r) => r.data.data ?? []);

export const createGuaranteeCheque = (payload: CreateGuaranteeChequePayload) =>
  api
    .post<{ success: boolean; data: GuaranteeCheque }>(`${BASE}/guarantee-cheques`, payload)
    .then((r) => r.data.data);

export const updateGuaranteeCheque = (id: string, payload: Partial<CreateGuaranteeChequePayload>) =>
  api
    .put<{ success: boolean; data: GuaranteeCheque }>(`${BASE}/guarantee-cheques/${id}`, payload)
    .then((r) => r.data.data);

export const returnGuaranteeCheque = (id: string, returnedDate: string) =>
  api
    .post<{
      success: boolean;
      data: GuaranteeCheque;
    }>(`${BASE}/guarantee-cheques/${id}/return`, { returnedDate })
    .then((r) => r.data.data);

export const depositGuaranteeCheque = (
  id: string,
  payload: { depositDate: string; bankAccountId: string; notes?: string },
) =>
  api
    .post<{
      success: boolean;
      data: GuaranteeCheque;
    }>(`${BASE}/guarantee-cheques/${id}/deposit`, payload)
    .then((r) => r.data.data);

export const deleteGuaranteeCheque = (id: string) =>
  api.delete(`${BASE}/guarantee-cheques/${id}`).then((r) => r.data);
