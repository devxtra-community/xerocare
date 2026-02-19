import { getRabbitChannel } from '../config/rabbitmq';
import { logger } from '../config/logger';

/**
 * Internal Email Worker for Billing Service.
 * DEPRECATED: Most email tasks are now routed to employee_service via NotificationPublisher.
 * This worker remains for purely internal billing-specific background tasks if any.
 */
export const startEmailWorker = async () => {
  try {
    const channel = await getRabbitChannel();
    await channel.assertQueue('email_queue', { durable: true });

    logger.info('Billing Email Worker (Internal) started');

    channel.consume('email_queue', async (msg) => {
      if (msg) {
        try {
          const content = JSON.parse(msg.content.toString());
          logger.info(
            `[Internal Email Worker] Received task: ${content.type}. Note: This worker is legacy, use NotificationPublisher.`,
          );

          // No active tasks remain here as they've been moved to centralized notification system.

          channel.ack(msg);
        } catch (error) {
          logger.error('Error processing internal email message', error);
          channel.ack(msg);
        }
      }
    });
  } catch (error) {
    logger.error('Failed to start Internal Email Worker', error);
  }
};
