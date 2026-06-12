import { Source } from '../config/db';
import {
  ServiceTicket,
  ServiceTicketStatus,
  ServiceContext,
  JobType,
} from '../entities/serviceTicketEntity';
import { Branch } from '../entities/branchEntity';
import { MachineServiceHistory } from '../entities/machineServiceHistoryEntity';
import { NotificationPublisher } from '../events/publisher/notificationPublisher';
import { logger } from '../config/logger';
import { In } from 'typeorm';

const INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function runPreventativeMaintenanceJob() {
  logger.info('[CRON-PM] Running daily Preventative Maintenance Service Ticket Generation Job...');

  try {
    // Find all allocated rent machines from product_allocations & invoices
    const rentAllocations = await Source.query(`
      SELECT pa."productId", pa."serialNumber", pa."contractId", i."branchId", i."customerId"
      FROM product_allocations pa
      JOIN invoices i ON pa."contractId" = i.id
      WHERE i.type = 'PROFORMA'
        AND i."billType" = 'RENT'
        AND i."contractStatus" = 'ACTIVE'
        AND pa.status = 'ALLOCATED'
    `);

    logger.info(`[CRON-PM] Found ${rentAllocations.length} active rent allocation(s) to check.`);

    const ticketRepo = Source.getRepository(ServiceTicket);
    const historyRepo = Source.getRepository(MachineServiceHistory);
    const now = new Date();

    // Today's date in YYYY-MM-DD format (UTC and Local with tolerance)
    const todayStr = now.toISOString().split('T')[0];

    // Local date string for timezone difference
    const offset = now.getTimezoneOffset();
    const localNow = new Date(now.getTime() - offset * 60 * 1000);
    const localTodayStr = localNow.toISOString().split('T')[0];

    for (const allocation of rentAllocations) {
      const productId = allocation.productId;
      const serialNumber = allocation.serialNumber;
      const branchId = allocation.branchId;
      const customerId = allocation.customerId;

      // Find the machine history record
      const history = await historyRepo.findOne({ where: { productId } });

      let needsPM = false;

      if (history && history.nextScheduledMaintenanceDate) {
        const schedDate = new Date(history.nextScheduledMaintenanceDate);
        const schedStr = schedDate.toISOString().split('T')[0];

        // Check if next scheduled maintenance date matches today (with +/- 1 day tolerance or past due)
        const diffTime = now.getTime() - schedDate.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);

        if (schedStr <= todayStr || schedStr === localTodayStr || Math.abs(diffDays) <= 1) {
          needsPM = true;
        }
      } else {
        // Fallback to checking if there is a completed/recent PM ticket in the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentPMTicket = await ticketRepo.findOne({
          where: {
            productId,
            ticketType: 'PREVENTATIVE_MAINTENANCE',
          },
          order: { created_at: 'DESC' },
        });

        if (!recentPMTicket) {
          needsPM = true;
        } else {
          const lastDate = recentPMTicket.completedAt || recentPMTicket.created_at;
          if (new Date(lastDate) < thirtyDaysAgo) {
            needsPM = true;
          }
        }
      }

      if (needsPM) {
        // Check if there is an active/open PM ticket to prevent duplication
        const openPMTicket = await ticketRepo.findOne({
          where: {
            productId,
            ticketType: 'PREVENTATIVE_MAINTENANCE',
            status: In([
              ServiceTicketStatus.OPEN,
              ServiceTicketStatus.ASSIGNED,
              ServiceTicketStatus.DIAGNOSED,
              ServiceTicketStatus.IN_PROGRESS,
              ServiceTicketStatus.FREE_SERVICE,
            ]),
          },
        });

        if (!openPMTicket) {
          const count = await ticketRepo.count();
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const ticketNumber = `ST-PM-${year}${month}-${String(count + 1).padStart(4, '0')}`;

          const pmTicket = ticketRepo.create({
            ticketNumber,
            customerId,
            productId,
            serialNumber,
            serviceContext: ServiceContext.RENT,
            ticketType: 'PREVENTATIVE_MAINTENANCE',
            jobType: 'WARRANTY_ONSITE' as JobType,
            status: ServiceTicketStatus.FREE_SERVICE,
            track: 'A',
            issueDescription: 'Scheduled monthly preventative maintenance service.',
            branchId,
            createdBy: 'SYSTEM',
          });

          await ticketRepo.save(pmTicket);
          logger.info(`[CRON-PM] Created PM ticket ${ticketNumber} for serial ${serialNumber}`);

          // Trigger notification to branch manager/admins
          const branchRepo = Source.getRepository(Branch);
          const branch = await branchRepo.findOne({ where: { id: branchId } });
          const recipientIds = [];
          if (branch && branch.manager_id) {
            recipientIds.push(branch.manager_id);
          }

          for (const recipientId of recipientIds) {
            await NotificationPublisher.publishInAppRequest({
              recipientId,
              title: 'Preventative Maintenance Ticket Created',
              message: `Scheduled PM ticket ${ticketNumber} has been automatically created for serial ${serialNumber}.`,
              type: 'TASK',
              referenceId: pmTicket.id,
              referenceType: 'SERVICE',
            });
          }
        }
      }
    }

    logger.info('[CRON-PM] Preventative Maintenance Job completed.');
  } catch (err) {
    logger.error('[CRON-PM] Preventative Maintenance Job failed:', err);
  }
}

export function startPreventativeMaintenanceScheduler() {
  logger.info('[CRON-PM] Starting Preventative Maintenance Scheduler...');
  // Run once immediately, then every 24 hours
  runPreventativeMaintenanceJob();
  setInterval(() => {
    runPreventativeMaintenanceJob();
  }, INTERVAL_MS);
}
