import { Router } from 'express';
import {
  submitLeaveApplication,
  getMyLeaveApplications,
  getBranchLeaveApplications,
  getLeaveApplicationById,
  approveLeaveApplication,
  rejectLeaveApplication,
  cancelLeaveApplication,
  getLeaveStats,
} from '../controllers/leaveApplicationController';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';

const leaveApplicationRouter = Router();

// All routes require authentication
leaveApplicationRouter.use(authMiddleware);

// Employee routes (all authenticated users)
leaveApplicationRouter.post('/', submitLeaveApplication);
leaveApplicationRouter.get('/my', getMyLeaveApplications);
leaveApplicationRouter.delete('/:id', cancelLeaveApplication);

// HR and Admin routes
leaveApplicationRouter.get('/stats', requireRole('ADMIN', 'HR'), getLeaveStats);
leaveApplicationRouter.get('/', requireRole('ADMIN', 'HR'), getBranchLeaveApplications);
leaveApplicationRouter.get('/:id', getLeaveApplicationById); // Access control in controller
leaveApplicationRouter.put('/:id/approve', requireRole('ADMIN', 'HR'), approveLeaveApplication);
leaveApplicationRouter.put('/:id/reject', requireRole('ADMIN', 'HR'), rejectLeaveApplication);

export default leaveApplicationRouter;
