import { getRabbitChannel } from '../../config/rabbitmq';
import { redis } from '../../config/redis';
import { logger } from '../../config/logger';

export const startCustomerConsumer = async () => {
  try {
    const channel = await getRabbitChannel();
    const q = 'api_gateway_customer_updates';

    channel.consume(q, async (msg) => {
      if (msg) {
        try {
          const content = JSON.parse(msg.content.toString());
          const { id, name } = content;

          if (id && name) {
            // Update Redis cache
            // Key format: customer:{id} -> name
            await redis.set(`customer:${id}`, name);
            logger.info(`Updated customer cache via RabbitMQ: ${id} -> ${name}`);
          }

          channel.ack(msg);
        } catch (err) {
          logger.error('Error processing customer update message', err);
          channel.nack(msg, false, false); // Do not requeue bad messages
        }
      }
    });

    logger.info('Customer consumer started');
  } catch (error) {
    logger.error('Failed to start customer consumer', error);
  }
};
