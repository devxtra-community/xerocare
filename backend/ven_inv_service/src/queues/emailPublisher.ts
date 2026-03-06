import { getRabbitChannel } from '../config/rabbitmq';
export type EmailJob =
  | { type: 'VENDOR_WELCOME'; email: string; vendorName: string }
  | {
      type: 'REQUEST_PRODUCTS';
      email: string;
      vendorName: string;
      productList: string;
      message: string;
    }
  | {
      type: 'RFQ_SENT';
      email: string;
      vendorName: string;
      rfqNumber: string;
      excelBuffer: Buffer;
    }
  | {
      type: 'RFQ_AWARDED';
      email: string;
      vendorName: string;
      rfqNumber: string;
    }
  | {
      type: 'RFQ_REJECTED';
      email: string;
      vendorName: string;
      rfqNumber: string;
    };

export async function publishEmailJob(job: EmailJob) {
  const ch = await getRabbitChannel();

  ch.sendToQueue('email_queue', Buffer.from(JSON.stringify(job)), { persistent: true });
}
