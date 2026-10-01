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
const MAX_NOTIFICATION_RETRIES = 5;

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
        await sendRfqAwardedMail(
          job.email,
          job.vendorName,
          job.rfqNumber,
          job.warehouseName,
          job.warehouseAddress,
          job.warehouseLocation,
        );
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

    // Email/WhatsApp jobs carry a singular `recipient`; in-app jobs carry a
    // `recipients` array (and/or a `notifyAdmins` broadcast flag) instead — this
    // guard previously only accepted the singular field, so every in-app job
    // (routingKey === 'notification.in_app.request') failed it and was silently
    // dropped here before ever reaching the branch that actually saves it.
    const hasRecipient =
      !!job.recipient ||
      (Array.isArray(job.recipients) && job.recipients.length > 0) ||
      job.notifyAdmins === true;
    if (!hasRecipient) {
      logger.error('Invalid notification job: Missing recipient', { job });
      channel.ack(msg);
      return;
    }

    try {
      if (routingKey === 'notification.email.request') {
        // Payload: { recipient, subject, body, invoiceId, attachments }
        const { recipient, subject, body, text, attachmentUrl, attachments } = job;
        // A job missing its destination or content used to fall through these
        // guards and be acked as if it had been delivered. It wasn't — the
        // customer just never received it — so that is now a failure, not a
        // no-op.
        if (!recipient || !body) {
          throw new Error(
            `Malformed email notification job (recipient=${!!recipient}, body=${!!body})`,
          );
        }
        // Import dynamically to avoid circular issues if any
        const { sendEmail } = await import('../utils/mailer');
        // attachmentUrl is part of the notification event contract (invoice PDF,
        // receipt, or customer action link). It was previously discarded here, so
        // URLs sent by producers never appeared in the customer's email.
        const safeUrl = typeof attachmentUrl === 'string' ? attachmentUrl.trim() : '';
        const urlHtml = safeUrl
          ? `<p style="margin-top:20px;word-break:break-all"><a href="${safeUrl.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}">View or download your document</a><br><span>${safeUrl.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span></p>`
          : '';
        const emailHtml = urlHtml && !body.includes(safeUrl) ? `${body}${urlHtml}` : body;
        const emailText = [
          text ||
            body
              .replace(/<[^>]*>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim(),
          safeUrl,
        ]
          .filter(Boolean)
          .join('\n\n');
        await sendEmail(
          recipient,
          subject || 'Notification from XeroCare',
          emailHtml,
          attachments,
          emailText,
        );
        logger.info(`[Notification Worker] Email sent to ${recipient}`);
      } else if (routingKey === 'notification.whatsapp.request') {
        // Payload: { recipient, body, invoiceId... }
        const { recipient, body } = job;
        if (!recipient || !body) {
          throw new Error(
            `Malformed WhatsApp notification job (recipient=${!!recipient}, body=${!!body})`,
          );
        }
        const { sendWhatsappMessage } = await import('../utils/whatsapp');
        await sendWhatsappMessage(recipient, body);
        logger.info(`[Notification Worker] WhatsApp sent to ${recipient}`);
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

      const error = err as { code?: string; responseCode?: number };
      // Same transient/fatal split the email_queue consumer above uses. Acking on
      // the first failure — which is what this did — dropped the customer's
      // message permanently: the API had already answered "queued", this log line
      // was the only trace, and nobody was told the link never arrived.
      const isTransient =
        error.code === 'EAI_AGAIN' ||
        error.code === 'ECONNRESET' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ESOCKET' ||
        error.code === 'ECONNECTION' ||
        error.code === 'ENETUNREACH' ||
        error.code === 'EHOSTUNREACH' ||
        error.code === 'ECONNREFUSED' ||
        error.code === 'ABORT_ERR' ||
        error.responseCode === 421 ||
        (typeof error.responseCode === 'number' && error.responseCode >= 500);

      const retryCount = Number(msg.properties.headers?.['x-retry-count'] || 0);

      if (isTransient && retryCount < MAX_NOTIFICATION_RETRIES) {
        const delayMs = Math.min(30_000, 1000 * 2 ** retryCount);
        logger.info(
          `Transient notification failure, retrying in ${delayMs}ms (attempt ${retryCount + 1}/${MAX_NOTIFICATION_RETRIES})`,
          { routingKey, recipient: job.recipient, errorCode: error.code },
        );
        setTimeout(() => {
          try {
            channel.sendToQueue('notification_queue', msg.content, {
              persistent: true,
              headers: { ...(msg.properties.headers || {}), 'x-retry-count': retryCount + 1 },
            });
            channel.ack(msg);
          } catch (republishErr) {
            logger.error('Failed to requeue notification job, nacking instead', republishErr);
            channel.nack(msg, false, true);
          }
        }, delayMs);
        return;
      }

      // Permanent failure (or retries exhausted). Tell the employee who asked for
      // the send, so a delivery failure is visible in the app instead of only in
      // server logs.
      await notifySenderOfDeliveryFailure(channel, job, routingKey, err).catch((notifyErr) =>
        logger.error('Failed to report notification delivery failure', notifyErr),
      );

      channel.ack(msg);
    }
  });

  logger.info('Email worker started and listening for jobs');
};

/**
 * Turns a silent delivery failure into something the requester can see.
 *
 * Every customer-facing send is answered "queued" long before the provider has
 * accepted anything, so without this the only record of a failed delivery is a log
 * line. When the publisher told us who asked for the send, we raise an in-app
 * notification for them telling them to retry on a working channel.
 */
async function notifySenderOfDeliveryFailure(
  channel: Awaited<ReturnType<typeof getRabbitChannel>>,
  job: {
    requestedBy?: string;
    recipient?: string;
    subject?: string;
  },
  routingKey: string,
  err: unknown,
): Promise<void> {
  if (!job.requestedBy) return;

  const channelName = routingKey === 'notification.whatsapp.request' ? 'WhatsApp' : 'Email';
  const reason = err instanceof Error ? err.message : String(err);
  const subject = job.subject ? ` (${job.subject})` : '';

  await channel.publish(
    'domain_events',
    'notification.in_app.request',
    Buffer.from(
      JSON.stringify({
        recipients: [job.requestedBy],
        title: `${channelName} to the customer could not be delivered`,
        message: `The ${channelName} addressed to ${job.recipient || 'the customer'}${subject} failed: ${reason} Please resend it before assuming the customer received it.`,
        type: 'ERROR',
        data: { channel: channelName, recipient: job.recipient },
      }),
    ),
    { persistent: true },
  );
}
