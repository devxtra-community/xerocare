import type { ConfirmChannel, ConsumeMessage } from 'amqplib';
import { publishConfirmed, publishQueueConfirmed } from '../utils/confirmedPublish';

export const MAX_NOTIFICATION_RETRIES = 5;

export function notificationRetryDelay(retryCount: number): number {
  return Math.min(30_000, 1000 * 2 ** Math.max(0, retryCount));
}

export function shouldRetryNotification(retryCount: number): boolean {
  return retryCount < MAX_NOTIFICATION_RETRIES;
}

export const NOTIFICATION_ROUTING_KEYS = [
  'notification.email.request',
  'notification.whatsapp.request',
  'notification.in_app.request',
] as const;

export function validateNotificationJob(
  routingKey: string,
  job: Record<string, unknown>,
  eventId?: string,
): string | null {
  if (routingKey === 'notification.email.request') {
    if (typeof job.recipient !== 'string' || !job.recipient.trim())
      return 'Invalid email recipient';
    if (typeof job.body !== 'string' || !job.body.trim()) return 'Invalid email body';
  } else if (routingKey === 'notification.whatsapp.request') {
    if (typeof job.recipient !== 'string' || !job.recipient.trim())
      return 'Invalid WhatsApp recipient';
    if (typeof job.body !== 'string' || !job.body.trim()) return 'Invalid WhatsApp body';
  } else {
    if (typeof eventId !== 'string' || !eventId.trim() || eventId.length > 100) {
      return 'Invalid or missing event ID';
    }
    if (typeof job.title !== 'string' || !job.title.trim()) return 'Invalid in-app title';
    if (typeof job.message !== 'string' || !job.message.trim()) return 'Invalid in-app message';
    if (job.type !== undefined && typeof job.type !== 'string') return 'Invalid in-app type';
    if (job.notifyAdmins !== undefined && typeof job.notifyAdmins !== 'boolean') {
      return 'Invalid notifyAdmins flag';
    }
    if (job.recipients !== undefined && !Array.isArray(job.recipients)) {
      return 'In-app recipients must be an array';
    }
    if (
      Array.isArray(job.recipients) &&
      job.recipients.some((id: unknown) => typeof id !== 'string' || !id.trim())
    ) {
      return 'In-app recipient IDs must be non-empty strings';
    }
    if ((!job.recipients || job.recipients.length === 0) && job.notifyAdmins !== true) {
      return 'In-app job has no recipients';
    }
  }
  return null;
}

/** Preserve the actual exchange route and confirm replacement before acking its delivery. */
export async function republishNotificationRetry(
  channel: ConfirmChannel,
  msg: ConsumeMessage,
  routingKey: string,
  retryCount: number,
  exchange = 'domain_events',
): Promise<void> {
  await publishConfirmed(channel, exchange, routingKey, msg.content, {
    messageId: msg.properties.messageId,
    headers: { ...(msg.properties.headers || {}), 'x-retry-count': retryCount + 1 },
  });
}

/** Ack the old delivery only after confirmed replacement; failures leave it recoverable. */
export async function retryNotificationDelivery(
  channel: ConfirmChannel,
  msg: ConsumeMessage,
  routingKey: string,
  retryCount: number,
  exchange = 'domain_events',
): Promise<boolean> {
  try {
    await republishNotificationRetry(channel, msg, routingKey, retryCount, exchange);
    channel.ack(msg);
    return true;
  } catch {
    try {
      channel.nack(msg, false, true);
    } catch {
      // Closing the channel returns all unacked deliveries to RabbitMQ.
    }
    return false;
  }
}

/** Quarantine durable before ack; failure requeues instead of discarding the source. */
export async function quarantineNotification(
  channel: ConfirmChannel,
  msg: ConsumeMessage,
  reason: string,
  queue = 'notification_dead_letter_queue',
): Promise<boolean> {
  try {
    await publishQueueConfirmed(channel, queue, msg.content, {
      headers: {
        ...(msg.properties.headers || {}),
        'x-original-routing-key': msg.fields.routingKey,
        'x-dead-letter-reason': reason.slice(0, 500),
      },
    });
    channel.ack(msg);
    return true;
  } catch {
    try {
      channel.nack(msg, false, true);
    } catch {
      // Closing the channel returns all unacked deliveries to RabbitMQ.
    }
    return false;
  }
}
