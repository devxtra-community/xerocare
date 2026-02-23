import 'dotenv/config';
import { getRabbitChannel } from '../config/rabbitmq';
import {
  sendOtpMail,
  sendMagicLinkMail,
  sendEmployeeWelcomeMail,
  sendVendorWelcomeMail,
  sendLoginAlertMail,
  sendProductRequestMail,
} from '../utils/mailer';

import { logger } from '../config/logger';

export const startWorker = async () => {
  const channel = await getRabbitChannel();

  channel.consume('email_queue', async (msg) => {
    if (!msg) return;

    const job = JSON.parse(msg.content.toString());
    const routingKey = msg.fields.routingKey;

    logger.info(`[Email Worker] Received message`, { routingKey, job });

    // For email events, we expect 'email'
    if (!job.email) {
      logger.error('Invalid email job: Missing email', { job });
      channel.ack(msg);
      return;
    }

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

      if (job.type === 'REQUEST_PRODUCTS') {
        await sendProductRequestMail(job.email, job.vendorName, job.productList, job.message);
      }

      channel.ack(msg);
    } catch (err) {
      logger.error('Email worker failed to process message', err);
      // Determine if we should ack or nack based on error.
      // For now, ack to prevent loop, but logging is critical.
      channel.ack(msg);
    }
  });

  // NEW: Consumer for Notification Queue (Billing/System Notifications)
  channel.consume('notification_queue', async (msg) => {
    if (!msg) return;

    const job = JSON.parse(msg.content.toString());
    const routingKey = msg.fields.routingKey;

    logger.info(`[Notification Worker] Received message`, { routingKey, job });

    if (!job.recipient) {
      logger.error('Invalid notification job: Missing recipient', { job });
      channel.ack(msg);
      return;
    }

    try {
      if (routingKey === 'notification.email.request') {
        // Payload: { recipient, subject, body, invoiceId... }
        const { recipient, subject, body } = job;
        if (recipient && body) {
          // Import dynamically to avoid circular issues if any
          const { sendEmail } = await import('../utils/mailer');
          await sendEmail(recipient, subject || 'Notification from XeroCare', body);
          logger.info(`[Notification Worker] Email sent to ${recipient}`);
        }
      } else if (routingKey === 'notification.whatsapp.request') {
        // Payload: { recipient, body, invoiceId... }
        const { recipient, body } = job;
        if (recipient && body) {
          const { sendWhatsappMessage } = await import('../utils/whatsapp');
          await sendWhatsappMessage(recipient, body);
          logger.info(`[Notification Worker] WhatsApp processed for ${recipient}`);
        }
      }

      channel.ack(msg);
    } catch (err) {
      logger.error('Notification worker failed to process message', err);
      channel.ack(msg);
    }
  });

  logger.info('Email worker started and listening for jobs');
};
