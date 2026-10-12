import amqp from 'amqplib';
import { logger } from './logger';

let channel: amqp.ConfirmChannel;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let connection: any;

export async function createRabbitChannel(): Promise<amqp.ConfirmChannel> {
  await getRabbitChannel();
  return await connection.createConfirmChannel();
}

export async function getRabbitChannel(
  maxAttempts = Number.POSITIVE_INFINITY,
): Promise<amqp.ConfirmChannel> {
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
        channel = null as unknown as amqp.ConfirmChannel;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        connection = null as any;
      });

      connection.on('close', () => {
        logger.warn('RabbitMQ connection closed');
        channel = null as unknown as amqp.ConfirmChannel;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        connection = null as any;
      });

      channel = await connection.createConfirmChannel();

      channel.on('error', (err) => {
        logger.error('RabbitMQ channel error', err);
        channel = null as unknown as amqp.ConfirmChannel;
      });

      channel.on('close', () => {
        logger.warn('RabbitMQ channel closed');
        channel = null as unknown as amqp.ConfirmChannel;
      });

      await channel.assertQueue('email_queue', { durable: true });

      logger.info('RabbitMQ connected successfully.');
      return channel;
    } catch (error: unknown) {
      const err = error as Error & { code?: string };
      logger.error(`RabbitMQ connection failed on attempt ${attempt}: ${err.code || err.message}`);
      logger.info(`Waiting ${delay / 1000} seconds before retrying...`);
      if (attempt >= maxAttempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay));
      attempt++;
      delay = Math.min(delay * 2, 30000);
    }
  }

  return channel;
}

export async function closeRabbitConnection(): Promise<void> {
  const activeConnection = connection;
  connection = null;
  channel = null as unknown as amqp.ConfirmChannel;
  if (activeConnection) await activeConnection.close();
}
