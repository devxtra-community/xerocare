import { getRabbitChannel } from '../../config/rabbitmq';
import { logger } from '../../config/logger';

export const publishCustomerUpdated = async (data: { id: string; name: string }) => {
  try {
    const channel = await getRabbitChannel();
    const exchange = 'customer_events';
    const routingKey = 'customer.updated';

    // Ensure exchange exists
    await channel.assertExchange(exchange, 'topic', { durable: true });

    channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(data)));

    logger.info(`Event published: ${routingKey}`, data);
  } catch (error) {
    logger.error('Failed to publish customer updated event', error);
  }
};
