import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/roleMiddleware';
import { EmployeeRole } from '../constants/employeeRole';
import * as targetController from '../controllers/targetController';

const router = Router();

router.use(authMiddleware);

const managerOrAdmin = requireRole(EmployeeRole.MANAGER, EmployeeRole.ADMIN);

// Static/specific routes must come before the '/:id' param route.
router.get('/leaderboard', managerOrAdmin, targetController.leaderboard);
router.get('/achievement/monthly', managerOrAdmin, targetController.monthlyAchievement);
// HR also needs read access here for the payroll-incentive banner integration.
router.get(
  '/employee/:employeeId',
  requireRole(EmployeeRole.MANAGER, EmployeeRole.ADMIN, EmployeeRole.HR),
  targetController.listByEmployee,
);
router.get('/my-targets', targetController.myTargets);
router.get('/my-targets/:month', targetController.myTargetMonth);
router.get('/admin/overview', requireRole(EmployeeRole.ADMIN), targetController.adminOverview);

router.post('/', managerOrAdmin, targetController.createTarget);
router.get('/', managerOrAdmin, targetController.listTargets);
router.get('/:id', managerOrAdmin, targetController.getTargetById);
router.put('/:id', managerOrAdmin, targetController.updateTarget);
router.delete('/:id', managerOrAdmin, targetController.cancelTarget);

export default router;
