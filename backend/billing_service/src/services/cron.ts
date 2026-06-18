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

import { NotificationPublisher } from '../events/publisher/notificationPublisher';

export async function expireContractsJob() {
  logger.info('[CRON] Running daily Contract Expiry & Status Update Job...');

  try {
    const invoiceRepo = Source.getRepository(Invoice);
    const channel = await getRabbitChannel();
    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });

    // --- Query 1: Contracts expiring in exactly 30 days ---
    const target30 = new Date();
    target30.setDate(target30.getDate() + 30);
    const target30Str = target30.toISOString().split('T')[0];

    logger.info(`[CRON] Querying contracts expiring on ${target30Str}...`);

    const expiring30 = await invoiceRepo.find({
      where: {
        type: InvoiceType.PROFORMA,
        status: InvoiceStatus.ACTIVE_CONTRACT,
        effectiveTo: target30Str as unknown as Date,
      },
    });

    logger.info(`[CRON] Found ${expiring30.length} contract(s) expiring in exactly 30 days.`);

    for (const contract of expiring30) {
      // 1. Email branch manager
      const managerEmail =
        (await getBranchManagerEmail(contract.branchId)) || 'manager@xerocare.com';
      await NotificationPublisher.publishEmailRequest({
        recipient: managerEmail,
        subject: `Contract Expiring in 30 Days - Contract ${contract.invoiceNumber}`,
        body: `Lease/Service Contract ${contract.invoiceNumber} is set to expire in 30 days on ${contract.effectiveTo}.\n\nPlease contact the customer to negotiate renewal terms.`,
        invoiceId: contract.id,
      });

      // 2. In-app notification (WARNING)
      const branchResult = await Source.query(
        `SELECT manager_id FROM branches WHERE id = $1 LIMIT 1`,
        [contract.branchId],
      );
      const managerId = branchResult?.[0]?.manager_id;
      if (managerId) {
        await NotificationPublisher.publishInAppRequest({
          recipientId: managerId,
          title: 'Contract Expiring in 30 Days',
          message: `Contract ${contract.invoiceNumber} will expire in 30 days.`,
          type: 'WARNING',
          referenceId: contract.id,
          referenceType: 'CONTRACT',
        });
      }

      // Legacy rabbitmq publish
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
    }

    // --- Query 2: Contracts expiring in exactly 7 days ---
    const target7 = new Date();
    target7.setDate(target7.getDate() + 7);
    const target7Str = target7.toISOString().split('T')[0];

    logger.info(`[CRON] Querying contracts expiring on ${target7Str}...`);

    const expiring7 = await invoiceRepo.find({
      where: {
        type: InvoiceType.PROFORMA,
        status: InvoiceStatus.ACTIVE_CONTRACT,
        effectiveTo: target7Str as unknown as Date,
      },
    });

    logger.info(`[CRON] Found ${expiring7.length} contract(s) expiring in exactly 7 days.`);

    for (const contract of expiring7) {
      // 1. Email branch manager
      const managerEmail =
        (await getBranchManagerEmail(contract.branchId)) || 'manager@xerocare.com';
      await NotificationPublisher.publishEmailRequest({
        recipient: managerEmail,
        subject: `Contract Expiring in 7 Days - Contract ${contract.invoiceNumber}`,
        body: `Lease/Service Contract ${contract.invoiceNumber} is expiring in 7 days on ${contract.effectiveTo}.\n\nRenew urgently!`,
        invoiceId: contract.id,
      });

      // 2. In-app notification (CRITICAL_WARNING)
      const branchResult = await Source.query(
        `SELECT manager_id FROM branches WHERE id = $1 LIMIT 1`,
        [contract.branchId],
      );
      const managerId = branchResult?.[0]?.manager_id;
      if (managerId) {
        await NotificationPublisher.publishInAppRequest({
          recipientId: managerId,
          title: 'Contract Expiring in 7 Days',
          message: `Contract ${contract.invoiceNumber} will expire in 7 days.`,
          type: 'CRITICAL_WARNING',
          referenceId: contract.id,
          referenceType: 'CONTRACT',
        });
      }
    }

    // --- Query 3: Active contracts past their effectiveTo date ---
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

      // 1. Email branch manager
      const managerEmail =
        (await getBranchManagerEmail(contract.branchId)) || 'manager@xerocare.com';
      await NotificationPublisher.publishEmailRequest({
        recipient: managerEmail,
        subject: `Contract Expired - Contract ${contract.invoiceNumber}`,
        body: `Lease/Service Contract ${contract.invoiceNumber} has expired.\n\nThe service context for associated machines has reverted to CHARGEABLE.`,
        invoiceId: contract.id,
      });

      // 2. In-app notification (EXPIRY)
      const branchResult = await Source.query(
        `SELECT manager_id FROM branches WHERE id = $1 LIMIT 1`,
        [contract.branchId],
      );
      const managerId = branchResult?.[0]?.manager_id;
      if (managerId) {
        await NotificationPublisher.publishInAppRequest({
          recipientId: managerId,
          title: 'Contract Expired',
          message: `Contract ${contract.invoiceNumber} has expired today.`,
          type: 'EXPIRY',
          referenceId: contract.id,
          referenceType: 'CONTRACT',
        });
      }

      // Legacy rabbitmq publish
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
