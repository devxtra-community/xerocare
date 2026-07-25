import { Source } from '../config/db';
import { ServiceContract, ServiceContractType } from '../entities/serviceContractEntity';
import { ContractMeterReading } from '../entities/contractMeterReadingEntity';
import { NotificationPublisher } from '../events/publisher/notificationPublisher';
import { logger } from '../config/logger';
import { addMonthsClamped } from '../utils/dateMath';
import { getHelpDeskEmployeesByBranch, getCustomerName } from '../helpers/serviceHelpers';
import { Branch } from '../entities/branchEntity';
import { Product } from '../entities/productEntity';
import axios from 'axios';
import { sign } from 'jsonwebtoken';
import { IsNull } from 'typeorm';

const INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

const BILLING_SERVICE_URL = process.env.BILLING_SERVICE_URL || 'http://localhost:3004';
const ACCESS_SECRET = process.env.ACCESS_SECRET;
if (!ACCESS_SECRET) {
  throw new Error('ACCESS_SECRET environment variable must be set');
}

/**
 * Meter readings against an FSMA contract can be recorded any time
 * ("casually") — but the actual customer bill is only ever generated once a
 * month, one day before the monthly anniversary of the contract's signing
 * date, by summing every reading recorded since the last bill. Readings are
 * never invoiced individually.
 */
async function runFsmaBillingJob() {
  logger.info('[CRON-FSMA-BILLING] Running FSMA monthly billing sweep...');

  try {
    const contractRepo = Source.getRepository(ServiceContract);
    const readingRepo = Source.getRepository(ContractMeterReading);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueContracts = await contractRepo
      .createQueryBuilder('c')
      .where('c.contractType = :type', { type: ServiceContractType.FSMA })
      .andWhere('c.status = :status', { status: 'ACTIVE' })
      .andWhere('c."nextBillingDate" IS NOT NULL')
      .andWhere('c."nextBillingDate" <= :today', { today })
      .getMany();

    logger.info(
      `[CRON-FSMA-BILLING] Found ${dueContracts.length} FSMA contract(s) due for billing.`,
    );

    for (const contract of dueContracts) {
      try {
        const pending = await readingRepo.find({
          where: { contractId: contract.id, billedAt: IsNull() },
          order: { readingDate: 'ASC' },
        });

        const totalAmount =
          Math.round(pending.reduce((sum, r) => sum + Number(r.amountCharged || 0), 0) * 100) / 100;

        if (totalAmount > 0 && contract.branchId) {
          const periodStart = pending[0]?.readingDate;
          const periodEnd = pending[pending.length - 1]?.readingDate;
          const description = `FSMA Monthly Bill — ${
            periodStart ? new Date(periodStart).toLocaleDateString() : ''
          } to ${periodEnd ? new Date(periodEnd).toLocaleDateString() : ''}`;

          const token = sign(
            { userId: 'ven_inv_service', role: 'ADMIN' },
            ACCESS_SECRET as string,
            {
              expiresIn: '1m',
            },
          );

          const response = await axios.post(
            `${BILLING_SERVICE_URL}/invoices/service-contract`,
            {
              customerId: contract.customerId,
              branchId: contract.branchId,
              createdBy: 'SYSTEM',
              serviceContractId: contract.id,
              billType: ServiceContractType.FSMA,
              description,
              amount: totalAmount,
            },
            { headers: { Authorization: `Bearer ${token}` } },
          );

          if (response.data?.success) {
            const invoiceId = response.data.data.id;
            for (const reading of pending) {
              reading.billedAt = new Date();
              reading.billingInvoiceId = invoiceId;
            }
            await readingRepo.save(pending);

            await notifyBillGenerated(contract, totalAmount);
            logger.info(
              `[CRON-FSMA-BILLING] Generated bill ${invoiceId} for contract ${contract.id} (QAR ${totalAmount}).`,
            );
          } else {
            logger.error(
              `[CRON-FSMA-BILLING] billing_service rejected invoice creation for contract ${contract.id}.`,
            );
          }
        } else if (totalAmount > 0 && !contract.branchId) {
          logger.error(
            `[CRON-FSMA-BILLING] Contract ${contract.id} has usage to bill but no branchId — skipping invoice creation.`,
          );
        }

        // Always advance to the next cycle, even if there was nothing to
        // bill this month, so the contract doesn't get re-checked daily.
        contract.nextBillingDate = addMonthsClamped(new Date(contract.nextBillingDate as Date), 1);
        await contractRepo.save(contract);
      } catch (err) {
        logger.error(`[CRON-FSMA-BILLING] Failed to process contract ${contract.id}:`, err);
      }
    }

    logger.info('[CRON-FSMA-BILLING] FSMA monthly billing sweep completed.');
  } catch (err) {
    logger.error('[CRON-FSMA-BILLING] FSMA monthly billing sweep failed:', err);
  }
}

async function notifyBillGenerated(contract: ServiceContract, amount: number): Promise<void> {
  try {
    const recipientIds = new Set<string>();

    // The Finance role has no access to /employee/service/* (see middleware.ts
    // route gating), so notify the people who actually manage contracts there:
    // service help-desk staff and the branch manager.
    const helpDeskIds = await getHelpDeskEmployeesByBranch(contract.branchId || undefined);
    helpDeskIds.forEach((id) => recipientIds.add(id));

    if (contract.branchId) {
      const branch = await Source.getRepository(Branch).findOne({
        where: { id: contract.branchId },
      });
      if (branch?.manager_id) recipientIds.add(branch.manager_id);
    }

    const [customerName, product] = await Promise.all([
      getCustomerName(contract.customerId),
      Source.getRepository(Product).findOne({ where: { id: contract.productId } }),
    ]);
    const machineLabel = product ? `${product.brand} ${product.name}`.trim() : 'machine';

    for (const recipientId of recipientIds) {
      await NotificationPublisher.publishInAppRequest({
        recipientId,
        title: 'FSMA Monthly Bill Generated',
        message: `A monthly FSMA bill of QAR ${amount.toFixed(2)} was generated for ${customerName} (${machineLabel}). Review and send it to the customer.`,
        type: 'FSMA_BILL_GENERATED',
        referenceId: contract.id,
        referenceType: 'SERVICE_CONTRACT',
      });
    }
  } catch (err) {
    logger.error('[CRON-FSMA-BILLING] Failed to notify employees about generated bill:', err);
  }
}

export function startFsmaBillingScheduler() {
  logger.info('[CRON-FSMA-BILLING] Starting FSMA Monthly Billing Scheduler...');
  runFsmaBillingJob();
  setInterval(() => {
    runFsmaBillingJob();
  }, INTERVAL_MS);
}
