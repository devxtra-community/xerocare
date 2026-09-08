import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { Source } from '../config/dataSource';
import { LeaveApplication } from '../entities/leaveApplicationEntity';
import { Notification } from '../entities/notificationEntity';
import { LeaveStatus } from '../constants/leaveStatus';
import { logger } from '../config/logger';

const router = Router();

/**
 * Sidebar badge counts for this service's queues — leave awaiting a decision, and the
 * caller's own unread notifications.
 *
 * Notifications are counted for the signed-in user rather than the branch: an unread
 * count is personal, and a shared branch total would leave everyone's dot lit until the
 * last person read theirs.
 *
 * Returns an empty map on any failure — a badge must never break a sidebar.
 */
router.get('/nav-counts', authMiddleware, async (req: Request, res: Response) => {
  try {
    const role = req.user?.role || '';
    const userId = req.user?.userId;
    const branchId = req.user?.branchId || (req.query.branchId as string) || '';

    const leaveQb = Source.getRepository(LeaveApplication)
      .createQueryBuilder('l')
      .where('l.status = :status', { status: LeaveStatus.PENDING });
    if (role !== 'ADMIN' && branchId) {
      leaveQb.andWhere('l.branch_id = :branchId', { branchId });
    }

    const [leave, notifications] = await Promise.all([
      leaveQb.getCount(),
      userId
        ? Source.getRepository(Notification)
            .createQueryBuilder('n')
            .where('n.employee_id = :userId', { userId })
            .andWhere('n.is_read = false')
            .getCount()
        : Promise.resolve(0),
    ]);

    return res.json({ success: true, data: { LEAVE: leave, NOTIFICATIONS: notifications } });
  } catch (err) {
    logger.error('nav-counts error', err);
    return res.json({ success: true, data: {} });
  }
});

export default router;
