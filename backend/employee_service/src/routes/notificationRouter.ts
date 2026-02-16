import { Router } from 'express';
import { NotificationController } from '../controllers/notificationController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.get('/my', authMiddleware, NotificationController.getMyNotifications);
router.put('/:id/read', authMiddleware, NotificationController.markAsRead);
router.put('/read-all', authMiddleware, NotificationController.markAllAsRead);

export default router;
