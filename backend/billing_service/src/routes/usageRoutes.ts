import { Router, Request, Response, NextFunction } from 'express';
import {
  createUsageRecord,
  getUsageHistory,
  sendMonthlyInvoice,
  updateUsageRecord,
} from '../controllers/usageController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/roleMiddleware';
import { EmployeeRole } from '../constants/employeeRole';

import { uploadMeterImage } from '../middlewares/uploadMiddleware';
import { AppError } from '../errors/appError';

const requireUsageEntryPermission = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('Not authenticated', 401));
  }

  const { role, employeeJob } = req.user;

  if (role === 'ADMIN' || role === 'FINANCE') {
    return next();
  }

  if (role === 'EMPLOYEE' && employeeJob === 'TECHNICIAN') {
    return next();
  }

  return next(new AppError('Access denied: insufficient permissions', 403));
};

const router = Router();

// Create Usage
// uploadMeterImage.single('file') expects form-data with field 'file'
router.post(
  '/',
  authMiddleware,
  requireUsageEntryPermission,
  uploadMeterImage.single('file'),
  createUsageRecord,
);

// Update Usage
router.put('/:id', authMiddleware, requireRole(EmployeeRole.FINANCE), updateUsageRecord);

// Get History
router.get('/contract/:contractId', authMiddleware, getUsageHistory);

// Send Monthly Invoice
router.post(
  '/:id/send-invoice',
  authMiddleware,
  requireRole(EmployeeRole.FINANCE),
  sendMonthlyInvoice,
);

export default router;
