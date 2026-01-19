import { getRabbitChannel } from '../config/rabbitmq';
export type EmailJob = { type: 'VENDOR_WELCOME'; email: string; vendorName: string };

export async function publishEmailJob(job: EmailJob) {
  const ch = await getRabbitChannel();

  ch.sendToQueue('email_queue', Buffer.from(JSON.stringify(job)), { persistent: true });
}
