import amqp from 'amqplib';

let channel: amqp.Channel;

export const getRabbitChannel = async () => {
  if (channel) return channel;

  const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost', {
    timeout: 3000,
  });

  channel = await connection.createChannel();

  await channel.assertQueue('email_queue', {
    durable: true,
  });

  console.log('RabbitMQ connected');

  return channel;
};
