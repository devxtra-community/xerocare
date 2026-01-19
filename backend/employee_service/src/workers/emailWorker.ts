import 'dotenv/config';
import { getRabbitChannel } from '../config/rabbitmq';
import {
  sendOtpMail,
  sendMagicLinkMail,
  sendEmployeeWelcomeMail,
  sendVendorWelcomeMail,
  sendLoginAlertMail,
} from '../utlis/mailer';

import { logger } from '../config/logger';

export const startWorker = async () => {
  const channel = await getRabbitChannel();

  channel.consume('email_queue', async (msg) => {
    if (!msg) return;

    const job = JSON.parse(msg.content.toString());

    try {
      if (job.type === 'OTP') {
        await sendOtpMail(job.email, job.otp);
      }

      if (job.type === 'MAGIC') {
        await sendMagicLinkMail(job.email, job.link);
      }

      if (job.type === 'WELCOME') {
        await sendEmployeeWelcomeMail(job.email, job.password);
      }

      if (job.type === 'VENDOR_WELCOME') {
        await sendVendorWelcomeMail(job.email, job.vendorName);
      }

      if (job.type === 'LOGIN_ALERT') {
        await sendLoginAlertMail(job.email, {
          device: job.device,
          browser: job.browser,
          os: job.os,
          ip: job.ip,
          time: job.time,
        });
      }

      channel.ack(msg);
    } catch (err) {
      logger.error('Email worker failed to send email', err);
    }
  });

  logger.info('Email worker started and listening for jobs');
};
