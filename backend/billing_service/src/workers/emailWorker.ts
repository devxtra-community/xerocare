import { getRabbitChannel } from '../config/rabbitmq';
import { logger } from '../config/logger';

export const startEmailWorker = async () => {
  try {
    const channel = await getRabbitChannel();
    await channel.assertQueue('email_queue', { durable: true });

    logger.info('Email Worker started, waiting for messages...');

    channel.consume('email_queue', async (msg) => {
      if (msg) {
        try {
          const content = JSON.parse(msg.content.toString());
          logger.info(`[Email Worker] Received task: ${content.type}`);

          if (content.type === 'SEND_CONSOLIDATED_INVOICE') {
            const { customerEmail, invoiceNumber, customerId } = content.payload;
            logger.info(
              `[Email Worker] Sending Email to ${customerEmail || 'No Email'} (Customer: ${customerId}) for Invoice ${invoiceNumber}`,
            );

            // Here you would integrate with SES/SendGrid/Nodemailer
            // await emailProvider.send(...)

            // Simulate 1s delay
            await new Promise((resolve) => setTimeout(resolve, 1000));
            logger.info(`[Email Worker] Email sent successfully to ${customerEmail}`);
          }

          channel.ack(msg);
        } catch (error) {
          logger.error('Error processing email message', error);
          // channel.nack(msg); // Optional: requeue or DLQ
        }
      }
    });
  } catch (error) {
    logger.error('Failed to start Email Worker', error);
  }
};
