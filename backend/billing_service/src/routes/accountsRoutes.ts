import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { parseBranchFilter, requireWriteAccess } from '../middlewares/branchFilterMiddleware';
import {
  getCashBankAccounts,
  createCashBankAccount,
  updateCashBankAccount,
  deleteCashBankAccount,
  getCashbookEntries,
  createCashbookEntry,
  reverseCashbookEntry,
  getOrphanedCashbookEntries,
  getDayBook,
  getExpenseEntries,
  createExpenseEntry,
  updateExpenseEntry,
  payExpenseEntry,
  approveExpenseEntry,
  deleteExpenseEntry,
  getDepreciationBrandRules,
  upsertDepreciationBrandRule,
  deleteDepreciationBrandRule,
  getDepreciationModelRules,
  upsertDepreciationModelRule,
  deleteDepreciationModelRule,
  getAssetRegister,
  addAssetToRegister,
  updateAssetInRegister,
  disposeAsset,
  getDepreciationSchedule,
  getDepreciationJournals,
  postDepreciationJournal,
  getManualReceivables,
  createManualReceivable,
  updateManualReceivable,
  recordReceivablePayment,
  getManualPayables,
  createManualPayable,
  updateManualPayable,
  recordPayablePayment,
  getEquityEntries,
  createEquityEntry,
  updateEquityEntry,
  deleteEquityEntry,
  getEquitySummary,
  getEquityStatement,
  getBalanceSheet,
  getExpenseCharts,
  getReceivableCharts,
  getPayableCharts,
  getDepreciationCharts,
  getEquityCharts,
  getProfitLoss,
  getExchangeRates,
  setExchangeRate,
  getConsolidatedKPIs,
  getBranchPerformance,
  getBranchComparison,
  getConsolidatedPL,
  getConsolidatedBalanceSheet,
  deactivateCashBankAccount,
  getCashBankSummary,
  depositToCashBank,
  withdrawFromCashBank,
  transferBetweenAccounts,
  getCashBankTransactions,
  reconcileAccount,
  getReconciliations,
  getChartOfAccounts,
  getOutputTax,
  getCountryTaxRules,
  upsertCountryTaxRule,
  deleteCountryTaxRule,
  sendTaxDocumentEmail,
  getVatRemittances,
  createVatRemittance,
  deleteVatRemittance,
} from '../controllers/accountsController';
import {
  getOwners,
  createOwner,
  updateOwner,
  deactivateOwner,
} from '../controllers/ownerController';
import chequesRouter from './chequesRoutes';
import guaranteeChequesRouter from './guaranteeChequesRoutes';
import { requireRole } from '../middlewares/roleMiddleware';
import { EmployeeRole } from '../constants/employeeRole';
import {
  listChartOfAccountsStructure,
  getNextAccountNumber,
  createChartOfAccount,
  renameChartOfAccount,
  setChartOfAccountActive,
  deleteChartOfAccount,
} from '../controllers/chartOfAccountController';
import {
  getIncomeEntries,
  createIncomeEntry,
  updateIncomeEntry,
  approveIncomeEntry,
  receiveIncomeEntry,
  getIncomeEntryDetail,
  deleteIncomeEntry,
} from '../controllers/incomeEntryController';
import {
  getManualJournalEntries,
  createManualJournalEntry,
  reverseManualJournalEntry,
} from '../controllers/manualJournalController';
import {
  getRevenueBreakdown,
  getRevenueTransactions,
} from '../controllers/revenueBreakdownController';
import {
  getOutputVatTransactions,
  getSecurityDepositTransactions,
  getDeferredRevenueTransactions,
  getRetainedEarningsMonthly,
  getAccountsReceivableTransactions,
  getReceivableRowDetail,
  getPayableRowDetail,
  getOtherIncomeTransactions,
  getCustomerStatement,
  getVendorStatement,
  getAccountStatement,
} from '../controllers/lineItemDrilldownController';
import { getBranchActivity } from '../controllers/branchActivityController';
import {
  getSegmentedPnl,
  getSegmentProductDetail,
  getSegmentContractDetail,
} from '../controllers/segmentedPnlController';

const router = Router();
// Create: Finance + Admin can add accounts
const requireAccountsAdmin = requireRole(EmployeeRole.ADMIN, EmployeeRole.FINANCE);
// Edit / Delete: Admin-only — these are structural changes with broad downstream impact
const requireCoaAdmin = requireRole(EmployeeRole.ADMIN);

// All routes require auth + branch filter enforcement
router.use(authMiddleware);
router.use(parseBranchFilter);

// MANAGER is read-only — block all mutating methods
router.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return requireWriteAccess(req, res, next);
  }
  next();
});

// Cheques sub-router (inherits auth + parseBranchFilter above)
router.use('/cheques', chequesRouter);

// Guarantee Cheques sub-router — separate from real cheques, no cashbook impact
router.use('/guarantee-cheques', guaranteeChequesRouter);

// Cash & Bank Accounts
router.get('/cash-bank/summary', getCashBankSummary);
router.post('/cash-bank/transfer', transferBetweenAccounts);
router.get('/cash-bank', getCashBankAccounts);
router.post('/cash-bank', createCashBankAccount);
router.put('/cash-bank/:id', updateCashBankAccount);
router.patch('/cash-bank/:id/deactivate', deactivateCashBankAccount);
router.post('/cash-bank/:id/deposit', depositToCashBank);
router.post('/cash-bank/:id/withdraw', withdrawFromCashBank);
router.get('/cash-bank/:id/transactions', getCashBankTransactions);
router.post('/cash-bank/:id/reconcile', reconcileAccount);
router.get('/cash-bank/:id/reconciliations', getReconciliations);
router.delete('/cash-bank/:id', deleteCashBankAccount);

// Cashbook Entries
router.get('/cashbook', getCashbookEntries);
router.post('/cashbook', createCashbookEntry);
router.post('/cashbook/:id/reverse', reverseCashbookEntry);

// Day Book (per-day cash receipts/payments summary)
router.get('/daybook', getDayBook);

// Branch Daily Activity — broader, non-cash-scoped feed of everything that
// happened in a branch on a given day. Deliberately separate from /daybook,
// whose Total Earnings/Expenses/Net Cash figures stay strictly cash-based.
router.get('/branch-activity', getBranchActivity);

// Expense Entries
router.get('/expenses', getExpenseEntries);
router.post('/expenses', createExpenseEntry);
router.put('/expenses/:id', updateExpenseEntry);
router.patch('/expenses/:id/pay', payExpenseEntry);
router.patch('/expenses/:id/approve', approveExpenseEntry);
router.delete('/expenses/:id', deleteExpenseEntry);
router.get('/expenses/charts', getExpenseCharts);

// Depreciation — Brand Rules
router.get('/depreciation/brand-rules', getDepreciationBrandRules);
router.post('/depreciation/brand-rules', upsertDepreciationBrandRule);
router.delete('/depreciation/brand-rules/:id', deleteDepreciationBrandRule);

// Depreciation — Model Rules
router.get('/depreciation/model-rules', getDepreciationModelRules);
router.post('/depreciation/model-rules', upsertDepreciationModelRule);
router.delete('/depreciation/model-rules/:id', deleteDepreciationModelRule);

// Depreciation — Asset Register
router.get('/depreciation/assets', getAssetRegister);
router.post('/depreciation/assets', addAssetToRegister);
router.put('/depreciation/assets/:id', updateAssetInRegister);
router.patch('/depreciation/assets/:id/dispose', disposeAsset);
router.get('/depreciation/assets/:id/schedule', getDepreciationSchedule);

// Depreciation — Journal
router.get('/depreciation/journals', getDepreciationJournals);
router.post('/depreciation/journals/post', postDepreciationJournal);
router.get('/depreciation/charts', getDepreciationCharts);

// Manual Receivables
router.get('/receivables', getManualReceivables);
router.post('/receivables', createManualReceivable);
router.put('/receivables/:id', updateManualReceivable);
router.post('/receivables/:id/payment', recordReceivablePayment);
router.get('/receivables/charts', getReceivableCharts);

// Manual Payables
router.get('/payables', getManualPayables);
router.post('/payables', createManualPayable);
router.put('/payables/:id', updateManualPayable);
router.post('/payables/:id/payment', recordPayablePayment);
router.get('/payables/charts', getPayableCharts);

// Equity
router.get('/equity/summary', getEquitySummary);
router.get('/equity/statement', getEquityStatement);
router.get('/equity/charts', getEquityCharts);
router.get('/equity', getEquityEntries);
router.post('/equity', createEquityEntry);
router.patch('/equity/:id', updateEquityEntry);
router.delete('/equity/:id', deleteEquityEntry);

// Owners/Shareholders/Partners — reference list used by the Equity form
router.get('/owners', getOwners);
router.post('/owners', createOwner);
router.patch('/owners/:id', updateOwner);
router.delete('/owners/:id', deactivateOwner);

// Chart of Accounts
router.get('/chart-of-accounts', getChartOfAccounts);

// Revenue drill-down — Sale/Rent/Lease sub-category breakdown + transaction detail
router.get('/revenue-breakdown', getRevenueBreakdown);
router.get('/revenue-breakdown/transactions', getRevenueTransactions);

// Segmented P&L — profitability by revenue segment, and per-product/per-contract drill-down
router.get('/segmented-pnl', getSegmentedPnl);
router.get('/segmented-pnl/products', getSegmentProductDetail);
router.get('/segmented-pnl/contracts', getSegmentContractDetail);

// Line-item drill-downs — Liabilities/Equity lines with no existing reusable source
router.get('/line-items/output-vat', getOutputVatTransactions);
router.get('/line-items/security-deposits', getSecurityDepositTransactions);
router.get('/line-items/deferred-revenue', getDeferredRevenueTransactions);
router.get('/line-items/retained-earnings-monthly', getRetainedEarningsMonthly);
router.get('/line-items/accounts-receivable', getAccountsReceivableTransactions);
router.get('/line-items/receivable-detail', getReceivableRowDetail);
router.get('/line-items/payable-detail', getPayableRowDetail);
router.get('/line-items/other-income', getOtherIncomeTransactions);
router.get('/line-items/customer-statement', getCustomerStatement);
router.get('/line-items/vendor-statement', getVendorStatement);
router.get('/line-items/account-statement', getAccountStatement);

// Chart of Accounts structure management.
// GET routes: open to any authenticated branch user.
// POST (create): Finance + Admin.
// PATCH (edit name/number) + DELETE: Admin only.
router.get('/chart-of-accounts/structure', listChartOfAccountsStructure);
router.get('/chart-of-accounts/next-number', getNextAccountNumber);
router.post('/chart-of-accounts', requireAccountsAdmin, createChartOfAccount);
router.patch('/chart-of-accounts/:id', requireCoaAdmin, renameChartOfAccount);
router.patch('/chart-of-accounts/:id/active', requireCoaAdmin, setChartOfAccountActive);
router.delete('/chart-of-accounts/:id', requireCoaAdmin, deleteChartOfAccount);

// Income Entries (manual, category-tagged real income — mirrors Expense Entries)
router.get('/income', getIncomeEntries);
router.post('/income', createIncomeEntry);
router.put('/income/:id', updateIncomeEntry);
router.patch('/income/:id/approve', approveIncomeEntry);
router.patch('/income/:id/receive', receiveIncomeEntry);
router.get('/income/:id/detail', getIncomeEntryDetail);
router.delete('/income/:id', deleteIncomeEntry);

// Manual Journal Entries — postings against custom MANUAL_JOURNAL accounts
router.get('/manual-journal', getManualJournalEntries);
router.post('/manual-journal', createManualJournalEntry);
router.post('/manual-journal/:id/reverse', reverseManualJournalEntry);

// Balance Sheet
router.get('/balance-sheet', getBalanceSheet);

// Profit & Loss
router.get('/profit-loss', getProfitLoss);

// VAT Remittances
router.get('/vat-remittances', getVatRemittances);
router.post('/vat-remittances', createVatRemittance);
router.delete('/vat-remittances/:id', deleteVatRemittance);

// Tax Report
router.get('/tax/output', getOutputTax);
router.post('/tax/send-email', sendTaxDocumentEmail);
router.get('/tax-rules', getCountryTaxRules);
router.post('/tax-rules', upsertCountryTaxRule);
router.delete('/tax-rules/:id', deleteCountryTaxRule);

// Admin consolidated routes (ADMIN role only — branch security enforced in parseBranchFilter)
router.get('/admin/orphaned-cashbook', getOrphanedCashbookEntries);
router.get('/admin/exchange-rates', getExchangeRates);
router.post('/admin/exchange-rates', setExchangeRate);
router.get('/admin/consolidated-kpis', getConsolidatedKPIs);
router.get('/admin/branch-performance', getBranchPerformance);
router.get('/admin/branch-comparison', getBranchComparison);
router.get('/admin/consolidated-pl', getConsolidatedPL);
router.get('/admin/consolidated-balance-sheet', getConsolidatedBalanceSheet);

export default router;
