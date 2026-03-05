import { Router } from 'express';
import multer from 'multer';
import {
  createInvoice,
  getAllInvoices,
  getInvoiceById,
  getMyInvoices,
  getStats,
  approveQuotation,
  employeeApprove,
  allocateMachines,
  activateContract,
  financeReject,
  generateFinalInvoice,
  updateQuotation,
  getBranchInvoices,
  getPendingCounts,
  getCollectionAlerts,
  getGlobalSales,
  getGlobalSalesTotals,
  getAdminSalesStats,
  createNextMonthInvoice,
  getInvoiceHistory,
  getCompletedCollections,
  downloadInvoice,
  sendInvoice,
  getFinanceReport,
  getBranchFinanceStats,
  sendEmailNotification,
  sendWhatsappNotification,
  uploadContractConfirmation,
} from '../controllers/invoiceController';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';
import { UserRole } from '../constants/userRole';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

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
  '/finance/report',
  requireRole(UserRole.ADMIN, UserRole.MANAGER, UserRole.FINANCE),
  getFinanceReport,
);

router.get(
  '/alerts',
  requireRole(UserRole.ADMIN, UserRole.FINANCE),
  getCollectionAlerts, // Ensure import!
);

router.get('/history', requireRole(UserRole.ADMIN, UserRole.FINANCE), getInvoiceHistory);

router.get(
  '/completed-collections',
  requireRole(UserRole.ADMIN, UserRole.FINANCE),
  getCompletedCollections,
);

router.get(
  '/completed-collections/:contractId/download',
  requireRole(UserRole.ADMIN, UserRole.FINANCE),
  downloadInvoice,
);

router.post(
  '/completed-collections/:contractId/send',
  requireRole(UserRole.ADMIN, UserRole.FINANCE),
  sendInvoice,
);

router.get('/sales/global-overview', requireRole(UserRole.ADMIN, UserRole.FINANCE), getGlobalSales);

router.get(
  '/sales/global-totals',
  requireRole(UserRole.ADMIN, UserRole.FINANCE),
  getGlobalSalesTotals,
);

router.get('/sales/admin-stats', requireRole(UserRole.ADMIN), getAdminSalesStats);

router.get(
  '/sales/branch-finance-stats',
  requireRole(UserRole.ADMIN, UserRole.MANAGER, UserRole.FINANCE),
  getBranchFinanceStats,
);

router.put('/:id/approve', requireRole(UserRole.EMPLOYEE), approveQuotation);
router.post(
  '/:id/employee-approve',
  requireRole(UserRole.EMPLOYEE, UserRole.MANAGER),
  employeeApprove,
);
router.post(
  '/:id/allocate-machines',
  requireRole(UserRole.ADMIN, UserRole.FINANCE),
  allocateMachines,
);
router.post(
  '/:id/activate-contract',
  authMiddleware,
  // requireRole(FinanceRole.FINANCE),
  activateContract,
);

router.post(
  '/:id/upload-confirmation',
  authMiddleware,
  upload.single('file'),
  uploadContractConfirmation,
);

router.post('/:id/finance-reject', requireRole(UserRole.ADMIN, UserRole.FINANCE), financeReject);
router.post(
  '/settlements/generate',
  requireRole(UserRole.ADMIN, UserRole.FINANCE),
  generateFinalInvoice,
);
router.post(
  '/settlements/next-month',
  requireRole(UserRole.ADMIN, UserRole.FINANCE),
  createNextMonthInvoice,
);
router.post('/', requireRole(UserRole.EMPLOYEE), createInvoice);
router.put('/:id', requireRole(UserRole.EMPLOYEE), updateQuotation);

router.post(
  '/:id/notify/email',
  requireRole(UserRole.ADMIN, UserRole.FINANCE, UserRole.MANAGER, UserRole.EMPLOYEE),
  sendEmailNotification,
);

router.post(
  '/:id/notify/whatsapp',
  requireRole(UserRole.ADMIN, UserRole.FINANCE, UserRole.MANAGER, UserRole.EMPLOYEE),
  sendWhatsappNotification,
);

router.get(
  '/:id',
  requireRole(UserRole.ADMIN, UserRole.FINANCE, UserRole.MANAGER, UserRole.EMPLOYEE),
  getInvoiceById,
);

export default router;
