import amqp from 'amqplib';

let channel: amqp.Channel;

export async function getRabbitChannel() {
  if (channel) return channel;

  const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');

  channel = await connection.createChannel();

  // Consume from topic
  await channel.assertExchange('customer_events', 'topic', { durable: true });
  const q = await channel.assertQueue('api_gateway_customer_updates', { durable: true });

  // Bind queue
  await channel.bindQueue(q.queue, 'customer_events', 'customer.updated');

  return channel;
}
