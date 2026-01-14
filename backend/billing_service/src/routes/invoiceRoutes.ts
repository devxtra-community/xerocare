import { Router } from 'express';
import {
  createInvoice,
  getAllInvoices,
  getInvoiceById,
  getMyInvoices,
  getStats,
} from '../controllers/invoiceController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/roleMiddleware';
import { EmployeeRole } from '../constants/employeeRole';

const router = Router();

router.post('/', authMiddleware, requireRole(EmployeeRole.EMPLOYEE), createInvoice);
router.get('/my-invoices', authMiddleware, getMyInvoices);
router.get('/', authMiddleware, getAllInvoices);
router.get('/stats', authMiddleware, getStats);
router.get('/:id', authMiddleware, getInvoiceById);

export default router;
