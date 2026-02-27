import amqp from 'amqplib';
import { logger } from './logger';

let channel: amqp.Channel;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let connection: any;

export async function getRabbitChannel() {
  if (channel) return channel;

  let attempt = 1;
  let delay = 2000;

  while (!channel) {
    try {
      logger.info(`Attempting RabbitMQ connection (Attempt ${attempt})...`);
      connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://127.0.0.1');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      connection.on('error', (err: any) => {
        logger.error('RabbitMQ connection error', err);
        channel = null as unknown as amqp.Channel;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        connection = null as any;
      });

      connection.on('close', () => {
        logger.warn('RabbitMQ connection closed');
        channel = null as unknown as amqp.Channel;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        connection = null as any;
      });

      channel = await connection.createChannel();

      channel.on('error', (err) => {
        logger.error('RabbitMQ channel error', err);
        channel = null as unknown as amqp.Channel;
      });

      channel.on('close', () => {
        logger.warn('RabbitMQ channel closed');
        channel = null as unknown as amqp.Channel;
      });

      // Consume from topic
      await channel.assertExchange('customer_events', 'topic', { durable: true });
      const q = await channel.assertQueue('api_gateway_customer_updates', { durable: true });

      // Bind queue
      await channel.bindQueue(q.queue, 'customer_events', 'customer.updated');

      logger.info('RabbitMQ connected successfully.');
      return channel;
    } catch (error: unknown) {
      const err = error as Error & { code?: string };
      logger.error(`RabbitMQ connection failed on attempt ${attempt}: ${err.code || err.message}`);
      logger.info(`Waiting ${delay / 1000} seconds before retrying...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      attempt++;
      delay = Math.min(delay * 2, 30000);
    }
  }

  return channel;
}
