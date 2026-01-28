import { Router } from 'express';
import {
  createInvoice,
  getAllInvoices,
  getInvoiceById,
  getMyInvoices,
  getStats,
  approveQuotation,
  generateFinalInvoice,
  updateQuotation,
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

router.put('/:id/approve', requireRole(UserRole.EMPLOYEE), approveQuotation);
router.post('/settlements/generate', requireRole(UserRole.EMPLOYEE), generateFinalInvoice);
router.post('/', requireRole(UserRole.EMPLOYEE), createInvoice);
router.put('/:id', requireRole(UserRole.EMPLOYEE), updateQuotation);

router.get(
  '/:id',
  requireRole(UserRole.ADMIN, UserRole.FINANCE, UserRole.MANAGER, UserRole.EMPLOYEE),
  getInvoiceById,
);

export default router;
