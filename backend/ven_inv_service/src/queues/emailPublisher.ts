import amqp from 'amqplib';

let channel: amqp.Channel;

async function getRabbitChannel() {
  if (channel) return channel;

  const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');

  channel = await connection.createChannel();

  await channel.assertQueue('email_queue', { durable: true });

  return channel;
}

export type EmailJob = { type: 'VENDOR_WELCOME'; email: string; vendorName: string };

export async function publishEmailJob(job: EmailJob) {
  const ch = await getRabbitChannel();

  ch.sendToQueue('email_queue', Buffer.from(JSON.stringify(job)), { persistent: true });
}
