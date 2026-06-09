import { Source } from '../config/dataSource';
import { Invoice } from '../entities/invoiceEntity';
import { InvoiceType } from '../entities/enums/invoiceType';
import { InvoiceStatus } from '../entities/enums/invoiceStatus';
import { getRabbitChannel } from '../config/rabbitmq';
import { logger } from '../config/logger';
import { BillingEventType } from '../events/billingEvents';
import { ProductAllocation, AllocationStatus } from '../entities/productAllocationEntity';
import { getBranchManagerEmail } from './billingHelpers';

const EXCHANGE = 'domain_events';
const INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function expireContractsJob() {
  logger.info('[CRON] Running daily Contract Expiry & Status Update Job...');

  try {
    const invoiceRepo = Source.getRepository(Invoice);
    const channel = await getRabbitChannel();
    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });

    // --- Query 1: Contracts expiring in exactly 30 days ---
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 30);
    const targetDateStr = targetDate.toISOString().split('T')[0];

    logger.info(`[CRON] Querying contracts expiring on ${targetDateStr}...`);

    const expiringContracts = await invoiceRepo.find({
      where: {
        type: InvoiceType.PROFORMA,
        status: InvoiceStatus.ACTIVE_CONTRACT,
        effectiveTo: targetDateStr as unknown as Date,
      },
    });

    logger.info(
      `[CRON] Found ${expiringContracts.length} contract(s) expiring in exactly 30 days.`,
    );

    for (const contract of expiringContracts) {
      const payload = {
        contractId: contract.id,
        invoiceNumber: contract.invoiceNumber,
        customerId: contract.customerId,
        effectiveTo: contract.effectiveTo,
      };

      channel.publish(
        EXCHANGE,
        BillingEventType.CONTRACT_EXPIRING_SOON,
        Buffer.from(JSON.stringify(payload)),
        { persistent: true },
      );

      logger.info(
        `[CRON] Published contract.expiring.soon event for contract ${contract.invoiceNumber}`,
      );
    }

    // --- Query 2: Active contracts past their effectiveTo date ---
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    logger.info(`[CRON] Querying active contracts past effectiveTo date (${todayStr})...`);

    const expiredContracts = await invoiceRepo
      .createQueryBuilder('invoice')
      .where('invoice.type = :type', { type: InvoiceType.PROFORMA })
      .andWhere('invoice.status = :status', { status: InvoiceStatus.ACTIVE_CONTRACT })
      .andWhere('invoice.effectiveTo < :today', { today: todayStr })
      .getMany();

    logger.info(`[CRON] Found ${expiredContracts.length} contract(s) to expire.`);

    for (const contract of expiredContracts) {
      // Update status to EXPIRED
      contract.status = InvoiceStatus.EXPIRED;
      await invoiceRepo.save(contract);

      logger.info(`[CRON] Updated status to EXPIRED for contract ${contract.invoiceNumber}`);

      // Publish event
      const payload = {
        contractId: contract.id,
        invoiceNumber: contract.invoiceNumber,
        customerId: contract.customerId,
        effectiveTo: contract.effectiveTo,
        expiredAt: new Date().toISOString(),
      };

      channel.publish(
        EXCHANGE,
        BillingEventType.CONTRACT_EXPIRED,
        Buffer.from(JSON.stringify(payload)),
        { persistent: true },
      );

      logger.info(`[CRON] Published contract.expired event for contract ${contract.invoiceNumber}`);
    }

    logger.info('[CRON] Contract Expiry & Status Update Job completed successfully.');
  } catch (error) {
    logger.error('[CRON] Contract Expiry & Status Update Job failed:', error);
  }
}

export async function serviceContractExpiryJob() {
  logger.info('[CRON] Running daily Service Contract Copy Limit Check Job...');
  try {
    const allocationRepo = Source.getRepository(ProductAllocation);
    const channel = await getRabbitChannel();
    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });

    const allocations = await allocationRepo.find({
      where: { status: AllocationStatus.ALLOCATED },
      relations: ['contract'],
    });

    logger.info(
      `[CRON] Querying active allocations. Found ${allocations.length} total active allocations.`,
    );

    for (const allocation of allocations) {
      const contract = allocation.contract;
      if (!contract || contract.saleType !== 'LEASE') continue;

      const maxLimit = contract.maxCopyLimit || 0;
      const currentReading =
        (allocation.currentBwA4 || 0) +
        (allocation.currentBwA3 || 0) +
        (allocation.currentColorA4 || 0) +
        (allocation.currentColorA3 || 0);

      if (maxLimit > 0 && currentReading >= maxLimit) {
        logger.info(
          `[CRON] Contract ${contract.invoiceNumber} has exceeded copy limit. Limit: ${maxLimit}, Reading: ${currentReading}`,
        );

        // Lookup Branch Manager email
        const managerEmail =
          (await getBranchManagerEmail(contract.branchId)) || 'manager@xerocare.com';

        const emailPayload = {
          recipientEmail: managerEmail,
          subject: `Lease Copy Limit Exceeded - Contract ${contract.invoiceNumber}`,
          body: `The product allocation with serial number ${allocation.serialNumber} under Lease Contract ${contract.invoiceNumber} has reached or exceeded its copy limit.\n\nLimit: ${maxLimit}\nCurrent Reading: ${currentReading}\n\nPlease contact the customer to renegotiate or charge excess copy rates.`,
        };

        // Publish to rabbitmq for employee_service to send email
        channel.publish(
          EXCHANGE,
          'notification.email.request',
          Buffer.from(JSON.stringify(emailPayload)),
          { persistent: true },
        );

        logger.info(
          `[CRON] Published lease copy limit email notification for manager ${managerEmail}`,
        );
      }
    }
    logger.info('[CRON] Service Contract Copy Limit Check Job completed.');
  } catch (error) {
    logger.error('[CRON] Service Contract Copy Limit Check Job failed:', error);
  }
}

export function startContractExpiryScheduler() {
  logger.info('[CRON] Starting Contract Expiry Scheduler...');
  // Run once immediately on start, then every 24 hours
  expireContractsJob();
  serviceContractExpiryJob();
  setInterval(() => {
    expireContractsJob();
    serviceContractExpiryJob();
  }, INTERVAL_MS);
}
