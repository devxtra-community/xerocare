import { getRabbitChannel } from '../config/rabbitmq';
import { logger } from '../config/logger';

const DLQ = 'dlq.inventory';
const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export async function startDLQMonitor() {
  logger.info('[DLQ MONITOR] Starting Dead Letter Queue monitor...');

  const checkDLQ = async () => {
    try {
      const channel = await getRabbitChannel();
      const info = await channel.checkQueue(DLQ);
      if (info.messageCount > 0) {
        logger.error(
          `[DLQ ALERT] Dead Letter Queue '${DLQ}' has ${info.messageCount} failed message(s)! Attention required.`,
        );
      } else {
        logger.info(`[DLQ MONITOR] Checked DLQ '${DLQ}': 0 failed messages.`);
      }
    } catch (error) {
      logger.error('[DLQ MONITOR] Failed to check Dead Letter Queue', error);
    }
  };

  // Run immediately on start, then periodically
  await checkDLQ();
  setInterval(checkDLQ, INTERVAL_MS);
}
