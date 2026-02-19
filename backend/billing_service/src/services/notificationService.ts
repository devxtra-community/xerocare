import { InvoiceRepository } from '../repositories/invoiceRepository';
import { AppError } from '../errors/appError';
import { getRabbitChannel } from '../config/rabbitmq';
import { logger } from '../config/logger';

export class NotificationService {
  private invoiceRepo = new InvoiceRepository();

  /**
   * Sends the consolidated invoice via email/WhatsApp.
   */
  async sendConsolidatedInvoice(contractId: string) {
    const contract = await this.invoiceRepo.findById(contractId);
    if (!contract) throw new AppError('Contract not found', 404);

    try {
      const channel = await getRabbitChannel();
      const message = {
        type: 'SEND_CONSOLIDATED_INVOICE',
        payload: {
          contractId: contract.id,
          customerId: contract.customerId,
          invoiceNumber: contract.invoiceNumber,
          customerEmail: (contract as unknown as { customerEmail: string }).customerEmail,
        },
      };

      channel.sendToQueue('email_queue', Buffer.from(JSON.stringify(message)), {
        persistent: true,
      });
      logger.info(
        `[Email Service] Published invoice email task for ${contract.invoiceNumber} to queue`,
      );
    } catch (error) {
      logger.error('Failed to publish email task to RabbitMQ', error);
    }

    contract.emailSentAt = new Date();
    await this.invoiceRepo.save(contract);

    return { success: true, message: 'Invoice sending queued successfully' };
  }

  /**
   * Sends a generic email notification.
   */
  async sendEmailNotification(
    contractId: string,
    recipient: string,
    subject: string,
    body: string,
  ) {
    const contract = await this.invoiceRepo.findById(contractId);
    if (!contract) throw new AppError('Contract not found', 404);

    const { NotificationPublisher } = await import('../events/publisher/notificationPublisher');

    await NotificationPublisher.publishEmailRequest({
      recipient,
      subject,
      body,
      invoiceId: contract.id,
    });
  }

  /**
   * Sends a generic WhatsApp notification.
   */
  async sendWhatsappNotification(contractId: string, recipient: string, body: string) {
    const contract = await this.invoiceRepo.findById(contractId);
    if (!contract) throw new AppError('Contract not found', 404);

    const { NotificationPublisher } = await import('../events/publisher/notificationPublisher');

    await NotificationPublisher.publishWhatsappRequest({
      recipient,
      body,
      invoiceId: contract.id,
    });
  }
}
