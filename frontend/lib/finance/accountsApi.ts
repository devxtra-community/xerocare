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
  createdAt: string;
  updatedAt: string;
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
  paymentMode?: string;
  chequeNo?: string;
  notes?: string;
  createdBy: string;
  branchId: string;
  createdAt: string;
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
  productId: string;
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
  // computed
  monthlyDep: number;
  accumulated: number;
  nbv: number;
  monthsElapsed: number;
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
}): Promise<CashBankAccount[]> {
  const res = await api.get(`${BASE}/cash-bank`, { params });
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

// ─── Expense Entries ─────────────────────────────────────────────────────────

export async function fetchExpenseEntries(params?: {
  branchId?: string;
  branchIds?: string;
  category?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
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
  | 'PROFIT_TRANSFER'
  | 'LOSS_TRANSFER'
  | 'OTHER';

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
  createdBy: string;
  createdAt: string;
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
    receivables: number;
    manualReceivables?: number;
    invoiceAR?: number;
    total: number;
  };
  liabilities: { payables: number; accruedExpenses: number; vatPayable?: number; total: number };
  equity: { netEquity: number; total: number };
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
