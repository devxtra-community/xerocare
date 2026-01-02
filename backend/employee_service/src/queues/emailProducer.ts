import { getRabbitChannel } from "../config/rabbitmq";

export type EmailJob =
  | { type: "OTP"; email: string; otp: string }
  | { type: "MAGIC"; email: string; link: string }
  | { type: "WELCOME"; email: string; password: string }
  | { type: "VENDOR_WELCOME"; email: string; vendorName: string };

export const publishEmailJob = async (job: EmailJob) => {
  const channel = await getRabbitChannel();

  channel.sendToQueue(
    "email_queue",
    Buffer.from(JSON.stringify(job)),
    { persistent: true }
  );
};
