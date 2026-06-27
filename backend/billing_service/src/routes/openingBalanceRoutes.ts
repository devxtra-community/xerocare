import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/roleMiddleware';
import { EmployeeRole } from '../constants/employeeRole';
import {
  createEntry,
  getEntries,
  getEntry,
  getCustomerEntries,
  updateEntry,
  deleteEntry,
} from '../controllers/openingBalanceController';

const router = Router();

// Write operations guarded by ADMIN, MANAGER, FINANCE, and EMPLOYEE roles
router.post(
  '/',
  authMiddleware,
  requireRole(
    EmployeeRole.ADMIN,
    EmployeeRole.MANAGER,
    EmployeeRole.FINANCE,
    EmployeeRole.EMPLOYEE,
  ),
  createEntry,
);

router.put(
  '/:id',
  authMiddleware,
  requireRole(
    EmployeeRole.ADMIN,
    EmployeeRole.MANAGER,
    EmployeeRole.FINANCE,
    EmployeeRole.EMPLOYEE,
  ),
  updateEntry,
);

router.delete(
  '/:id',
  authMiddleware,
  requireRole(
    EmployeeRole.ADMIN,
    EmployeeRole.MANAGER,
    EmployeeRole.FINANCE,
    EmployeeRole.EMPLOYEE,
  ),
  deleteEntry,
);

// Read operations available to all authenticated employees
router.get('/', authMiddleware, getEntries);
router.get('/:id', authMiddleware, getEntry);
router.get('/customer/:customerId', authMiddleware, getCustomerEntries);

export default router;
