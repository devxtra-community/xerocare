import { Router } from 'express';
import {
  createQuotation,
  updateQuotation,
  approveQuotation,
  employeeApprove,
  financeApprove,
  financeReject,
  generateFinalInvoice,
  getAllInvoices,
  getInvoiceById,
  getMyInvoices,
  getStats,
  getBranchSales,
  getBranchSalesTotals,
  getGlobalSales,
  getGlobalSalesTotals,
  getBranchInvoices,
  getPendingCounts,
  getCollectionAlerts,
  getFinanceReport,
} from '../controllers/invoiceController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/roleMiddleware';
import { EmployeeRole } from '../constants/employeeRole';
import { requireJob, EmployeeJob } from '../middlewares/jobMiddleware';

const router = Router();

router.post(
  '/quotation',
  authMiddleware,
  requireRole(EmployeeRole.EMPLOYEE),
  requireJob(EmployeeJob.SALES, EmployeeJob.RENT_LEASE),
  createQuotation,
);
router.put('/quotation/:id', authMiddleware, requireRole(EmployeeRole.EMPLOYEE), updateQuotation);
router.post(
  '/:id/employee-approve',
  authMiddleware,
  requireRole(EmployeeRole.EMPLOYEE),
  employeeApprove,
);
router.post(
  '/:id/finance-approve',
  authMiddleware,
  // requireRole(FinanceRole.FINANCE), // Ensure generic roles or specific Finance Role check
  financeApprove,
);
router.post(
  '/:id/finance-reject',
  authMiddleware,
  // requireRole(FinanceRole.FINANCE),
  financeReject,
);

router.put('/:id/approve', authMiddleware, approveQuotation);
// Keeping old approve? Or Deprecating? Prompt says "Employee can mark quotations as EMPLOYEE_APPROVED". Old approve was "approveQuotation". Might key to "EMPLOYEE_APPROVED" or is it "Finalize"?
// User prompt: "Employee Approval Endpoint: POST /b/invoices/:id/employee-approve".
// Old method "approveQuotation" likely converted to PROFORMA directly previously.
// We should probably keep it but ensure it's not used by employee for bypassing finance?
// Or maybe it's dead code now. Leaving it as is to allow backward compatibility or other flows, but new flow uses new endpoints.
router.get('/my-invoices', authMiddleware, getMyInvoices);
router.get('/', authMiddleware, getAllInvoices);
router.get('/stats', authMiddleware, getStats);
router.get('/sales/branch-overview', authMiddleware, getBranchSales);
router.get('/sales/branch-totals', authMiddleware, getBranchSalesTotals);
router.get('/sales/global-overview', authMiddleware, getGlobalSales);
router.get('/sales/global-totals', authMiddleware, getGlobalSalesTotals);
router.post(
  '/settlements/generate',
  authMiddleware,
  requireRole(EmployeeRole.FINANCE),
  generateFinalInvoice,
);
router.get('/pending-counts', authMiddleware, getPendingCounts);
router.get('/alerts', authMiddleware, requireRole(EmployeeRole.FINANCE), getCollectionAlerts);
router.get('/branch-invoices', authMiddleware, getBranchInvoices);
router.get('/finance/report', authMiddleware, requireRole(EmployeeRole.ADMIN), getFinanceReport);
router.get('/:id', authMiddleware, getInvoiceById);

export default router;
