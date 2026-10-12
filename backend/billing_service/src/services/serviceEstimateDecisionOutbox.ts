import { Source } from '../config/dataSource';
import { getRabbitChannel } from '../config/rabbitmq';
import { publishConfirmed } from '../utils/publishConfirmed';
import { logger } from '../config/logger';
import { serviceDecisionRetryDelay } from './serviceEstimateDecision';

const EXCHANGE = 'domain_events';
const ROUTING_KEY = 'billing.service-estimate.finance-decision';
let running = false;

export async function flushServiceEstimateDecisionOutbox(limit = 25): Promise<number> {
  if (running || !Source.isInitialized) return 0;
  running = true;
  let published = 0;
  try {
    const rows = await Source.transaction(async (manager) => {
      const claimed = await manager.query(
        `SELECT event_id, payload, attempts
           FROM billing_service_estimate_decision_outbox
          WHERE delivered_at IS NULL AND available_at <= NOW()
            AND (lease_until IS NULL OR lease_until < NOW())
          ORDER BY created_at
          FOR UPDATE SKIP LOCKED LIMIT $1`,
        [limit],
      );
      for (const row of claimed) {
        await manager.query(
          `UPDATE billing_service_estimate_decision_outbox
              SET attempts = attempts + 1, lease_until = NOW() + INTERVAL '30 seconds'
            WHERE event_id = $1`,
          [row.event_id],
        );
      }
      return claimed;
    });
    if (rows.length === 0) return 0;
    let channel;
    try {
      channel = await getRabbitChannel(1);
    } catch (error) {
      for (const row of rows) {
        const delay = serviceDecisionRetryDelay(Number(row.attempts) + 1);
        await Source.query(
          `UPDATE billing_service_estimate_decision_outbox
              SET available_at = NOW() + ($2::text || ' milliseconds')::interval,
                  lease_until = NULL, last_error = $3
            WHERE event_id = $1`,
          [row.event_id, delay, String(error).slice(0, 2000)],
        );
      }
      return 0;
    }
    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
    for (const row of rows) {
      try {
        await publishConfirmed(
          channel,
          EXCHANGE,
          ROUTING_KEY,
          Buffer.from(JSON.stringify(row.payload)),
          {
            messageId: row.event_id,
            persistent: true,
          },
        );
        await Source.query(
          `UPDATE billing_service_estimate_decision_outbox
              SET delivered_at = NOW(), lease_until = NULL, last_error = NULL
            WHERE event_id = $1`,
          [row.event_id],
        );
        published++;
      } catch (error) {
        const delay = serviceDecisionRetryDelay(Number(row.attempts) + 1);
        await Source.query(
          `UPDATE billing_service_estimate_decision_outbox
              SET available_at = NOW() + ($2::text || ' milliseconds')::interval,
                  lease_until = NULL, last_error = $3
            WHERE event_id = $1`,
          [row.event_id, delay, String(error).slice(0, 2000)],
        );
        logger.error('Service estimate decision outbox publish failed', {
          eventId: row.event_id,
          error,
        });
      }
    }
  } finally {
    running = false;
  }
  return published;
}

export function startServiceEstimateDecisionOutbox() {
  const run = () =>
    void flushServiceEstimateDecisionOutbox().catch((error) =>
      logger.error('Service estimate decision outbox poll failed', error),
    );
  run();
  setInterval(run, 1000);
}
