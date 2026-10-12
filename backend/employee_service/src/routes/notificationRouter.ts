import { Router } from 'express';
import { NotificationController } from '../controllers/notificationController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.get('/my', authMiddleware, NotificationController.getMyNotifications);
router.put('/:id/read', authMiddleware, NotificationController.markAsRead);
router.put('/read-all', authMiddleware, NotificationController.markAllAsRead);
// Internal: only the authenticated billing_service principal may create rows.
router.post('/internal', authMiddleware, NotificationController.createInternal);

export default router;
