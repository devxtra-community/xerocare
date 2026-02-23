import amqp from 'amqplib';

let channel: amqp.Channel;

export async function getRabbitChannel() {
  if (channel) return channel;

  const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://127.0.0.1');

  channel = await connection.createChannel();

  // Assert a topic exchange for customer events
  await channel.assertExchange('customer_events', 'topic', { durable: true });

  return channel;
}
