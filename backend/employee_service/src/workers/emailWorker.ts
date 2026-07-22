import 'dotenv/config';
import { getRabbitChannel } from '../config/rabbitmq';
import {
  sendOtpMail,
  sendMagicLinkMail,
  sendEmployeeWelcomeMail,
  sendVendorWelcomeMail,
  sendLoginAlertMail,
  sendProductRequestMail,
  sendRfqAwardedMail,
  sendRfqRejectedMail,
} from '../utils/mailer';

import { logger } from '../config/logger';

const MAX_EMAIL_RETRIES = 5;

export const startWorker = async () => {
  const channel = await getRabbitChannel();

  // Limit in-flight messages so a retry storm can't hot-loop the worker
  await channel.prefetch(5);

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
        await sendOtpMail(job.email, job.otp, job.purpose);
      }

      if (job.type === 'MAGIC') {
        await sendMagicLinkMail(job.email, job.link);
      }

      if (job.type === 'WELCOME') {
        logger.info(`Sending welcome mail to: ${job.email}`);
        await sendEmployeeWelcomeMail(job.email, job.password);
        logger.info(`Successfully sent welcome mail to: ${job.email}`);
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

      if (job.type === 'RFQ_SENT') {
        const { sendRfqExcelMail } = await import('../utils/mailer');
        // Handle buffer conversion if serialized as JSON
        const buffer =
          job.excelBuffer.type === 'Buffer'
            ? Buffer.from(job.excelBuffer.data)
            : Buffer.from(job.excelBuffer);

        await sendRfqExcelMail(job.email, job.vendorName, job.rfqNumber, buffer);
      }

      if (job.type === 'RFQ_AWARDED') {
        await sendRfqAwardedMail(job.email, job.vendorName, job.rfqNumber);
        logger.info(`Successfully sent order confirmation mail to: ${job.email}`);
      }

      if (job.type === 'RFQ_REJECTED') {
        await sendRfqRejectedMail(job.email, job.vendorName, job.rfqNumber);
        logger.info(`Successfully sent rejection mail to: ${job.email}`);
      }

      channel.ack(msg);
    } catch (err: unknown) {
      logger.error('Email worker failed to process message', err);

      const error = err as { code?: string; responseCode?: number };
      // Handle transient errors (DNS, network) with a delayed, capped retry.
      // A plain nack-requeue redelivers instantly and melts the worker when
      // the SMTP host is unreachable for more than a moment.
      const isTransient =
        error.code === 'EAI_AGAIN' ||
        error.code === 'ECONNRESET' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ESOCKET' ||
        error.code === 'ECONNECTION' ||
        error.code === 'ENETUNREACH' ||
        error.code === 'EHOSTUNREACH' ||
        error.responseCode === 421; // SMTP 421: Service busy

      const retryCount = Number(msg.properties.headers?.['x-retry-count'] || 0);

      if (isTransient && retryCount < MAX_EMAIL_RETRIES) {
        const delayMs = Math.min(30_000, 1000 * 2 ** retryCount);
        logger.info(
          `Transient error, retrying email job in ${delayMs}ms (attempt ${retryCount + 1}/${MAX_EMAIL_RETRIES})`,
          { email: job.email, type: job.type, errorCode: error.code },
        );
        setTimeout(() => {
          try {
            channel.sendToQueue('email_queue', msg.content, {
              persistent: true,
              headers: { ...(msg.properties.headers || {}), 'x-retry-count': retryCount + 1 },
            });
            channel.ack(msg);
          } catch (republishErr) {
            logger.error('Failed to requeue email job, nacking instead', republishErr);
            channel.nack(msg, false, true);
          }
        }, delayMs);
      } else {
        if (isTransient) {
          logger.error(
            `Email job dropped after ${MAX_EMAIL_RETRIES} failed attempts (SMTP unreachable)`,
            { email: job.email, type: job.type, errorCode: error.code },
          );
        }
        // Fatal error, unknown, or retries exhausted: ack to prevent infinite loop
        channel.ack(msg);
      }
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
        // Payload: { recipient, subject, body, invoiceId, attachments }
        const { recipient, subject, body, attachments } = job;
        if (recipient && body) {
          // Import dynamically to avoid circular issues if any
          const { sendEmail } = await import('../utils/mailer');
          await sendEmail(recipient, subject || 'Notification from XeroCare', body, attachments);
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
      } else if (routingKey === 'notification.in_app.request') {
        const { recipients, notifyAdmins, title, message, type, data } = job;

        const { Source } = await import('../config/dataSource');
        const { Notification } = await import('../entities/notificationEntity');
        const repo = Source.getRepository(Notification);

        let targetIds: string[] = [];
        if (recipients && Array.isArray(recipients)) {
          targetIds.push(...recipients);
        }

        if (notifyAdmins) {
          const { Admin } = await import('../entities/adminEntities');
          const admins = await Source.getRepository(Admin).find();
          targetIds.push(...admins.map((a) => a.id));
        }

        targetIds = [...new Set(targetIds)];

        if (targetIds.length > 0) {
          const notifications = targetIds.map((empId: string) =>
            repo.create({
              employee_id: empId,
              title,
              message,
              type: type || 'INFO',
              data: data || null,
            }),
          );
          await repo.save(notifications);
          logger.info(
            `[Notification Worker] In-app notifications saved for ${targetIds.length} users.`,
          );
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
