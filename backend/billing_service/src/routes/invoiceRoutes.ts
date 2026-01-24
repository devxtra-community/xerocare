import { Router } from 'express';
import {
  createQuotation,
  updateQuotation,
  approveQuotation,
  generateFinalInvoice,
  getAllInvoices,
  getInvoiceById,
  getMyInvoices,
  getStats,
} from '../controllers/invoiceController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/roleMiddleware';
import { EmployeeRole } from '../constants/employeeRole';

const router = Router();

router.post('/quotation', authMiddleware, requireRole(EmployeeRole.EMPLOYEE), createQuotation);
router.put('/quotation/:id', authMiddleware, requireRole(EmployeeRole.EMPLOYEE), updateQuotation);
router.put('/:id/approve', authMiddleware, approveQuotation); // Ensuring PUT or POST appropriate for body // or PUT
router.get('/my-invoices', authMiddleware, getMyInvoices);
router.get('/', authMiddleware, getAllInvoices);
router.get('/stats', authMiddleware, getStats);
router.post(
  '/settlements/generate',
  authMiddleware,
  requireRole(EmployeeRole.EMPLOYEE),
  generateFinalInvoice,
);
router.get('/:id', authMiddleware, getInvoiceById);

export default router;
