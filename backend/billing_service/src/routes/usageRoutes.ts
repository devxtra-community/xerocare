import { Router } from 'express';
import {
  createUsageRecord,
  updateUsageRecord,
  getUsageHistory,
} from '../controllers/usageController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/roleMiddleware';
import { EmployeeRole } from '../constants/employeeRole';

const router = Router();

// Create Usage (Employee Only currently, or Customer Portal if needed later)
router.post('/', authMiddleware, requireRole(EmployeeRole.EMPLOYEE), createUsageRecord);

// Update Usage
router.put('/:id', authMiddleware, requireRole(EmployeeRole.EMPLOYEE), updateUsageRecord);

// Get History
router.get('/contract/:contractId', authMiddleware, getUsageHistory);

export default router;
