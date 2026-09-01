import { Router } from 'express';
import { markLate, getEmployeeLateCount } from '../controllers/lateMarkController';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';

const lateMarkRouter = Router();

lateMarkRouter.use(authMiddleware);

lateMarkRouter.post('/', requireRole('ADMIN', 'HR'), markLate);
lateMarkRouter.get('/employee/:employeeId/count', getEmployeeLateCount); // Access control in controller

export default lateMarkRouter;
