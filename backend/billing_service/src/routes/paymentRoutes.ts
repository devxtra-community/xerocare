import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/roleMiddleware';
import { EmployeeRole } from '../constants/employeeRole';
import {
  recordPayment,
  getPaymentsByInvoice,
  getAccountSummary,
} from '../controllers/paymentController';

const router = Router();

// Allow FINANCE, ADMIN, and EMPLOYEE (for advance payments during conversion) to record payments
router.post(
  '/record',
  authMiddleware,
  requireRole(
    EmployeeRole.FINANCE,
    EmployeeRole.ADMIN,
    EmployeeRole.MANAGER,
    EmployeeRole.EMPLOYEE,
  ),
  recordPayment,
);

// Allow any authenticated user (sales, manager, admin) to view payments
router.get('/:invoiceId', authMiddleware, getPaymentsByInvoice);

router.get('/summary/:invoiceId', authMiddleware, getAccountSummary);

export default router;
