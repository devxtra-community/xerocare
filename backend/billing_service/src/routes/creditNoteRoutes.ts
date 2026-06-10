import { Router } from 'express';
import { CreditNoteController } from '../controllers/creditNoteController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/roleMiddleware';
import { EmployeeRole } from '../constants/employeeRole';

const router = Router();
const controller = new CreditNoteController();

router.use(authMiddleware);

router.get('/stats', controller.getStats);
router.get('/', controller.list);
router.post('/', requireRole(EmployeeRole.EMPLOYEE, EmployeeRole.MANAGER), controller.create);
router.put('/:id', requireRole(EmployeeRole.EMPLOYEE, EmployeeRole.MANAGER), controller.update);
router.delete('/:id', requireRole(EmployeeRole.EMPLOYEE, EmployeeRole.MANAGER), controller.delete);
router.post(
  '/:id/send',
  requireRole(EmployeeRole.EMPLOYEE, EmployeeRole.MANAGER),
  controller.sendToFinance,
);

router.post(
  '/:id/approve',
  requireRole(EmployeeRole.FINANCE, EmployeeRole.ADMIN),
  controller.approve,
);
router.post(
  '/:id/reject',
  requireRole(EmployeeRole.FINANCE, EmployeeRole.ADMIN),
  controller.reject,
);
router.post(
  '/:id/complete',
  requireRole(EmployeeRole.EMPLOYEE, EmployeeRole.MANAGER),
  controller.complete,
);

export default router;
