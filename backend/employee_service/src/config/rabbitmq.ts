import amqp from 'amqplib';
import { logger } from './logger';

let channel: amqp.Channel;

export const getRabbitChannel = async () => {
  if (channel) return channel;

  const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost', {
    timeout: 3000,
  });

  channel = await connection.createChannel();

  // Assert queue and exchange
  // Assert queue and exchange
  await channel.assertQueue('email_queue', { durable: true });
  await channel.assertQueue('notification_queue', { durable: true }); // NEW: Dedicated queue for notifications
  await channel.assertExchange('domain_events', 'topic', { durable: true });

  // Bind queue to exchange for specific routing keys
  // notification.# catches notification.email.request AND notification.whatsapp.request
  await channel.bindQueue('notification_queue', 'domain_events', 'notification.#');

  logger.info('RabbitMQ connected');

  return channel;
};
