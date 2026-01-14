import amqp from 'amqplib';
import { logger } from './logger';

let channel: amqp.Channel;

export const getRabbitChannel = async () => {
  if (channel) return channel;

  const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://127.0.0.1', {
    timeout: 3000,
  });

  channel = await connection.createChannel();

  await channel.assertQueue('email_queue', {
    durable: true,
  });

  logger.info('RabbitMQ connected');

  return channel;
};
