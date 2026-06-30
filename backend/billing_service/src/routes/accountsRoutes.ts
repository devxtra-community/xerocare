import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { parseBranchFilter } from '../middlewares/branchFilterMiddleware';
import {
  getCashBankAccounts,
  createCashBankAccount,
  updateCashBankAccount,
  deleteCashBankAccount,
  getCashbookEntries,
  createCashbookEntry,
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
} from '../controllers/accountsController';

const router = Router();

// All routes require auth + branch filter enforcement
router.use(authMiddleware);
router.use(parseBranchFilter);

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

// Day Book (per-day cash receipts/payments summary)
router.get('/daybook', getDayBook);

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

// Balance Sheet
router.get('/balance-sheet', getBalanceSheet);

// Profit & Loss
router.get('/profit-loss', getProfitLoss);

// Admin consolidated routes (ADMIN role only — branch security enforced in parseBranchFilter)
router.get('/admin/exchange-rates', getExchangeRates);
router.post('/admin/exchange-rates', setExchangeRate);
router.get('/admin/consolidated-kpis', getConsolidatedKPIs);
router.get('/admin/branch-performance', getBranchPerformance);
router.get('/admin/branch-comparison', getBranchComparison);
router.get('/admin/consolidated-pl', getConsolidatedPL);
router.get('/admin/consolidated-balance-sheet', getConsolidatedBalanceSheet);

export default router;
