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
router.use(parseBranchFilter);

// MANAGER is read-only for admin endpoints too
router.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return requireWriteAccess(req, res, next);
  }
  next();
});

// Exchange rates (admin-set)
router.get('/exchange-rates', getExchangeRates);
router.post('/exchange-rates', setExchangeRate);

// Consolidated data endpoints
router.get('/consolidated-kpis', getConsolidatedKPIs);
router.get('/branch-performance', getBranchPerformanceTable);
router.get('/branch-comparison', getBranchComparison);
router.get('/consolidated-pl', getConsolidatedPL);
router.get('/consolidated-balance-sheet', getConsolidatedBalanceSheet);

export default router;
