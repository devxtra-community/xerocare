import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { parseBranchFilter, requireWriteAccess } from '../middlewares/branchFilterMiddleware';
import {
  getExchangeRates,
  setExchangeRate,
  getConsolidatedKPIs,
  getBranchPerformanceTable,
  getBranchComparison,
  getConsolidatedPL,
  getConsolidatedBalanceSheet,
} from '../controllers/adminAccountsController';

const router = Router();

router.use(authMiddleware);

// Reading exchange rates is not accounts-module-gated: the rates are global
// (not branch-scoped) reference data, and any authenticated role that records
// a payment in a foreign currency (e.g. an employee collecting a sale payment)
// needs to display the converted amount. Only setting a rate is privileged —
// setExchangeRate enforces that itself via requireAdmin. Must stay registered
// before parseBranchFilter below, or it inherits the ADMIN/FINANCE/MANAGER gate.
router.get('/exchange-rates', getExchangeRates);

router.use(parseBranchFilter);

// MANAGER is read-only for admin endpoints too
router.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return requireWriteAccess(req, res, next);
  }
  next();
});

// Exchange rates (admin-set)
router.post('/exchange-rates', setExchangeRate);

// Consolidated data endpoints
router.get('/consolidated-kpis', getConsolidatedKPIs);
router.get('/branch-performance', getBranchPerformanceTable);
router.get('/branch-comparison', getBranchComparison);
router.get('/consolidated-pl', getConsolidatedPL);
router.get('/consolidated-balance-sheet', getConsolidatedBalanceSheet);

export default router;
