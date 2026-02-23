import amqp from 'amqplib';

let channel: amqp.Channel;

export async function getRabbitChannel() {
  if (channel) return channel;

  const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://127.0.0.1');

  channel = await connection.createChannel();

  await channel.assertQueue('email_queue', { durable: true });

  return channel;
}
