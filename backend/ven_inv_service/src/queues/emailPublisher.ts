import { getRabbitChannel } from '../config/rabbitmq';
export type EmailJob =
  | { type: 'VENDOR_WELCOME'; email: string; vendorName: string }
  | {
      type: 'REQUEST_PRODUCTS';
      email: string;
      vendorName: string;
      productList: string;
      message: string;
    };

export async function publishEmailJob(job: EmailJob) {
  const ch = await getRabbitChannel();

  ch.sendToQueue('email_queue', Buffer.from(JSON.stringify(job)), { persistent: true });
}
