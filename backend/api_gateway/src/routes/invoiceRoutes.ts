import { Router } from 'express';
import { getAllInvoices, getInvoiceById, getMyInvoices } from '../controllers/invoiceController';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';
import { UserRole } from '../constants/userRole';

const router = Router();

router.use(authMiddleware);

router.get(
  '/my-invoices',
  requireRole(UserRole.ADMIN, UserRole.FINANCE, UserRole.MANAGER, UserRole.EMPLOYEE),
  getMyInvoices,
);
router.get('/', requireRole(UserRole.ADMIN, UserRole.FINANCE, UserRole.MANAGER), getAllInvoices);
router.get(
  '/:id',
  requireRole(UserRole.ADMIN, UserRole.FINANCE, UserRole.MANAGER, UserRole.EMPLOYEE),
  getInvoiceById,
);

export default router;
