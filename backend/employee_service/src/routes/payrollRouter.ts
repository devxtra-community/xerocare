import { Router } from 'express';
import { PayrollController } from '../controllers/payrollController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.get('/summary', authMiddleware, PayrollController.getPayrollSummary);
router.post('/', authMiddleware, PayrollController.createPayroll);
router.put('/:id', authMiddleware, PayrollController.updatePayroll);

export default router;
