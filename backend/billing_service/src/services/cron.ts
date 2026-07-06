import { Source } from '../config/dataSource';
import { Invoice } from '../entities/invoiceEntity';
import { InvoiceType } from '../entities/enums/invoiceType';
import { InvoiceStatus } from '../entities/enums/invoiceStatus';
import { SaleType } from '../entities/enums/saleType';
import { WarrantyType } from '../entities/enums/warrantyType';
import { getRabbitChannel } from '../config/rabbitmq';
import { logger } from '../config/logger';
import { BillingEventType } from '../events/billingEvents';
import { ProductAllocation, AllocationStatus } from '../entities/productAllocationEntity';
import { getBranchManagerEmail } from './billingHelpers';
import { In, Raw } from 'typeorm';
import cron from 'node-cron';
import { PaymentTransaction } from '../entities/paymentTransactionEntity';
import { InvoiceLedger } from '../entities/invoiceLedgerEntity';
import { UsageRecord } from '../entities/usageRecordEntity';

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

/**
 * Checks for Lease Warranty expiration based on duration.
 */
export async function leaseWarrantyExpiryJob() {
  logger.info('[CRON] Running daily Lease Warranty Expiry Check Job...');
  try {
    const invoiceRepo = Source.getRepository(Invoice);
    const { NotificationService } = await import('./notificationService');
    const notificationService = new NotificationService();

    const leaseContracts = await invoiceRepo.find({
      where: {
        saleType: SaleType.LEASE,
        warrantyType: In([WarrantyType.DURATION, WarrantyType.BOTH]),
        warrantyExpiryEmailSent: false,
      },
    });

    const now = new Date();

    for (const contract of leaseContracts) {
      if (!contract.financeApprovedAt) continue;

      const startDate = new Date(contract.financeApprovedAt);
      const expiryDate = new Date(startDate);

      if (contract.warrantyDurationUnit === 'months') {
        expiryDate.setMonth(expiryDate.getMonth() + (contract.warrantyDurationValue || 0));
      } else if (contract.warrantyDurationUnit === 'years') {
        expiryDate.setFullYear(expiryDate.getFullYear() + (contract.warrantyDurationValue || 0));
      }

      if (now >= expiryDate) {
        logger.info(
          `[CRON] Warranty expired for LEASE ${contract.invoiceNumber}. Expiry Date: ${expiryDate}`,
        );
        await notificationService.sendWarrantyExpiryEmail(contract.id);
      }
    }
    logger.info('[CRON] Lease Warranty Expiry Check Job completed.');
  } catch (error) {
    logger.error('[CRON] Lease Warranty Expiry Check Job failed:', error);
  }
}

export function startContractExpiryScheduler() {
  logger.info('[CRON] Starting Contract Expiry Scheduler...');
  // Run once immediately on start, then every 24 hours
  expireContractsJob();
  serviceContractExpiryJob();
  leaseWarrantyExpiryJob();
  setInterval(() => {
    expireContractsJob();
    serviceContractExpiryJob();
    leaseWarrantyExpiryJob();
  }, INTERVAL_MS);
}

async function getCustomerDetails(customerId: string | null | undefined) {
  if (!customerId) return null;
  try {
    const crmServiceUrl = process.env.CRM_SERVICE_URL || 'http://localhost:3005';
    const { sign } = await import('jsonwebtoken');
    const token = sign(
      { userId: 'billing_service', role: 'ADMIN' },
      process.env.ACCESS_SECRET as string,
      { expiresIn: '1m' },
    );

    const response = await fetch(`${crmServiceUrl}/customers/${customerId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.data;
  } catch {
    return null;
  }
}

export async function saleInvoiceReminderJob() {
  logger.info('[CRON] Running Sale Invoice Reminder Job...');
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const invoiceRepo = Source.getRepository(Invoice);
    const transactionRepo = Source.getRepository(PaymentTransaction);

    const outstandingSaleInvoices = await invoiceRepo
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice_ledger', 'ledger', 'ledger.invoice_id = invoice.id')
      .where('invoice.saleType = :saleType', { saleType: 'SALE' })
      .andWhere('invoice.status NOT IN (:...excludeStatuses)', {
        excludeStatuses: [
          'DRAFT',
          'SENT',
          'PAID',
          'CANCELLED',
          'EXPIRED',
          'SUPERSEDED',
          'REJECTED',
        ],
      })
      .andWhere('(ledger.balance_amount > 0 OR (ledger.id IS NULL AND invoice.totalAmount > 0))')
      .getMany();

    logger.info(
      `[CRON] Found ${outstandingSaleInvoices.length} outstanding sale invoice(s) to verify.`,
    );

    for (const invoice of outstandingSaleInvoices) {
      const recentPaymentsCount = await transactionRepo.count({
        where: {
          invoiceId: invoice.id,
          transactionDate: Raw((alias) => `${alias} >= :thirtyDaysAgo`, { thirtyDaysAgo }),
        },
      });

      if (recentPaymentsCount === 0) {
        const ledger = await Source.getRepository(InvoiceLedger).findOne({
          where: { invoiceId: invoice.id },
        });
        const balanceRemaining = ledger
          ? Number(ledger.balanceAmount)
          : Number(invoice.totalAmount);

        // Fetch customer details
        const customer = await getCustomerDetails(invoice.customerId);
        const customerName = customer
          ? `${customer.firstName} ${customer.lastName || ''}`.trim()
          : ((invoice as unknown as Record<string, unknown>).customerName as string) || 'Customer';

        const alertMsg = `Customer ${customerName} has an outstanding balance of QAR ${balanceRemaining} on invoice ${invoice.invoiceNumber} (Sale). No payment recorded in the last 30 days.`;
        logger.warn(`[CRON] ${alertMsg}`);

        // Email warning alert to Branch Manager
        const managerEmail =
          (await getBranchManagerEmail(invoice.branchId)) || 'manager@xerocare.com';
        await NotificationPublisher.publishEmailRequest({
          recipient: managerEmail,
          subject: `Outstanding Sale Balance Warning - ${invoice.invoiceNumber}`,
          body: alertMsg,
          invoiceId: invoice.id,
        });

        const branchResult = await Source.query(
          `SELECT manager_id FROM branches WHERE id = $1 LIMIT 1`,
          [invoice.branchId],
        );
        const managerId = branchResult?.[0]?.manager_id;
        if (managerId) {
          await NotificationPublisher.publishInAppRequest({
            recipientId: managerId,
            title: 'Outstanding Sale Balance Warning',
            message: alertMsg,
            type: 'WARNING',
            referenceId: invoice.id,
            referenceType: 'CONTRACT',
          });
        }
      }
    }
    logger.info('[CRON] Sale Invoice Reminder Job completed.');
  } catch (error) {
    logger.error('[CRON] Sale Invoice Reminder Job failed:', error);
  }
}

export async function rentLeaseDueReminderJob() {
  logger.info('[CRON] Running Rent & Lease Due Reminder Job...');
  try {
    const invoiceRepo = Source.getRepository(Invoice);
    const usageRepo = Source.getRepository(UsageRecord);

    const activeRentLeaseContracts = await invoiceRepo.find({
      where: [
        { saleType: SaleType.RENT, status: InvoiceStatus.ACTIVE_CONTRACT },
        { saleType: SaleType.LEASE, status: InvoiceStatus.ACTIVE_CONTRACT },
      ],
    });

    logger.info(
      `[CRON] Found ${activeRentLeaseContracts.length} active rent/lease contract(s) to verify.`,
    );

    const today = new Date();
    const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    for (const contract of activeRentLeaseContracts) {
      if (!contract.effectiveFrom) continue;

      const history = await usageRepo.find({
        where: { contractId: contract.id },
        order: { billingPeriodEnd: 'DESC' },
      });

      let currentPeriodStart: Date;
      const latestRecord = history[0];

      if (latestRecord) {
        currentPeriodStart = new Date(latestRecord.billingPeriodEnd);
        currentPeriodStart.setDate(currentPeriodStart.getDate() + 1);
      } else {
        currentPeriodStart = new Date(contract.effectiveFrom);
      }

      const cycleDays = contract.billingCycleInDays || 30;

      const currentPeriodEnd = new Date(currentPeriodStart);
      currentPeriodEnd.setDate(currentPeriodEnd.getDate() + cycleDays - 1);

      const nextDueDate = new Date(currentPeriodEnd);
      nextDueDate.setDate(nextDueDate.getDate() + 5);

      const billingDateOnly = new Date(
        currentPeriodEnd.getFullYear(),
        currentPeriodEnd.getMonth(),
        currentPeriodEnd.getDate(),
      );
      const nextDueDateOnly = new Date(
        nextDueDate.getFullYear(),
        nextDueDate.getMonth(),
        nextDueDate.getDate(),
      );

      const diffMs = nextDueDateOnly.getTime() - todayDateOnly.getTime();
      const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));

      const diffBillingMs = billingDateOnly.getTime() - todayDateOnly.getTime();
      const diffBillingDays = Math.round(diffBillingMs / (24 * 60 * 60 * 1000));

      if (diffDays === 2 || diffBillingDays === 2) {
        const customer = await getCustomerDetails(contract.customerId);
        const customerEmail =
          customer?.email ||
          ((contract as unknown as Record<string, unknown>).customerEmail as string);
        const customerName = customer
          ? `${customer.firstName} ${customer.lastName || ''}`.trim()
          : ((contract as unknown as Record<string, unknown>).customerName as string) || 'Customer';

        const amount =
          contract.saleType === 'RENT'
            ? Number(contract.monthlyRent || 0)
            : Number(contract.monthlyLeaseAmount || 0);

        const targetDateStr =
          diffDays === 2 ? nextDueDateOnly.toDateString() : billingDateOnly.toDateString();

        const emailBody = `Dear ${customerName},\n\nThis is a reminder that your upcoming billing/due date for Contract #${contract.invoiceNumber} is in 2 days (on ${targetDateStr}). The due amount is QAR ${amount}.\n\nPlease ensure timely payment.\n\nBest regards,\nXerocare Team`;

        if (customerEmail) {
          await NotificationPublisher.publishEmailRequest({
            recipient: customerEmail,
            subject: `Upcoming Payment Reminder - Contract #${contract.invoiceNumber}`,
            body: emailBody,
            invoiceId: contract.id,
          });
          logger.info(
            `[CRON] Sent payment due reminder email to customer ${customerEmail} for contract ${contract.invoiceNumber}`,
          );
        }

        // Trigger system notification
        const branchResult = await Source.query(
          `SELECT manager_id FROM branches WHERE id = $1 LIMIT 1`,
          [contract.branchId],
        );
        const managerId = branchResult?.[0]?.manager_id;
        if (managerId) {
          await NotificationPublisher.publishInAppRequest({
            recipientId: managerId,
            title: 'Upcoming Contract Billing Reminder',
            message: `Contract ${contract.invoiceNumber} for Customer ${customerName} has billing due in 2 days.`,
            type: 'INFO',
            referenceId: contract.id,
            referenceType: 'CONTRACT',
          });
        }
        if (contract.customerId) {
          await NotificationPublisher.publishInAppRequest({
            recipientId: contract.customerId,
            title: 'Upcoming Bill Reminder',
            message: `Your billing for Contract ${contract.invoiceNumber} is due in 2 days.`,
            type: 'INFO',
            referenceId: contract.id,
            referenceType: 'CONTRACT',
          });
        }
      }
    }

    // Process Opening Balance Entries
    try {
      const { OpeningBalanceEntry, BalanceType } =
        await import('../entities/openingBalanceEntryEntity');
      const entryRepo = Source.getRepository(OpeningBalanceEntry);

      const activeEntries = await entryRepo.find({
        where: [
          { balanceType: BalanceType.RENT_CONTRACT, isFullySettled: false },
          { balanceType: BalanceType.LEASE_CONTRACT, isFullySettled: false },
        ],
        relations: ['invoice'],
      });

      logger.info(
        `[CRON] Found ${activeEntries.length} active opening balance contract(s) to verify.`,
      );

      for (const entry of activeEntries) {
        if (!entry.nextPaymentDueDate) continue;

        const nextDueDateOnly = new Date(
          entry.nextPaymentDueDate.getFullYear(),
          entry.nextPaymentDueDate.getMonth(),
          entry.nextPaymentDueDate.getDate(),
        );

        const diffMs = nextDueDateOnly.getTime() - todayDateOnly.getTime();
        const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));

        // 1. Send reminder if due in 2 days
        if (diffDays === 2) {
          const customer = await getCustomerDetails(entry.customerId);
          const customerEmail = customer?.email;
          const customerName = customer
            ? `${customer.firstName} ${customer.lastName || ''}`.trim()
            : 'Customer';

          const amount = Number(entry.monthlyBillingAmount || 0);
          const emailBody = `Dear ${customerName},\n\nThis is a reminder that your upcoming billing/due date for your contract migration entry #${entry.entryNumber} is in 2 days (on ${nextDueDateOnly.toDateString()}). The due amount is QAR ${amount}.\n\nPlease ensure timely payment.\n\nBest regards,\nXerocare Team`;

          if (customerEmail) {
            await NotificationPublisher.publishEmailRequest({
              recipient: customerEmail,
              subject: `Upcoming Payment Reminder - Migration Contract #${entry.entryNumber}`,
              body: emailBody,
              invoiceId: entry.invoiceId,
            });
            logger.info(
              `[CRON] Sent payment due reminder email for opening balance entry ${entry.entryNumber}`,
            );
          }

          // Trigger system notification to branch manager/finance
          const branchResult = await Source.query(
            `SELECT manager_id FROM branches WHERE id = $1 LIMIT 1`,
            [entry.branchId],
          );
          const managerId = branchResult?.[0]?.manager_id;
          if (managerId) {
            await NotificationPublisher.publishInAppRequest({
              recipientId: managerId,
              title: 'Upcoming Migration Contract Billing Reminder',
              message: `Migration Contract ${entry.entryNumber} for Customer ${customerName} has billing due in 2 days.`,
              type: 'INFO',
              referenceId: entry.id,
              referenceType: 'OPENING_BALANCE',
            });
          }
        }

        // 2. If today >= nextDueDate, advance nextPaymentDueDate by billingCycleInDays
        // and decrement monthsRemaining / increment monthsCompleted.
        if (todayDateOnly >= nextDueDateOnly) {
          const cycleDays = entry.billingCycleInDays || 30;
          const newDueDate = new Date(nextDueDateOnly);
          newDueDate.setDate(newDueDate.getDate() + cycleDays);
          entry.nextPaymentDueDate = newDueDate;

          if (entry.totalContractMonths && entry.monthsCompleted !== undefined) {
            entry.monthsCompleted += 1;
            entry.monthsRemaining = Math.max(0, entry.totalContractMonths - entry.monthsCompleted);
            entry.remainingContractValue =
              (entry.monthlyBillingAmount || 0) * entry.monthsRemaining;

            // Check if contract has fully completed all its months
            if (entry.monthsCompleted >= entry.totalContractMonths) {
              entry.isFullySettled = true;
            }
          }

          await entryRepo.save(entry);
          logger.info(
            `[CRON] Advanced opening balance entry ${entry.entryNumber} due date to ${newDueDate.toDateString()} (billing cycle: ${cycleDays} days). Remaining contract months: ${entry.monthsRemaining}`,
          );
        }
      }
    } catch (innerErr) {
      logger.error('[CRON] Failed processing opening balance entry reminders:', innerErr);
    }

    logger.info('[CRON] Rent & Lease Due Reminder Job completed.');
  } catch (error) {
    logger.error('[CRON] Rent & Lease Due Reminder Job failed:', error);
  }
}

export function startReminderCronJobs() {
  logger.info('[CRON] Initializing payment and due reminder cron jobs using node-cron...');

  // 1. Sale Invoice Reminder (Monthly): Run at 9:00 AM on the 1st of every month
  cron.schedule('0 9 1 * *', () => {
    saleInvoiceReminderJob();
  });

  // 2. Rent & Lease Due Reminder (Daily): Run at 9:00 AM daily
  cron.schedule('0 9 * * *', () => {
    rentLeaseDueReminderJob();
  });
}
