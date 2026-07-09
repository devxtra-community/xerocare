import { Router } from 'express';
import { PayrollController } from '../controllers/payrollController';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';

const router = Router();

router.get('/summary', authMiddleware, PayrollController.getPayrollSummary);
router.get('/stats', authMiddleware, PayrollController.getPayrollStats);
router.get('/history/:employeeId', authMiddleware, PayrollController.getEmployeePayrollHistory);
router.post(
  '/',
  authMiddleware,
  requireRole('HR', 'ADMIN', 'MANAGER'),
  PayrollController.createPayroll,
);
router.put(
  '/:id',
  authMiddleware,
  requireRole('HR', 'ADMIN', 'MANAGER'),
  PayrollController.updatePayroll,
);

export default router;
