import { Router } from 'express';
import { createInvoice } from '../controllers/invoiceController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/roleMiddleware';
import { EmployeeRole } from '../constants/employeeRole';

const router = Router();

router.post('/', authMiddleware, requireRole(EmployeeRole.EMPLOYEE), createInvoice);

export default router;
