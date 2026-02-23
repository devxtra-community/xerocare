import { getRabbitChannel } from '../../config/rabbitmq';
import { BillingEventType, NotificationRequestEvent } from '../billingEvents';

const EXCHANGE = 'domain_events'; // Or 'notification_events' if separated

export class NotificationPublisher {
  static async publishEmailRequest(payload: NotificationRequestEvent) {
    const channel = await getRabbitChannel();
    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });

    channel.publish(
      EXCHANGE,
      BillingEventType.NOTIFICATION_EMAIL,
      Buffer.from(JSON.stringify(payload)),
      { persistent: true },
    );
  }

  static async publishWhatsappRequest(payload: NotificationRequestEvent) {
    const channel = await getRabbitChannel();
    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });

    channel.publish(
      EXCHANGE,
      BillingEventType.NOTIFICATION_WHATSAPP,
      Buffer.from(JSON.stringify(payload)),
      { persistent: true },
    );
  }
}
