import "dotenv/config";
import { getRabbitChannel } from "../config/rabbitmq";
import {
  sendOtpMail,
  sendMagicLinkMail,
  sendEmployeeWelcomeMail,
  sendVendorWelcomeMail,
} from "../utlis/mailer";
import { OtpPurpose } from "../constants/otpPurpose";


export const startWorker = async () => {
  const channel = await getRabbitChannel();

  channel.consume("email_queue", async (msg) => {
    if (!msg) return;

    const job = JSON.parse(msg.content.toString());

    try {
      if (job.type === "OTP") {
        await sendOtpMail(job.email, job.otp, OtpPurpose.LOGIN);
      }

      if (job.type === "MAGIC") {
        await sendMagicLinkMail(job.email, job.link);
      }

      if (job.type === "WELCOME") {
        await sendEmployeeWelcomeMail(job.email, job.password);
      }

      if (job.type === "VENDOR_WELCOME") {
        await sendVendorWelcomeMail(job.email, job.vendorName);
      }


      channel.ack(msg);
    } catch (err) {
      console.error("Email failed", err);
    }
  });

  console.log("Email worker running");
};

