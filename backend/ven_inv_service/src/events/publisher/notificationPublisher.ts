import { getRabbitChannel } from '../../config/rabbitmq';
import { logger } from '../../config/logger';

const EXCHANGE = 'domain_events';
const ROUTING_KEY = 'notification.in_app.request';

export class NotificationPublisher {
  static async publishInAppRequest(payload: {
    // Optional — omit (with notifyAdmins: true) for an admin-only broadcast
    // with no specific individual recipient.
    recipientId?: string;
    // Cross-branch/company-wide broadcast to every Admin — resolved on the
    // employee_service consumer side (Admin records live in that service's
    // own DB, not here), so this is the only way ven_inv_service can reach
    // Admin recipients at all.
    notifyAdmins?: boolean;
    title: string;
    message: string;
    type: string;
    referenceId: string;
    referenceType:
      | 'QUOTATION'
      | 'TEMPLATE'
      | 'CONTRACT'
      | 'SERVICE'
      | 'SERVICE_TICKET'
      | 'SERVICE_CONTRACT'
      | 'STOCK_TRANSFER';
  }) {
    try {
      const channel = await getRabbitChannel();
      await channel.assertExchange(EXCHANGE, 'topic', { durable: true });

      const rabbitPayload = {
        recipients: payload.recipientId ? [payload.recipientId] : [],
        notifyAdmins: payload.notifyAdmins ?? false,
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
        `[NotificationPublisher] Published in-app notification to ${payload.recipientId ?? '(none)'}${payload.notifyAdmins ? ' + all admins' : ''}`,
      );
    } catch (err) {
      logger.error('[NotificationPublisher] Failed to publish notification request:', err);
    }
  }
}
