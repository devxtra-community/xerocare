import { Source } from '../config/db';
import { NotificationPublisher } from '../events/publisher/notificationPublisher';
import { logger } from '../config/logger';

let running = false;

export async function flushServiceDecisionNotifications(limit = 25): Promise<number> {
  if (running || !Source.isInitialized) return 0;
  running = true;
  let sent = 0;
  try {
    const rows = await Source.transaction(async (manager) => {
      const claimed = await manager.query(
        `SELECT event_id, recipient_ids, payload, attempts
           FROM service_decision_notification_outbox
          WHERE delivered_at IS NULL AND available_at <= NOW()
            AND (lease_until IS NULL OR lease_until < NOW())
          ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT $1`,
        [limit],
      );
      for (const row of claimed)
        await manager.query(
          `UPDATE service_decision_notification_outbox SET attempts=attempts+1, lease_until=NOW()+INTERVAL '30 seconds' WHERE event_id=$1`,
          [row.event_id],
        );
      return claimed;
    });
    for (const row of rows) {
      try {
        const payload = row.payload;
        await NotificationPublisher.publishInAppRequest(
          {
            recipientIds: row.recipient_ids,
            title: payload.title,
            message: payload.message,
            type: payload.type,
            referenceId: payload.referenceId,
            referenceType: payload.referenceType,
            referenceData: payload.data,
            notificationEventId: row.event_id,
          },
          1,
        );
        await Source.query(
          `UPDATE service_decision_notification_outbox SET delivered_at=NOW(), lease_until=NULL, last_error=NULL WHERE event_id=$1`,
          [row.event_id],
        );
        sent++;
      } catch (error) {
        const delay = Math.min(300_000, 1000 * 2 ** Math.max(0, Number(row.attempts)));
        await Source.query(
          `UPDATE service_decision_notification_outbox
              SET available_at=NOW()+($2::text || ' milliseconds')::interval, lease_until=NULL, last_error=$3
            WHERE event_id=$1`,
          [row.event_id, delay, String(error).slice(0, 2000)],
        );
        logger.error('Service decision notification publish failed', {
          eventId: row.event_id,
          error,
        });
      }
    }
  } finally {
    running = false;
  }
  return sent;
}

export function startServiceDecisionNotificationOutbox() {
  const run = () =>
    void flushServiceDecisionNotifications().catch((error) =>
      logger.error('Service decision notification outbox poll failed', error),
    );
  run();
  setInterval(run, 1000);
}
