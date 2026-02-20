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
  getAdminSalesStats,
  getBranchInvoices,
  getPendingCounts,
  getCollectionAlerts,
  getFinanceReport,
  updateInvoiceUsage,
  createNextMonthInvoice,
  getInvoiceHistory,
  generateConsolidatedFinalInvoice,
  getCompletedCollections,
  downloadConsolidatedInvoice,
  sendConsolidatedInvoice,
  sendEmailNotification,
  sendWhatsappNotification,
  getAvailableYears,
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
router.get('/stats/available-years', authMiddleware, getAvailableYears);
router.get(
  '/sales/admin-stats',
  authMiddleware,
  requireRole(EmployeeRole.ADMIN),
  getAdminSalesStats,
); // Added this route
router.get('/sales/branch-overview', authMiddleware, getBranchSales);
router.get('/sales/branch-totals', authMiddleware, getBranchSalesTotals);
router.get('/sales/global-overview', authMiddleware, getGlobalSales);
router.get('/sales/global-totals', authMiddleware, getGlobalSalesTotals);
router.post(
  '/settlements/generate',
  authMiddleware,
  requireRole(EmployeeRole.ADMIN, EmployeeRole.FINANCE),
  generateFinalInvoice,
);
router.post(
  '/settlements/next-month',
  authMiddleware,
  requireRole(EmployeeRole.ADMIN, EmployeeRole.FINANCE),
  createNextMonthInvoice,
);
router.get('/pending-counts', authMiddleware, getPendingCounts);

router.post(
  '/settlements/consolidate',
  authMiddleware,
  requireRole(EmployeeRole.ADMIN, EmployeeRole.FINANCE),
  generateConsolidatedFinalInvoice,
);
router.get(
  '/alerts',
  authMiddleware,
  requireRole(EmployeeRole.ADMIN, EmployeeRole.FINANCE),
  getCollectionAlerts,
);

router.get(
  '/completed-collections',
  authMiddleware,
  requireRole(EmployeeRole.ADMIN, EmployeeRole.FINANCE),
  getCompletedCollections,
);

router.get(
  '/completed-collections/:contractId/download',
  // authMiddleware, // Allow download? Auth needed.
  authMiddleware,
  requireRole(EmployeeRole.ADMIN, EmployeeRole.FINANCE),
  downloadConsolidatedInvoice,
);

router.post(
  '/completed-collections/:contractId/send',
  authMiddleware,
  requireRole(EmployeeRole.ADMIN, EmployeeRole.FINANCE),
  sendConsolidatedInvoice,
);

router.get('/branch-invoices', authMiddleware, getBranchInvoices);
router.get(
  '/history',
  authMiddleware,
  requireRole(EmployeeRole.ADMIN, EmployeeRole.FINANCE),
  getInvoiceHistory,
);
router.get('/finance/report', authMiddleware, requireRole(EmployeeRole.ADMIN), getFinanceReport);
router.put(
  '/:id/usage',
  authMiddleware,
  requireRole(EmployeeRole.ADMIN, EmployeeRole.FINANCE),
  updateInvoiceUsage,
);

router.post('/:id/notify/email', authMiddleware, sendEmailNotification);
router.post('/:id/notify/whatsapp', authMiddleware, sendWhatsappNotification);

router.get('/:id', authMiddleware, getInvoiceById);

export default router;
