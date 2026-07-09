import { Router } from 'express';
import { NotificationController } from '../controllers/notificationController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.get('/my', authMiddleware, NotificationController.getMyNotifications);
router.put('/:id/read', authMiddleware, NotificationController.markAsRead);
router.put('/read-all', authMiddleware, NotificationController.markAllAsRead);
// Internal: called by billing_service — validates x-internal-service header
router.post('/internal', NotificationController.createInternal);

export default router;
