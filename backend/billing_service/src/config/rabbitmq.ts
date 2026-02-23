import * as amqp from 'amqplib';
import { logger } from './logger';

let channel: amqp.Channel | null = null;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let connection: amqp.Connection | null = null;

const connect = async (): Promise<amqp.Channel> => {
  try {
    // If we have a working channel, return it
    if (channel) return channel;

    // Retry connection if needed
    const conn = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://127.0.0.1', {
      timeout: 5000, // 5 seconds timeout
    });
    // @ts-expect-error - mismatch in amqplib types
    connection = conn;

    conn.on('error', (err) => {
      logger.error('RabbitMQ connection error', err);
      connection = null;
      channel = null;
    });

    conn.on('close', () => {
      logger.warn('RabbitMQ connection closed');
      connection = null;
      channel = null;
    });

    const ch = await conn.createChannel();
    channel = ch;

    ch.on('error', (err) => {
      logger.error('RabbitMQ channel error', err);
      channel = null;
    });

    ch.on('close', () => {
      logger.warn('RabbitMQ channel closed');
      channel = null;
    });

    await ch.assertQueue('email_queue', {
      durable: true,
    });

    // Also assert exchange here to be safe
    await ch.assertExchange('domain_events', 'topic', { durable: true });

    logger.info('RabbitMQ connected');
    return ch;
  } catch (error) {
    logger.error('Failed to connect to RabbitMQ', error);
    // If connection failed, ensure we clean up
    connection = null;
    channel = null;
    throw error;
  }
};

export const getRabbitChannel = async (): Promise<amqp.Channel> => {
  if (channel) return channel;
  return await connect();
};
