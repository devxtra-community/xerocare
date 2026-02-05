import { Router } from 'express';
import {
  createInvoice,
  getAllInvoices,
  getInvoiceById,
  getMyInvoices,
  getStats,
  approveQuotation,
  employeeApprove,
  financeApprove,
  financeReject,
  generateFinalInvoice,
  updateQuotation,
  getBranchInvoices,
  getPendingCounts,
  getCollectionAlerts,
  getGlobalSales,
  getGlobalSalesTotals,
} from '../controllers/invoiceController';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';
import { UserRole } from '../constants/userRole';

const router = Router();

router.use(authMiddleware);

router.get(
  '/stats',
  requireRole(UserRole.ADMIN, UserRole.FINANCE, UserRole.MANAGER, UserRole.EMPLOYEE),
  getStats,
);
router.get(
  '/my-invoices',
  requireRole(UserRole.ADMIN, UserRole.FINANCE, UserRole.MANAGER, UserRole.EMPLOYEE),
  getMyInvoices,
);
router.get(
  '/',
  requireRole(UserRole.ADMIN, UserRole.FINANCE, UserRole.MANAGER, UserRole.EMPLOYEE),
  getAllInvoices,
);

router.get(
  '/branch-invoices',
  requireRole(UserRole.ADMIN, UserRole.FINANCE, UserRole.MANAGER),
  getBranchInvoices,
);

router.get(
  '/pending-counts',
  requireRole(UserRole.ADMIN, UserRole.FINANCE, UserRole.MANAGER),
  getPendingCounts,
);

router.get(
  '/alerts',
  requireRole(UserRole.ADMIN, UserRole.FINANCE),
  getCollectionAlerts, // Ensure import!
);

router.get('/sales/global-overview', requireRole(UserRole.ADMIN, UserRole.FINANCE), getGlobalSales);

router.get(
  '/sales/global-totals',
  requireRole(UserRole.ADMIN, UserRole.FINANCE),
  getGlobalSalesTotals,
);

router.put('/:id/approve', requireRole(UserRole.EMPLOYEE), approveQuotation);
router.post(
  '/:id/employee-approve',
  requireRole(UserRole.EMPLOYEE, UserRole.MANAGER),
  employeeApprove,
);
router.post('/:id/finance-approve', requireRole(UserRole.ADMIN, UserRole.FINANCE), financeApprove);
router.post('/:id/finance-reject', requireRole(UserRole.ADMIN, UserRole.FINANCE), financeReject);
router.post(
  '/settlements/generate',
  requireRole(UserRole.ADMIN, UserRole.FINANCE),
  generateFinalInvoice,
);
router.post('/', requireRole(UserRole.EMPLOYEE), createInvoice);
router.put('/:id', requireRole(UserRole.EMPLOYEE), updateQuotation);

router.get(
  '/:id',
  requireRole(UserRole.ADMIN, UserRole.FINANCE, UserRole.MANAGER, UserRole.EMPLOYEE),
  getInvoiceById,
);

export default router;
