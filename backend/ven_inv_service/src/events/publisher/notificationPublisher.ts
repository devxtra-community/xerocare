import { getRabbitChannel } from '../../config/rabbitmq';
import { uniqueNotificationRecipientIds } from '../../helpers/notificationRecipientPolicy';
import { publishConfirmed } from '../../utils/publishConfirmed';

const EXCHANGE = 'domain_events';
const ROUTING_KEY = 'notification.in_app.request';

export type InAppNotificationPayload = {
  recipientId?: string;
  recipientIds?: Array<string | null | undefined>;
  notifyAdmins?: boolean;
  notificationEventId?: string;
  title: string;
  message: string;
  type: string;
  referenceData?: Record<string, unknown>;
  referenceId: string;
  referenceType:
    | 'QUOTATION'
    | 'TEMPLATE'
    | 'CONTRACT'
    | 'SERVICE'
    | 'SERVICE_TICKET'
    | 'SERVICE_CONTRACT'
    | 'STOCK_TRANSFER'
    | 'LOT'
    | 'CUSTOM_PART_REQUEST';
};

/** Keep the broker payload contract explicit and independently testable. */
export function serializeInAppNotificationRequest(payload: InAppNotificationPayload) {
  return {
    recipients: uniqueNotificationRecipientIds(payload.recipientId, payload.recipientIds),
    notifyAdmins: payload.notifyAdmins ?? false,
    title: payload.title,
    message: payload.message,
    type: payload.type,
    data: {
      ...(payload.referenceData ?? {}),
      referenceId: payload.referenceId,
      referenceType: payload.referenceType,
    },
  };
}

export class NotificationPublisher {
  static async publishInAppRequest(
    payload: InAppNotificationPayload,
    maxConnectionAttempts = Number.POSITIVE_INFINITY,
  ) {
    const channel = await getRabbitChannel(maxConnectionAttempts);
    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });

    const rabbitPayload = serializeInAppNotificationRequest(payload);

    await publishConfirmed(
      channel,
      EXCHANGE,
      ROUTING_KEY,
      Buffer.from(JSON.stringify(rabbitPayload)),
      {
        persistent: true,
        ...(payload.notificationEventId ? { messageId: payload.notificationEventId } : {}),
      },
    );
  }
}
