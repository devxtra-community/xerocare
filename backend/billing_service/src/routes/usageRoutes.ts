import { Router } from 'express';
import {
  createUsageRecord,
  updateUsageRecord,
  getUsageHistory,
} from '../controllers/usageController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/roleMiddleware';
import { EmployeeRole } from '../constants/employeeRole';

import { uploadMeterImage } from '../middlewares/uploadMiddleware';

// Create Usage (Finance Only for Monthly Collection? Or Employee for manual entry?)
// Plan says: "Finance gets full control (usage...)". "Employee locked".
// So usually Finance records usage. Or Customer uploads (Portal).
// The route permissions should reflect this.
// For now, let's allow FINANCE (and maybe EMPLOYEE for legacy flow, but restrict active lease edits?)
// Plan says "Disable Employee edits post-approval".
// And "Only Finance can manage Rent & Lease collections".
// So this route should be restricted to FINANCE role.

const router = Router();

// Create Usage
// uploadMeterImage.single('file') expects form-data with field 'file'
router.post(
  '/',
  authMiddleware,
  authMiddleware,
  requireRole(EmployeeRole.FINANCE),
  uploadMeterImage.single('file'),
  createUsageRecord,
);

// Update Usage
router.put('/:id', authMiddleware, requireRole(EmployeeRole.EMPLOYEE), updateUsageRecord);

// Get History
router.get('/contract/:contractId', authMiddleware, getUsageHistory);

export default router;
