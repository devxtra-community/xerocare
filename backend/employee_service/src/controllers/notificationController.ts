import { Request, Response } from 'express';
import { Source } from '../config/dataSource';
import { Notification } from '../entities/notificationEntity';
import { logger } from '../config/logger';
import { AccessTokenPayload } from '../types/jwt';

export class NotificationController {
  static async getMyNotifications(req: Request, res: Response) {
    try {
      const user = req.user as AccessTokenPayload;
      const notificationRepo = Source.getRepository(Notification);

      const notifications = await notificationRepo.find({
        where: { employee_id: user.userId },
        order: { createdAt: 'DESC' },
      });

      return res.status(200).json(notifications);
    } catch (error) {
      logger.error('Error fetching notifications:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async markAsRead(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = req.user as AccessTokenPayload;
      const notificationRepo = Source.getRepository(Notification);

      const notification = await notificationRepo.findOne({
        where: { id: id as string, employee_id: user.userId },
      });

      if (!notification) {
        return res.status(404).json({ message: 'Notification not found' });
      }

      notification.is_read = true;
      await notificationRepo.save(notification);

      return res.status(200).json({ message: 'Notification marked as read' });
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async markAllAsRead(req: Request, res: Response) {
    try {
      const user = req.user as AccessTokenPayload;
      const notificationRepo = Source.getRepository(Notification);

      await notificationRepo.update(
        { employee_id: user.userId, is_read: false },
        { is_read: true },
      );

      return res.status(200).json({ message: 'All notifications marked as read' });
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }
}
