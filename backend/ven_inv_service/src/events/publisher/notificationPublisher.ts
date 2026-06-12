import { getRabbitChannel } from '../../config/rabbitmq';
import { logger } from '../../config/logger';

const EXCHANGE = 'domain_events';
const ROUTING_KEY = 'notification.in_app.request';

export class NotificationPublisher {
  static async publishInAppRequest(payload: {
    recipientId: string;
    title: string;
    message: string;
    type: string;
    referenceId: string;
    referenceType: 'QUOTATION' | 'TEMPLATE' | 'CONTRACT' | 'SERVICE' | 'SERVICE_TICKET';
  }) {
    try {
      const channel = await getRabbitChannel();
      await channel.assertExchange(EXCHANGE, 'topic', { durable: true });

      const rabbitPayload = {
        recipients: [payload.recipientId],
        notifyAdmins: false,
        title: payload.title,
        message: payload.message,
        type: payload.type,
        data: {
          referenceId: payload.referenceId,
          referenceType: payload.referenceType,
        },
      };

      channel.publish(EXCHANGE, ROUTING_KEY, Buffer.from(JSON.stringify(rabbitPayload)), {
        persistent: true,
      });
      logger.info(
        `[NotificationPublisher] Published in-app notification to ${payload.recipientId}`,
      );
    } catch (err) {
      logger.error('[NotificationPublisher] Failed to publish notification request:', err);
    }
  }
}
