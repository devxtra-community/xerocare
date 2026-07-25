// Trigger reload to pick up new .env variables
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/appError';
import { Source } from '../config/db';
import { IsNull, FindOptionsWhere, In, Between } from 'typeorm';
import {
  generateServiceQuotationPdf,
  generateServiceCompletionBillPdf,
  generateServiceReportPdf,
  PdfPerson,
} from '../utils/servicePdfGenerator';
import { sendServicePdfEmail } from '../utils/emailService';
import { sendWhatsappMessage } from '../utils/whatsapp';
import {
  ServiceTicket,
  ServiceTicketStatus,
  ServiceContext,
  JobType,
} from '../entities/serviceTicketEntity';
import { ServiceTicketItem, ServiceItemSource } from '../entities/serviceTicketItemEntity';
import { SparePart } from '../entities/sparePartEntity';
import { Product, OwnershipType, ProductStatus, PrintColour } from '../entities/productEntity';
import { Branch } from '../entities/branchEntity';
import { ServiceDiagnosis } from '../entities/serviceDiagnosisEntity';
import { ServiceEstimate, ServiceEstimateStatus } from '../entities/serviceEstimateEntity';
import { ServiceEstimateRevision } from '../entities/serviceEstimateRevisionEntity';
import {
  ServiceEstimateItem,
  ServiceEstimateItemSource,
} from '../entities/serviceEstimateItemEntity';
import { ServiceReport } from '../entities/serviceReportEntity';
import { MachineServiceHistory } from '../entities/machineServiceHistoryEntity';
import { ConsumableYieldHistory } from '../entities/consumableYieldHistoryEntity';
import { InventoryReservation } from '../entities/inventoryReservationEntity';
import { ServiceTicketActivity } from '../entities/serviceTicketActivityEntity';
import {
  ServiceContract,
  ServiceContractType,
  FsmaBillingMode,
} from '../entities/serviceContractEntity';
import { ContractMeterReading } from '../entities/contractMeterReadingEntity';
import {
  ContractCoverage,
  FULL_COVERAGE,
  NO_COVERAGE,
  WARRANTY_COVERAGE,
  coverageForContractType,
  normalizeCoverage,
  coverageAllowsItem,
} from '../helpers/contractCoverageHelper';
import { ServicePartUsageLog } from '../entities/servicePartUsageLogEntity';
import { NotificationPublisher } from '../events/publisher/notificationPublisher';
import axios from 'axios';
import { sign } from 'jsonwebtoken';
import { logger } from '../config/logger';
import { BILLING_ENDPOINTS, CRM_ENDPOINTS } from '../constants/serviceUrls';
import { firstFsmaBillingDate } from '../utils/dateMath';
import {
  getFinanceEmployeesByBranch,
  getCustomerName,
  getHelpDeskEmployeesByBranch,
} from '../helpers/serviceHelpers';
import {
  evaluateWarranty,
  copiesUsedFromCounters,
  WarrantyEvaluation,
} from '../helpers/warrantyHelper';
import { deleteCached } from '../utils/cacheUtil';

const ACCESS_SECRET = process.env.ACCESS_SECRET;
if (!ACCESS_SECRET) {
  throw new Error('ACCESS_SECRET environment variable must be set');
}
const CRM_SERVICE_URL = process.env.CRM_SERVICE_URL || 'http://localhost:3005';
const BILLING_SERVICE_URL = process.env.BILLING_SERVICE_URL || 'http://localhost:3004';
const EMPLOYEE_SERVICE_URL = process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:3002';

interface ReviseEstimateItem {
  itemSource?: ServiceItemSource;
  sparePartId?: string;
  sku?: string;
  partName?: string;
  description?: string;
  customPartBrand?: string;
  mpn?: string;
  quantity: number;
  unitPrice: number;
  isFree?: boolean;
}

export class ServiceController {
  private async generateBillNumber(): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const ticketRepo = Source.getRepository(ServiceTicket);
    const count = await ticketRepo
      .createQueryBuilder('ticket')
      .where('ticket.completion_bill_number LIKE :pattern', { pattern: `SCB-${yearMonth}-%` })
      .getCount();
    const nextNum = String(count + 1).padStart(4, '0');
    return `SCB-${yearMonth}-${nextNum}`;
  }

  /**
   * Helper to fetch admins and managers for notifications.
   */
  private async getBranchManagerAndAdmins(branchId: string): Promise<string[]> {
    const ids: string[] = [];
    try {
      const branchRepo = Source.getRepository(Branch);
      const branch = await branchRepo.findOne({ where: { id: branchId } });
      if (branch && branch.manager_id) {
        ids.push(branch.manager_id);
      }
    } catch (err) {
      logger.error('Failed to get branch manager for notification:', err);
    }
    return ids;
  }

  /**
   * Helper to determine consumable type.
   */
  private isConsumable(partName: string, sku: string): boolean {
    const nameLower = (partName || '').toLowerCase();
    const skuLower = (sku || '').toLowerCase();
    return (
      nameLower.includes('toner') ||
      nameLower.includes('cartridge') ||
      nameLower.includes('drum') ||
      nameLower.includes('developer') ||
      nameLower.includes('ink') ||
      skuLower.includes('tnr') ||
      skuLower.includes('crt')
    );
  }

  /**
   * Helper to log ticket activities.
   */
  private async logActivity(
    ticketId: string,
    activityType: string,
    description: string,
    performedBy?: string,
  ) {
    try {
      const activityRepo = Source.getRepository(ServiceTicketActivity);
      const activity = activityRepo.create({
        ticketId,
        activityType,
        description,
        performedBy,
      });
      await activityRepo.save(activity);
    } catch (err) {
      logger.error('Failed to log ticket activity:', err);
    }
  }

  /**
   * Helper to reserve parts in inventory.
   */
  private async reserveSparePart(
    ticketId: string,
    sparePartId: string,
    quantity: number,
  ): Promise<void> {
    const sparePartRepo = Source.getRepository(SparePart);
    const reservationRepo = Source.getRepository(InventoryReservation);

    const part = await sparePartRepo.findOne({ where: { id: String(sparePartId) } });
    if (!part) throw new Error(`Spare part not found: ${sparePartId}`);

    if (part.quantity < quantity) {
      throw new Error(
        `Insufficient inventory for part: ${part.part_name}. Available: ${part.quantity}, Requested: ${quantity}`,
      );
    }

    part.quantity -= quantity;
    part.reserved_quantity += quantity;
    await sparePartRepo.save(part);
    await deleteCached(`sparepart:${part.id}`);

    const reservation = reservationRepo.create({
      ticketId,
      sparePartId,
      reservedQuantity: quantity,
      status: 'RESERVED',
    });
    await reservationRepo.save(reservation);
  }

  /**
   * Helper to release reserved parts.
   */
  private async releaseReservations(ticketId: string): Promise<void> {
    const sparePartRepo = Source.getRepository(SparePart);
    const reservationRepo = Source.getRepository(InventoryReservation);

    const reservations = await reservationRepo.find({
      where: { ticketId, status: 'RESERVED' },
    });
    for (const res of reservations) {
      const part = await sparePartRepo.findOne({ where: { id: res.sparePartId } });
      if (part) {
        part.quantity += res.reservedQuantity;
        part.reserved_quantity = Math.max(0, part.reserved_quantity - res.reservedQuantity);
        await sparePartRepo.save(part);
        await deleteCached(`sparepart:${part.id}`);
      }
      res.status = 'RELEASED';
      await reservationRepo.save(res);
    }
  }

  /**
   * Helper to consume reserved parts on ticket completion.
   */
  private async consumeReservations(ticketId: string): Promise<void> {
    const sparePartRepo = Source.getRepository(SparePart);
    const reservationRepo = Source.getRepository(InventoryReservation);

    const reservations = await reservationRepo.find({
      where: { ticketId, status: 'RESERVED' },
    });
    for (const res of reservations) {
      const part = await sparePartRepo.findOne({ where: { id: res.sparePartId } });
      if (part) {
        part.reserved_quantity = Math.max(0, part.reserved_quantity - res.reservedQuantity);
        part.consumed_quantity += res.reservedQuantity;
        await sparePartRepo.save(part);
      }
      res.status = 'CONSUMED';
      await reservationRepo.save(res);
    }
  }

  /**
   * Coverage of the contract a ticket runs under, or null when the ticket is
   * not in a contract context (warranty/rent tickets return null too — their
   * "everything free" handling lives at the call sites).
   */
  private async getTicketContractCoverage(
    contractReferenceId: string | null | undefined,
  ): Promise<ContractCoverage | null> {
    if (!contractReferenceId) return null;
    const contract = await Source.getRepository(ServiceContract).findOne({
      where: { id: contractReferenceId },
    });
    if (!contract) return null;
    return normalizeCoverage(
      contract.coverageRules || coverageForContractType(contract.contractType),
    );
  }

  /** Maps sparePartId → part_category for coverage checks over item lists. */
  private async getPartCategories(
    sparePartIds: Array<string | null | undefined>,
  ): Promise<Map<string, string | null>> {
    const ids = [...new Set(sparePartIds.filter((v): v is string => !!v))];
    const map = new Map<string, string | null>();
    if (ids.length === 0) return map;
    const parts = await Source.getRepository(SparePart).find({
      where: { id: In(ids) },
      select: ['id', 'part_category'],
    });
    for (const p of parts) map.set(p.id, p.part_category || null);
    return map;
  }

  /**
   * Automated Context and Job Type Identification.
   *
   * When `meterReading` is provided (e.g. asked from the customer while
   * raising the ticket) it takes precedence over stored counters, so a
   * copy-limited warranty that has silently expired is caught here.
   */
  private async determineServiceContextAndJobType(
    serialNumber: string,
    meterReading?: number,
  ): Promise<{
    serviceContext: ServiceContext;
    contractReferenceId: string | null;
    productId: string | null;
    jobType: JobType;
    track: 'A' | 'B';
    linkedInvoiceId: string | null;
    warrantyInfo: WarrantyEvaluation | null;
    contractUsage: {
      copiesUsed: number;
      copyLimit: number;
      copiesRemaining: number;
      limitExceeded: boolean;
      overagePerCopyRate: number;
    } | null;
  }> {
    let serviceContext = ServiceContext.CHARGEABLE;
    let contractReferenceId: string | null = null;
    let productId: string | null = null;
    let jobType = JobType.ONSITE;
    let track: 'A' | 'B' = 'B';
    let linkedInvoiceId: string | null = null;
    let warrantyInfo: WarrantyEvaluation | null = null;
    let contractUsage: {
      copiesUsed: number;
      copyLimit: number;
      copiesRemaining: number;
      limitExceeded: boolean;
      overagePerCopyRate: number;
    } | null = null;

    const product = await Source.getRepository(Product).findOne({
      where: { serial_no: serialNumber },
    });
    if (product) {
      productId = product.id;

      let rentInvoice = null;
      let saleInvoice = null;
      let leaseInvoice = null;
      let latestAllocation = null;

      try {
        const billingRes = await axios.get(
          `${BILLING_SERVICE_URL}/invoices/machine/${productId}/billing-context?serialNumber=${encodeURIComponent(serialNumber)}`,
          { headers: { 'x-internal-service': 'ven-inv' } },
        );
        if (billingRes.data && billingRes.data.success) {
          const billingData = billingRes.data.data;
          rentInvoice = billingData.rentInvoice;
          saleInvoice = billingData.saleInvoice;
          leaseInvoice = billingData.leaseInvoice;
          latestAllocation = billingData.latestAllocation;
        }
      } catch (err) {
        logger.error('Failed to fetch machine billing context from billing service:', err);
      }

      const copiesUsed =
        meterReading !== undefined && meterReading !== null
          ? meterReading
          : copiesUsedFromCounters(latestAllocation, product.meter_reading);

      // Step 1 - Check if machine is on RENT
      if (rentInvoice) {
        serviceContext = ServiceContext.RENT;
        jobType = JobType.WARRANTY_ONSITE;
        track = 'A';
        linkedInvoiceId = rentInvoice.id;
      } else {
        // Step 2 - Check if machine is under SALE warranty
        let isSaleWarrantyActive = false;
        if (saleInvoice) {
          warrantyInfo = evaluateWarranty({
            warrantyType: saleInvoice.warrantyType || 'duration',
            warrantyDurationValue: saleInvoice.warrantyDurationValue,
            warrantyDurationUnit: saleInvoice.warrantyDurationUnit,
            warrantyCopyLimit: saleInvoice.warrantyCopyLimit,
            startDate: new Date(saleInvoice.effectiveFrom || saleInvoice.createdAt),
            copiesUsed,
            // Legacy fallback: item-level warranty string or product.warranty (months)
            fallbackMonths: parseInt(saleInvoice.warranty || product.warranty || '12', 10) || 12,
            fallbackCopyLimit: product.warranty_max_pages || 200000,
          });

          if (warrantyInfo.isUnderWarranty) {
            serviceContext = ServiceContext.WARRANTY;
            track = 'A';
            linkedInvoiceId = saleInvoice.id;
            isSaleWarrantyActive = true;
          }
        }

        if (!isSaleWarrantyActive) {
          // Step 3 - Check if machine is on LEASE
          if (leaseInvoice) {
            warrantyInfo = evaluateWarranty({
              warrantyType: leaseInvoice.warrantyType || 'both',
              warrantyDurationValue: leaseInvoice.warrantyDurationValue,
              warrantyDurationUnit: leaseInvoice.warrantyDurationUnit,
              warrantyCopyLimit: leaseInvoice.warrantyCopyLimit,
              startDate: new Date(leaseInvoice.effectiveFrom),
              copiesUsed,
              fallbackMonths: Number(leaseInvoice.leaseTenureMonths) || 0,
              fallbackCopyLimit:
                Number(leaseInvoice.maxCopyLimit) || product.warranty_max_pages || 200000,
            });

            if (warrantyInfo.isUnderWarranty) {
              serviceContext = ServiceContext.LEASE_UNDER_WARRANTY;
              track = 'A';
              linkedInvoiceId = leaseInvoice.id;
            } else {
              serviceContext = ServiceContext.LEASE_EXPIRED;
              track = 'B';
              linkedInvoiceId = leaseInvoice.id;
            }
          }

          // Step 4 - Check for active service contracts if not matched on active lease/sale warranty
          if (
            serviceContext !== ServiceContext.LEASE_UNDER_WARRANTY &&
            serviceContext !== ServiceContext.LEASE_EXPIRED
          ) {
            const contractRepo = Source.getRepository(ServiceContract);
            const activeContract = await contractRepo.findOne({
              where: {
                productId: productId,
                status: 'ACTIVE',
              },
            });
            if (activeContract) {
              const now = new Date();
              if (now >= activeContract.startDate && now <= activeContract.endDate) {
                contractReferenceId = activeContract.id;
                if (activeContract.contractType === 'FSMA') {
                  serviceContext = ServiceContext.FSMA;
                  track = 'A';
                } else if (activeContract.contractType === 'SMA') {
                  serviceContext = ServiceContext.SMA;
                  track = 'A';
                } else if (activeContract.contractType === 'AMC') {
                  serviceContext = ServiceContext.AMC;
                  track = 'B';
                }

                // SMA is bounded by a copy limit too: report usage against it
                // (from the reading asked at ticket creation, falling back to
                // the machine's stored lifetime meter).
                if (
                  activeContract.contractType === 'SMA' &&
                  activeContract.copyLimit != null &&
                  activeContract.startMeterReading != null
                ) {
                  const currentMeter =
                    meterReading !== undefined && meterReading !== null
                      ? meterReading
                      : product.meter_reading || 0;
                  const used = Math.max(0, currentMeter - Number(activeContract.startMeterReading));
                  const limit = Number(activeContract.copyLimit);
                  contractUsage = {
                    copiesUsed: used,
                    copyLimit: limit,
                    copiesRemaining: Math.max(0, limit - used),
                    limitExceeded: used > limit,
                    overagePerCopyRate: Number(activeContract.overagePerCopyRate) || 0,
                  };
                }
              } else if (now > activeContract.endDate) {
                // Term is over — flip the stale ACTIVE status so lists and
                // stats stop counting it.
                activeContract.status = 'EXPIRED';
                await contractRepo.save(activeContract);
              }
            }
          }
        }
      }
    }

    // Lock job type to WARRANTY_ONSITE for Track A
    if (track === 'A') {
      jobType = JobType.WARRANTY_ONSITE;
    }

    return {
      serviceContext,
      contractReferenceId,
      productId,
      jobType,
      track,
      linkedInvoiceId,
      warrantyInfo,
      contractUsage,
    };
  }

  /**
   * POST /service/tickets
   */
  createTicket = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new Error('User not identified');

      const {
        customerId,
        leadId,
        productBrand,
        productModel,
        productName,
        serialNumber,
        issueDescription,
        jobType,
        scheduledVisitDate,
        ticketType,
        meterReadingAtCreation,
        serviceLocation,
      } = req.body;

      const reportedMeterReading =
        meterReadingAtCreation !== undefined &&
        meterReadingAtCreation !== null &&
        meterReadingAtCreation !== ''
          ? Number(meterReadingAtCreation)
          : undefined;
      if (
        reportedMeterReading !== undefined &&
        (isNaN(reportedMeterReading) || reportedMeterReading < 0)
      ) {
        throw new AppError('Invalid meter reading provided', 400);
      }

      const {
        serviceContext,
        contractReferenceId,
        productId,
        jobType: finalJobType,
        track,
        linkedInvoiceId,
      } = await this.determineServiceContextAndJobType(serialNumber, reportedMeterReading);

      // Persist the fresh reading on the product so future warranty checks use it
      if (reportedMeterReading !== undefined && productId) {
        const productRepo = Source.getRepository(Product);
        const product = await productRepo.findOne({ where: { id: productId } });
        if (product) {
          if (product.meter_reading && reportedMeterReading < product.meter_reading) {
            throw new AppError(
              `Meter reading ${reportedMeterReading} cannot be less than the current reading ${product.meter_reading}`,
              400,
            );
          }
          product.meter_reading = reportedMeterReading;
          await productRepo.save(product);
        }
      }

      const ticketRepo = Source.getRepository(ServiceTicket);
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const count = await ticketRepo.count();
      const ticketNumber = `ST-${year}${month}-${String(count + 1).padStart(4, '0')}`;

      const status = track === 'A' ? ServiceTicketStatus.FREE_SERVICE : ServiceTicketStatus.OPEN;

      const branchId = req.user.branchId || req.body.branchId;
      if (!branchId) throw new Error('Branch ID is required');

      const ticket = ticketRepo.create({
        ticketNumber,
        customerId: customerId || null,
        leadId: leadId || null,
        productId,
        productBrand,
        productModel,
        productName,
        serialNumber,
        serviceContext,
        contractReferenceId,
        issueDescription,
        jobType: finalJobType || jobType,
        status,
        scheduledVisitDate: scheduledVisitDate ? new Date(scheduledVisitDate) : null,
        createdBy: req.user.userId,
        branchId,
        track,
        linkedInvoiceId,
        ticketType: ticketType || 'COMPLAINT',
        meterReadingAtCreation: reportedMeterReading ?? null,
        serviceLocation: serviceLocation || null,
      });

      await ticketRepo.save(ticket);
      await this.logActivity(
        ticket.id,
        'CREATION',
        `Ticket ${ticket.ticketNumber} created under context ${ticket.serviceContext} (${track === 'A' ? 'Free Track A' : 'Chargeable Track B'})`,
        req.user.userId,
      );

      const managerIds = await this.getBranchManagerAndAdmins(branchId);
      for (const mId of managerIds) {
        await NotificationPublisher.publishInAppRequest({
          recipientId: mId,
          title: 'New Service Ticket Created',
          message: `Ticket ${ticket.ticketNumber} has been created for serial ${ticket.serialNumber}.`,
          type: 'INFO',
          referenceId: ticket.id,
          referenceType: 'SERVICE',
        });
      }

      res.status(201).json({ success: true, data: ticket });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /service/tickets/:id/assign
   */
  assignTechnician = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { assignedTechnicianId, scheduledVisitDate } = req.body;
      if (!assignedTechnicianId) throw new Error('Technician ID is required');

      const callerRole = req.user?.role;
      const callerJob = req.user?.employeeJob;
      const mayAssign =
        callerRole === 'MANAGER' || callerRole === 'ADMIN' || callerJob === 'SERVICE_HELP_DESK';
      if (!mayAssign) {
        throw new AppError(
          'Only the branch manager, admin, or service help desk can assign technicians',
          403,
        );
      }

      const id = req.params.id as string;
      const ticketRepo = Source.getRepository(ServiceTicket);
      const ticket = await ticketRepo.findOne({ where: { id: String(id) } });
      if (!ticket) throw new Error('Ticket not found');

      if (
        ticket.status === ServiceTicketStatus.COMPLETED ||
        ticket.status === ServiceTicketStatus.CANCELLED
      ) {
        throw new AppError(
          `Cannot change technician on a ${ticket.status.toLowerCase()} ticket`,
          400,
        );
      }

      const previousTechnicianId = ticket.assignedTechnicianId;
      const isReassignment =
        !!previousTechnicianId && previousTechnicianId !== assignedTechnicianId;

      // Reassignment releases the previous technician's claim (a manager's claim survives).
      if (
        ticket.diagnosisStartedBy &&
        ticket.diagnosisStartedBy === ticket.assignedTechnicianId &&
        ticket.assignedTechnicianId !== assignedTechnicianId
      ) {
        ticket.diagnosisStartedBy = null;
        ticket.diagnosisStartedAt = null;
      }

      ticket.assignedTechnicianId = assignedTechnicianId;
      if (scheduledVisitDate) {
        ticket.scheduledVisitDate = new Date(scheduledVisitDate);
      }
      // The manager may diagnose/estimate before assignment; assigning a
      // technician afterwards must not regress a ticket already in the
      // estimate/approval flow back to ASSIGNED.
      if (
        ticket.status === ServiceTicketStatus.OPEN ||
        ticket.status === ServiceTicketStatus.ASSIGNED ||
        (ticket.status === ServiceTicketStatus.FREE_SERVICE && !ticket.diagnosisCompletedAt)
      ) {
        ticket.status = ServiceTicketStatus.ASSIGNED;
      }
      await ticketRepo.save(ticket);

      // Target credit for this job (see billing_service's employee-targets
      // achievement-summary query) follows whichever technician is assigned
      // when the ticket reaches COMPLETED — so a mid-flow reassignment simply
      // transfers the eventual credit to the new technician, no separate bookkeeping needed.
      await this.logActivity(
        ticket.id,
        'ASSIGNMENT',
        isReassignment
          ? `Technician changed. Job (and its eventual target credit) reassigned to a new technician.`
          : `Technician assigned to ticket.`,
        req.user?.userId,
      );

      if (isReassignment && previousTechnicianId) {
        await NotificationPublisher.publishInAppRequest({
          recipientId: previousTechnicianId,
          title: 'Reassigned from Service Job',
          message: `Ticket ${ticket.ticketNumber} has been reassigned to another technician.`,
          type: 'INFO',
          referenceId: ticket.id,
          referenceType: 'SERVICE',
        });
      }

      await NotificationPublisher.publishInAppRequest({
        recipientId: assignedTechnicianId,
        title: isReassignment ? 'Service Job Reassigned to You' : 'New Service Job Assigned',
        message: `You have been assigned to service ticket ${ticket.ticketNumber}. Scheduled visit: ${ticket.scheduledVisitDate?.toLocaleDateString() || 'N/A'}.`,
        type: 'TASK',
        referenceId: ticket.id,
        referenceType: 'SERVICE',
      });

      res.status(200).json({ success: true, data: ticket });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /service/tickets/:id/start-diagnosis
   */
  startDiagnosis = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const ticketRepo = Source.getRepository(ServiceTicket);
      const ticket = await ticketRepo.findOne({ where: { id: String(id) } });
      if (!ticket) throw new Error('Ticket not found');

      // Only the assigned technician or the branch manager/admin may open a ticket.
      const userId = req.user?.userId;
      const role = req.user?.role;
      const isManager = role === 'MANAGER' || role === 'ADMIN';
      if (!isManager && ticket.assignedTechnicianId !== userId) {
        throw new AppError(
          'Only the assigned technician or the branch manager can open this ticket',
          403,
        );
      }
      // First opener is recorded for audit; the branch manager and the
      // assigned technician may both work the ticket (manager can estimate
      // before assignment, technician can estimate after being assigned).
      if (!ticket.diagnosisStartedAt) {
        ticket.diagnosisStartedAt = new Date();
      }
      if (!ticket.diagnosisStartedBy) {
        ticket.diagnosisStartedBy = userId || null;
      }
      await ticketRepo.save(ticket);

      await this.logActivity(
        ticket.id,
        'DIAGNOSIS_STARTED',
        isManager && ticket.assignedTechnicianId !== userId
          ? 'Branch manager opened the ticket and started diagnosis.'
          : 'Technician started diagnosis.',
        req.user?.userId,
      );

      res.status(200).json({ success: true, data: ticket });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /service/tickets/:id/diagnose
   */
  diagnoseTicket = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        problemFound,
        rootCause,
        technicianNotes,
        meterReading,
        items,
        labourCost,
        visitChargeAmount,
        visitChargeMethod,
        visitChargeCollected,
        visitChargePaymentMode,
        visitChargeAccountId,
        transportChargeAmount,
        discountAmount,
        technicianNoteToFinance,
      } = req.body;
      const id = req.params.id as string;
      const ticketRepo = Source.getRepository(ServiceTicket);
      const ticket = await ticketRepo.findOne({ where: { id: String(id) } });
      if (!ticket) throw new Error('Ticket not found');

      // Same rules as start-diagnosis: assigned technician or manager.
      const diagUserId = req.user?.userId;
      const diagRole = req.user?.role;
      const diagIsManager = diagRole === 'MANAGER' || diagRole === 'ADMIN';
      if (!diagIsManager && ticket.assignedTechnicianId !== diagUserId) {
        throw new AppError(
          'Only the assigned technician or the branch manager can diagnose this ticket',
          403,
        );
      }
      if (!ticket.diagnosisStartedBy) {
        ticket.diagnosisStartedBy = diagUserId || null;
      }

      // OPEN is allowed so the branch manager can diagnose and estimate
      // before a technician is assigned.
      const allowedDiagnoseStatuses: ServiceTicketStatus[] = [
        ServiceTicketStatus.OPEN,
        ServiceTicketStatus.ASSIGNED,
        ServiceTicketStatus.DIAGNOSED,
        ServiceTicketStatus.FREE_SERVICE,
      ];
      if (!allowedDiagnoseStatuses.includes(ticket.status)) {
        throw new AppError(`Cannot diagnose ticket with current status: ${ticket.status}`, 400);
      }

      let diagnosisProduct: Product | null = null;
      if (meterReading !== undefined && meterReading !== null && ticket.productId) {
        diagnosisProduct = await Source.getRepository(Product).findOne({
          where: { id: ticket.productId },
        });
        if (diagnosisProduct?.meter_reading && meterReading < diagnosisProduct.meter_reading) {
          throw new AppError(
            `Meter reading ${meterReading} cannot be less than the current reading ${diagnosisProduct.meter_reading}`,
            400,
          );
        }
      }

      const isFreeContext = ticket.track === 'A';

      // Visit + transportation are free whenever the machine is covered by a
      // service contract (AMC/SMA/FSMA — all include travel), by warranty, or is
      // a company-owned RENT machine. Only uncovered machines pay these charges.
      const travelCoveredContext = [
        ServiceContext.AMC,
        ServiceContext.SMA,
        ServiceContext.FSMA,
        ServiceContext.RENT,
        ServiceContext.WARRANTY,
        ServiceContext.LEASE_UNDER_WARRANTY,
      ].includes(ticket.serviceContext);
      const effectiveVisitCharge = travelCoveredContext ? 0 : Number(visitChargeAmount) || 0;
      const effectiveTransportCharge = travelCoveredContext
        ? 0
        : Number(transportChargeAmount) || 0;

      // Fail fast before any mutation below: this whole handler isn't
      // transactional, so a validation error thrown after ticket/estimate
      // writes have already landed would leave a half-committed state.
      if (
        !isFreeContext &&
        visitChargeMethod === 'SEPARATE' &&
        effectiveVisitCharge > 0 &&
        visitChargeCollected &&
        !ticket.visitChargeCollected &&
        (!visitChargePaymentMode || (visitChargePaymentMode !== 'CHEQUE' && !visitChargeAccountId))
      ) {
        throw new AppError(
          'Payment mode (and account, unless paying by cheque) are required to post the visit charge.',
          400,
        );
      }

      ticket.diagnosisCompletedAt = new Date();
      if (ticket.diagnosisStartedAt) {
        ticket.diagnosisDuration = Math.round(
          (ticket.diagnosisCompletedAt.getTime() - ticket.diagnosisStartedAt.getTime()) / 60000,
        );
      }

      ticket.problemFound = problemFound;
      ticket.rootCause = rootCause;
      ticket.diagnosisNotes = technicianNotes;
      ticket.meterReadingAtService = meterReading || 0;

      if (isFreeContext) {
        ticket.status = ServiceTicketStatus.FREE_SERVICE;
      } else {
        ticket.status = ServiceTicketStatus.WAITING_FINANCE_APPROVAL;
        ticket.visitChargeAmount = effectiveVisitCharge;
        ticket.visitChargeMethod = visitChargeMethod || null;
        ticket.transportChargeAmount = effectiveTransportCharge;
        ticket.discountAmount = Number(discountAmount) || 0;
      }

      await ticketRepo.save(ticket);

      // Sync the machine's canonical meter reading at diagnosis time — this is
      // a physical read of the machine, independent of whatever finance/
      // customer later decide about the estimate, so it's never gated on
      // approval status.
      if (diagnosisProduct && meterReading !== undefined && meterReading !== null) {
        diagnosisProduct.meter_reading = Number(meterReading);
        await Source.getRepository(Product).save(diagnosisProduct);
      }

      // Save Diagnosis Report
      const diagnosisRepo = Source.getRepository(ServiceDiagnosis);
      const diagnosis = diagnosisRepo.create({
        ticketId: ticket.id,
        problemFound,
        rootCause,
        technicianNotes,
        meterReading: meterReading || 0,
      });
      await diagnosisRepo.save(diagnosis);

      const itemRepo = Source.getRepository(ServiceTicketItem);
      const ticketItems: ServiceTicketItem[] = [];

      // Under a contract, "free" is per item category (e.g. SMA covers spare
      // parts but charges toner). Warranty mirrors SMA (toner chargeable);
      // RENT + no-contract track A stay fully free.
      const contractCoverage =
        (await this.getTicketContractCoverage(ticket.contractReferenceId)) ??
        (ticket.serviceContext === ServiceContext.WARRANTY ||
        ticket.serviceContext === ServiceContext.LEASE_UNDER_WARRANTY
          ? { ...WARRANTY_COVERAGE }
          : null);

      if (items && Array.isArray(items)) {
        const sparePartRepo = Source.getRepository(SparePart);
        for (const itemData of items) {
          let partName = itemData.partName;
          let sku = itemData.sku || null;
          let barcodeId = itemData.barcodeId || null;
          let unitPrice = Number(itemData.unitPrice) || 0;
          let partCategory: string | null = null;
          let partBrand = itemData.customPartBrand || null;
          let mpn = itemData.mpn || null;

          if (itemData.itemSource === ServiceItemSource.SPARE_PART && itemData.sparePartId) {
            const part = await sparePartRepo.findOne({
              where: { id: String(itemData.sparePartId) },
            });
            if (part) {
              partName = part.part_name;
              sku = part.sku;
              barcodeId = part.barcode_id || null;
              unitPrice = Number(part.base_price) || 0;
              partCategory = part.part_category || null;
              partBrand = part.brand || null;
              mpn = part.mpn || null;

              // Check stock warnings
              if (part.quantity <= 5) {
                const managerIds = await this.getBranchManagerAndAdmins(ticket.branchId);
                for (const mId of managerIds) {
                  await NotificationPublisher.publishInAppRequest({
                    recipientId: mId,
                    title: 'Low Stock Alert (Service Diagnosis)',
                    message: `Spare part "${part.part_name}" (SKU: ${part.sku}) is low in stock (Qty: ${part.quantity}). Procurement needed for ticket ${ticket.ticketNumber}.`,
                    type: 'WARNING',
                    referenceId: ticket.id,
                    referenceType: 'SERVICE',
                  });
                }
              }
            }
          }

          const coveredByContract = contractCoverage
            ? coverageAllowsItem(contractCoverage, { partCategory, partName })
            : true;
          const isItemFree = isFreeContext ? coveredByContract : !!itemData.isFree;
          const finalPrice = isItemFree ? 0 : unitPrice;

          const serviceItem = itemRepo.create({
            ticketId: ticket.id,
            itemSource: itemData.itemSource,
            sparePartId: itemData.sparePartId || null,
            sku,
            barcodeId,
            customPartName: itemData.customPartName || null,
            customPartBrand: itemData.customPartBrand || null,
            customPartDescription: itemData.customPartDescription || null,
            partBrand,
            mpn,
            partName,
            quantity: itemData.quantity || 1,
            unitPrice: finalPrice,
            totalPrice: finalPrice * (itemData.quantity || 1),
            isFree: isItemFree,
          });
          ticketItems.push(serviceItem);

          // Reserve Parts Immediately for Free Workflows
          if (
            isFreeContext &&
            itemData.itemSource === ServiceItemSource.SPARE_PART &&
            itemData.sparePartId
          ) {
            await this.reserveSparePart(ticket.id, itemData.sparePartId, itemData.quantity || 1);
          }
        }
      }

      ticket.items = ticketItems;
      await ticketRepo.save(ticket);

      // For Track A, automatically generate/send FOC Estimate to billing service.
      // Items excluded by the contract (e.g. toner under SMA) keep their price.
      if (isFreeContext) {
        const billingItems = ticketItems.map((item) => ({
          itemSource: item.itemSource,
          productId: item.sparePartId || null,
          sparePartId: item.sparePartId || null,
          partName: item.partName,
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice) || 0,
          totalPrice: Number(item.totalPrice) || 0,
          isFree: item.isFree,
        }));
        try {
          const token = sign(
            { userId: 'ven_inv_service', role: 'ADMIN' },
            ACCESS_SECRET as string,
            {
              expiresIn: '1m',
            },
          );

          const response = await axios.post(
            `${BILLING_SERVICE_URL}/invoices/service-quotation`,
            {
              customerId: ticket.customerId,
              branchId: ticket.branchId,
              createdBy: req.user?.userId || 'SYSTEM',
              serviceTicketId: ticket.id,
              items: billingItems,
              saleType: 'SERVICE',
              status: 'APPROVED',
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );
          if (response.data?.success) {
            ticket.linkedInvoiceId = response.data.data.id;
            ticket.estimateSentToFinance = true;
            await ticketRepo.save(ticket);
          }
        } catch (billingErr) {
          logger.error('Failed to post FOC estimate to billing service:', billingErr);
        }

        await this.logActivity(
          ticket.id,
          'ESTIMATE_RECORDED',
          `FOC estimate automatically created and sent to billing service.`,
          req.user?.userId,
        );
      }

      // If Track B workflow with parts or labor, automatically generate a WAITING_FINANCE_APPROVAL Estimate
      const inputLabour = Number(labourCost) || 0;
      const finalLabourCost =
        ticket.serviceContext === ServiceContext.AMC ||
        ticket.serviceContext === ServiceContext.RENT ||
        ticket.serviceContext === ServiceContext.WARRANTY ||
        ticket.serviceContext === ServiceContext.LEASE_UNDER_WARRANTY ||
        ticket.serviceContext === ServiceContext.FSMA ||
        ticket.serviceContext === ServiceContext.SMA
          ? 0
          : inputLabour;

      if (
        !isFreeContext &&
        ((ticketItems && ticketItems.length > 0) ||
          finalLabourCost > 0 ||
          effectiveVisitCharge > 0 ||
          effectiveTransportCharge > 0)
      ) {
        // Discount applies to the whole estimate (parts + labour + transport +
        // visit charge when added to the estimate) — cap it there.
        const billablePartsTotal = ticketItems.reduce(
          (sum, it) => sum + (Number(it.totalPrice) || 0),
          0,
        );
        const estimateGrandTotal =
          billablePartsTotal +
          finalLabourCost +
          effectiveTransportCharge +
          (visitChargeMethod === 'ADDED_TO_ESTIMATE' ? effectiveVisitCharge : 0);
        if (Number(discountAmount || 0) > estimateGrandTotal) {
          throw new AppError(
            `Discount of QAR ${discountAmount} exceeds the total estimate amount of QAR ${estimateGrandTotal}.`,
            400,
          );
        }

        const estimateRepo = Source.getRepository(ServiceEstimate);
        const estItemRepo = Source.getRepository(ServiceEstimateItem);

        let totalCost =
          finalLabourCost +
          effectiveTransportCharge +
          (visitChargeMethod === 'ADDED_TO_ESTIMATE' ? effectiveVisitCharge : 0);
        const estItemsToSave: ServiceEstimateItem[] = [];

        const estimate = estimateRepo.create({
          ticketId: ticket.id,
          labourCost: finalLabourCost,
          totalCost: 0,
          status: ServiceEstimateStatus.WAITING_FINANCE_APPROVAL,
          version: 1,
        });
        await estimateRepo.save(estimate);

        for (const ticketItem of ticketItems) {
          const itemTotal = Number(ticketItem.totalPrice) || 0;
          totalCost += itemTotal;

          const estItem = estItemRepo.create({
            estimateId: estimate.id,
            itemSource:
              ticketItem.itemSource === ServiceItemSource.SPARE_PART
                ? ServiceEstimateItemSource.SPARE_PART
                : ServiceEstimateItemSource.CUSTOM,
            sparePartId: ticketItem.sparePartId,
            sku: ticketItem.sku,
            partName: ticketItem.partName,
            quantity: ticketItem.quantity,
            unitPrice: ticketItem.unitPrice,
            totalPrice: ticketItem.totalPrice,
            isFree: ticketItem.isFree,
            isApproved: true,
          });
          estItemsToSave.push(estItem);
        }

        estimate.totalCost = Math.max(0, totalCost - (Number(discountAmount) || 0));
        estimate.partsCost = billablePartsTotal;
        estimate.visitChargeAmount =
          visitChargeMethod === 'ADDED_TO_ESTIMATE' ? effectiveVisitCharge : 0;
        estimate.transportChargeAmount = effectiveTransportCharge;
        estimate.discountAmount = Number(discountAmount) || 0;
        estimate.items = estItemsToSave;
        await estimateRepo.save(estimate);

        await this.logActivity(
          ticket.id,
          'ESTIMATE_CREATED',
          `Estimate Version 1 created in WAITING_FINANCE_APPROVAL status. Total: ${totalCost}`,
          req.user?.userId,
        );

        // Generate billing invoice for Track B. Brand + MPN travel in the
        // description so finance sees exactly which part is being quoted.
        const billingItems = ticketItems.map((item) => ({
          description: `${item.partName}${item.partBrand ? ` — ${item.partBrand}` : ''}${
            item.mpn ? ` [MPN: ${item.mpn}]` : ''
          }`,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice) || 0,
          isFree: item.isFree,
        }));

        billingItems.push({
          description: 'Labor Cost / Service Charge',
          quantity: 1,
          unitPrice: Number(finalLabourCost) || 0,
          isFree: false,
        });

        if (effectiveTransportCharge > 0) {
          billingItems.push({
            description: 'Transportation / Pickup & Delivery',
            quantity: 1,
            unitPrice: effectiveTransportCharge,
            isFree: false,
          });
        }

        try {
          const token = sign(
            { userId: 'ven_inv_service', role: 'ADMIN' },
            ACCESS_SECRET as string,
            {
              expiresIn: '1m',
            },
          );

          const response = await axios.post(
            `${BILLING_SERVICE_URL}/invoices/service-quotation`,
            {
              customerId: ticket.customerId,
              branchId: ticket.branchId,
              createdBy: req.user?.userId || 'SYSTEM',
              serviceTicketId: ticket.id,
              items: billingItems,
              visitChargeAmount: effectiveVisitCharge,
              visitChargeMethod: visitChargeMethod || null,
              discountAmount: Number(discountAmount) || 0,
              technicianNoteToFinance: technicianNoteToFinance || null,
              saleType: 'PRODUCT_SALE',
              status: 'WAITING_FINANCE_APPROVAL',
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );
          if (response.data?.success) {
            ticket.serviceQuotationId = response.data.data.id;
            ticket.linkedInvoiceId = response.data.data.id;
            ticket.estimateSentToFinance = true;
            await ticketRepo.save(ticket);
          }
        } catch (billingErr) {
          logger.error('Failed to post estimate to billing service:', billingErr);
        }
      }

      // Visit charge collected separately in cash on-site: post the receipt to
      // billing immediately so it shows up in the cashbook / day book and earnings
      // without waiting for the estimate to be paid.
      if (
        !isFreeContext &&
        visitChargeMethod === 'SEPARATE' &&
        effectiveVisitCharge > 0 &&
        visitChargeCollected &&
        !ticket.visitChargeCollected
      ) {
        try {
          const token = sign(
            { userId: 'ven_inv_service', role: 'ADMIN' },
            ACCESS_SECRET as string,
            {
              expiresIn: '1m',
            },
          );
          await axios.post(
            `${BILLING_SERVICE_URL}/invoices/service-visit-charge`,
            {
              serviceTicketId: ticket.id,
              ticketNumber: ticket.ticketNumber,
              customerId: ticket.customerId,
              branchId: ticket.branchId,
              amount: effectiveVisitCharge,
              collectedBy: req.user?.userId || 'SYSTEM',
              paymentMode: visitChargePaymentMode,
              accountId: visitChargeAccountId,
            },
            { headers: { Authorization: `Bearer ${token}` } },
          );
          ticket.visitChargeCollected = true;
          ticket.visitChargeCollectedAt = new Date();
          await ticketRepo.save(ticket);
          await this.logActivity(
            ticket.id,
            'VISIT_CHARGE_COLLECTED',
            `Visit charge of ${effectiveVisitCharge} collected in cash on-site and posted to accounts.`,
            req.user?.userId,
          );
        } catch (err) {
          logger.error('Failed to post on-site visit charge receipt to billing:', err);
        }
      }

      await this.logActivity(
        ticket.id,
        'DIAGNOSIS_COMPLETED',
        `Diagnosis completed. Problem found: ${problemFound}`,
        req.user?.userId,
      );

      const managerIds = await this.getBranchManagerAndAdmins(ticket.branchId);
      for (const mId of managerIds) {
        await NotificationPublisher.publishInAppRequest({
          recipientId: mId,
          title: 'Ticket Diagnosis Completed',
          message: `Technician diagnosed ticket ${ticket.ticketNumber} and listed parts.`,
          type: 'INFO',
          referenceId: ticket.id,
          referenceType: 'SERVICE',
        });
      }

      res.status(200).json({ success: true, data: ticket });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /service/tickets/:id/estimates
   */
  createEstimate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { labourCost, items } = req.body;
      const id = req.params.id as string;
      const ticketRepo = Source.getRepository(ServiceTicket);
      const ticket = await ticketRepo.findOne({ where: { id: String(id) } });
      if (!ticket) throw new Error('Ticket not found');

      let finalLabourCost = Number(labourCost) || 0;
      if (
        ticket.serviceContext === ServiceContext.RENT ||
        ticket.serviceContext === ServiceContext.WARRANTY ||
        ticket.serviceContext === ServiceContext.LEASE_UNDER_WARRANTY ||
        ticket.serviceContext === ServiceContext.FSMA ||
        ticket.serviceContext === ServiceContext.SMA ||
        ticket.serviceContext === ServiceContext.AMC
      ) {
        finalLabourCost = 0;
      }

      const estimateRepo = Source.getRepository(ServiceEstimate);
      let estimate = await estimateRepo.findOne({
        where: { ticketId: ticket.id, status: ServiceEstimateStatus.DRAFT },
      });
      if (!estimate) {
        estimate = estimateRepo.create({
          ticketId: ticket.id,
          labourCost: finalLabourCost,
          totalCost: 0,
          status: ServiceEstimateStatus.DRAFT,
          version: 1,
        });
      } else {
        estimate.labourCost = finalLabourCost;
      }
      await estimateRepo.save(estimate);

      const estItemRepo = Source.getRepository(ServiceEstimateItem);
      await estItemRepo.delete({ estimateId: estimate.id });

      let calculatedTotal = Number(estimate.labourCost);
      const savedItems: ServiceEstimateItem[] = [];

      if (items && Array.isArray(items)) {
        const sparePartRepo = Source.getRepository(SparePart);
        for (const it of items) {
          let partName = it.partName || '';
          let sku = it.sku || '';
          let basePrice = Number(it.unitPrice) || 0;
          let partCategory: string | null = null;

          if (it.sparePartId) {
            const part = await sparePartRepo.findOne({ where: { id: String(it.sparePartId) } });
            if (part) {
              partName = part.part_name;
              sku = part.sku;
              partCategory = part.part_category || null;
              if (basePrice === 0) {
                basePrice = Number(part.base_price) || 0;
              }
            }
          }

          let isItemFree = !!it.isFree;
          if (
            ticket.serviceContext === ServiceContext.RENT ||
            ticket.serviceContext === ServiceContext.FSMA
          ) {
            isItemFree = true;
          } else if (
            ticket.serviceContext === ServiceContext.WARRANTY ||
            ticket.serviceContext === ServiceContext.LEASE_UNDER_WARRANTY
          ) {
            // Warranty mirrors SMA: parts free, toner chargeable
            isItemFree = coverageAllowsItem(WARRANTY_COVERAGE, { partCategory, partName });
          } else if (ticket.serviceContext === ServiceContext.AMC) {
            isItemFree = false;
          }

          const finalPrice = isItemFree ? 0 : basePrice;
          const itemTotal = finalPrice * (it.quantity || 1);
          calculatedTotal += itemTotal;

          const estItem = estItemRepo.create({
            estimateId: estimate.id,
            itemSource: it.sparePartId
              ? ServiceEstimateItemSource.SPARE_PART
              : ServiceEstimateItemSource.CUSTOM,
            sparePartId: it.sparePartId || null,
            sku,
            partName,
            quantity: it.quantity || 1,
            unitPrice: finalPrice,
            totalPrice: itemTotal,
            isFree: isItemFree,
            isApproved: true,
          });
          savedItems.push(estItem);
        }
      }

      estimate.totalCost = calculatedTotal;
      estimate.items = savedItems;
      await estimateRepo.save(estimate);

      res.status(200).json({ success: true, data: estimate });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /service/tickets/:id/estimates/submit
   */
  submitEstimateForApproval = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const estimateRepo = Source.getRepository(ServiceEstimate);
      const estimate = await estimateRepo.findOne({
        where: { ticketId: String(id), status: ServiceEstimateStatus.DRAFT },
        relations: ['items'],
      });
      if (!estimate) throw new Error('Draft estimate not found');

      estimate.status = ServiceEstimateStatus.WAITING_FINANCE_APPROVAL;
      await estimateRepo.save(estimate);

      const ticketRepo = Source.getRepository(ServiceTicket);
      const ticket = await ticketRepo.findOne({ where: { id: String(id) } });
      if (ticket) {
        ticket.status = ServiceTicketStatus.WAITING_FINANCE_APPROVAL;

        // Post the Track B estimate to the billing service to generate a service quotation
        const billingItems = (estimate.items || [])
          .filter((it) => it.isApproved)
          .map((it) => ({
            description: it.partName || it.sku || 'Spare Part',
            quantity: Number(it.quantity) || 1,
            unitPrice: Number(it.unitPrice) || 0,
            isFree: !!it.isFree,
          }));

        if (Number(estimate.labourCost) > 0) {
          billingItems.push({
            description: 'Labour Charges',
            quantity: 1,
            unitPrice: Number(estimate.labourCost),
            isFree: false,
          });
        }

        try {
          const token = sign(
            { userId: 'ven_inv_service', role: 'ADMIN' },
            ACCESS_SECRET as string,
            {
              expiresIn: '1m',
            },
          );

          const response = await axios.post(
            `${BILLING_SERVICE_URL}/invoices/service-quotation`,
            {
              customerId: ticket.customerId,
              branchId: ticket.branchId,
              createdBy: req.user?.userId || 'SYSTEM',
              serviceTicketId: ticket.id,
              items: billingItems,
              saleType: 'SERVICE',
              status: 'WAITING_FINANCE_APPROVAL',
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );

          if (response.data?.success) {
            ticket.serviceQuotationId = response.data.data.id;
            ticket.estimateSentToFinance = true;
          }
        } catch (billingErr) {
          logger.error('Failed to post Track B estimate to billing service:', billingErr);
        }

        await ticketRepo.save(ticket);
      }

      await this.logActivity(
        id,
        'ESTIMATE_SUBMITTED',
        `Estimate submitted for internal finance approval.`,
        req.user?.userId,
      );

      try {
        const branchId = ticket?.branchId;
        const financeEmployees = await getFinanceEmployeesByBranch(branchId);
        const customerName = await getCustomerName(ticket?.customerId || undefined);
        const totalCost = estimate.totalCost;

        for (const financeEmployeeId of financeEmployees) {
          try {
            await NotificationPublisher.publishInAppRequest({
              recipientId: financeEmployeeId,
              title: 'Service Estimate Pending Approval',
              message: `Service estimate for ticket ${ticket?.ticketNumber} (${customerName} — ${ticket?.productBrand} ${ticket?.productModel}) requires your review. Total: QAR ${totalCost}. Please approve or reject.`,
              type: 'SERVICE_QUOTE_PENDING_FINANCE',
              referenceId: ticket?.id || '',
              referenceType: 'SERVICE_TICKET',
            });
          } catch (err) {
            console.error('Notification failed (non-blocking):', err);
          }
        }
      } catch (e) {
        logger.warn('Failed to notify finance users:', e);
      }

      res.status(200).json({ success: true, data: estimate });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /service/estimates/:estimateId/approve-finance
   */
  approveEstimateFinance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const estimateId = req.params.estimateId as string;
      const estimateRepo = Source.getRepository(ServiceEstimate);
      const estimate = await estimateRepo.findOne({ where: { id: String(estimateId) } });
      if (!estimate) throw new Error('Estimate not found');

      estimate.status = ServiceEstimateStatus.FINANCE_APPROVED;
      await estimateRepo.save(estimate);

      const ticketRepo = Source.getRepository(ServiceTicket);
      const ticket = await ticketRepo.findOne({ where: { id: estimate.ticketId } });
      if (ticket) {
        ticket.status = ServiceTicketStatus.FINANCE_APPROVED;
        await ticketRepo.save(ticket);

        await this.logActivity(
          ticket.id,
          'ESTIMATE_FINANCE_APPROVED',
          `Estimate approved internally by Finance.`,
          req.user?.userId,
        );

        const managerIds = await this.getBranchManagerAndAdmins(ticket.branchId);
        for (const mId of managerIds) {
          await NotificationPublisher.publishInAppRequest({
            recipientId: mId,
            title: 'Estimate Approved by Finance',
            message: `Service Estimate for ticket ${ticket.ticketNumber} approved by Finance. Ready for customer review.`,
            type: 'INFO',
            referenceId: ticket.id,
            referenceType: 'SERVICE',
          });
        }
      }

      res.status(200).json({ success: true, data: estimate });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /service/estimates/:estimateId/reject-finance
   */
  rejectEstimateFinance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const estimateId = req.params.estimateId as string;
      const { remarks } = req.body;
      if (!remarks || !remarks.trim()) {
        throw new AppError('Rejection remarks are required', 400);
      }

      const estimateRepo = Source.getRepository(ServiceEstimate);
      const estimate = await estimateRepo.findOne({ where: { id: String(estimateId) } });
      if (!estimate) throw new Error('Estimate not found');

      estimate.status = ServiceEstimateStatus.REJECTED;
      await estimateRepo.save(estimate);

      const ticketRepo = Source.getRepository(ServiceTicket);
      const ticket = await ticketRepo.findOne({ where: { id: estimate.ticketId } });
      if (ticket) {
        ticket.status = ServiceTicketStatus.FINANCE_REJECTED;
        await ticketRepo.save(ticket);

        // Call billing service to reject invoice
        try {
          const token = sign(
            { userId: 'ven_inv_service', role: 'ADMIN' },
            ACCESS_SECRET as string,
            {
              expiresIn: '1m',
            },
          );
          await axios.post(
            `${BILLING_SERVICE_URL}/invoices/${ticket.serviceQuotationId}/finance-reject`,
            { reason: remarks },
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );
        } catch (err) {
          logger.error('Failed to reject invoice in billing service:', err);
        }

        await this.logActivity(
          ticket.id,
          'ESTIMATE_FINANCE_REJECTED',
          `Estimate rejected by Finance. Remarks: ${remarks}`,
          req.user?.userId,
        );
      }

      res.status(200).json({ success: true, data: estimate });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /service/estimates/:estimateId/approve-customer
   */
  approveEstimateCustomer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const estimateId = req.params.estimateId as string;
      const estimateRepo = Source.getRepository(ServiceEstimate);
      const estimate = await estimateRepo.findOne({
        where: { id: String(estimateId) },
        relations: ['items'],
      });
      if (!estimate) throw new Error('Estimate not found');

      estimate.status = ServiceEstimateStatus.CUSTOMER_APPROVED;
      await estimateRepo.save(estimate);

      const ticketRepo = Source.getRepository(ServiceTicket);
      const ticket = await ticketRepo.findOne({ where: { id: estimate.ticketId } });
      if (!ticket) throw new Error('Ticket not found');

      ticket.status = ServiceTicketStatus.CUSTOMER_APPROVED;
      await ticketRepo.save(ticket);

      for (const item of estimate.items) {
        if (item.itemSource === ServiceEstimateItemSource.SPARE_PART && item.sparePartId) {
          await this.reserveSparePart(ticket.id, item.sparePartId, item.quantity);
        }
      }

      if (ticket.leadId) {
        try {
          const convertRes = await axios.post(
            `${CRM_SERVICE_URL}${CRM_ENDPOINTS.LEAD_CONVERT.replace(':id', ticket.leadId)}`,
            { location: 'Service Site Location' },
            { headers: { Authorization: req.headers.authorization } },
          );
          if (convertRes.data && convertRes.data.success) {
            ticket.customerId = convertRes.data.data.customerId;
            ticket.leadId = null;
            await ticketRepo.save(ticket);
            logger.info(`Lead converted to customer: ${ticket.customerId}`);
          }
        } catch (err) {
          logger.error('Failed to convert CRM lead upon customer approval:', err);
        }
      }

      await this.logActivity(
        ticket.id,
        'ESTIMATE_CUSTOMER_APPROVED',
        `Estimate approved by Customer. Inventory parts reserved.`,
        req.user?.userId,
      );

      if (ticket.assignedTechnicianId) {
        await NotificationPublisher.publishInAppRequest({
          recipientId: ticket.assignedTechnicianId,
          title: 'Customer Approved Service',
          message: `Customer approved service estimate for ticket ${ticket.ticketNumber}. You can start repair work.`,
          type: 'TASK',
          referenceId: ticket.id,
          referenceType: 'SERVICE',
        });
      }

      res.status(200).json({ success: true, data: estimate });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /service/estimates/:estimateId/reject-customer
   */
  rejectEstimateCustomer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const estimateId = req.params.estimateId as string;
      const estimateRepo = Source.getRepository(ServiceEstimate);
      const estimate = await estimateRepo.findOne({ where: { id: String(estimateId) } });
      if (!estimate) throw new Error('Estimate not found');

      const ticketRepo = Source.getRepository(ServiceTicket);
      const ticket = await ticketRepo.findOne({ where: { id: estimate.ticketId } });

      const { collectVisitCharge, paymentMode, accountId, reason, discountAmount } = req.body ?? {};

      if (!reason || !String(reason).trim()) {
        throw new AppError('A reason is required, whether rejecting or offering a discount', 400);
      }

      // Staff offering a discount to retain the customer instead of an
      // outright rejection: apply it immediately (no finance re-approval —
      // this is a save-the-sale negotiation, not a technician re-diagnosis),
      // leave the estimate/ticket status untouched so the customer can still
      // Approve/Reject against the new lower total.
      const discountToApply = Number(discountAmount) || 0;
      if (discountToApply > 0) {
        if (discountToApply > Number(estimate.totalCost)) {
          throw new AppError(
            `Discount of QAR ${discountToApply} exceeds the current estimate total of QAR ${estimate.totalCost}.`,
            400,
          );
        }
        estimate.discountAmount = (Number(estimate.discountAmount) || 0) + discountToApply;
        estimate.totalCost = Math.max(0, Number(estimate.totalCost) - discountToApply);
        await estimateRepo.save(estimate);

        if (ticket) {
          ticket.discountAmount = (Number(ticket.discountAmount) || 0) + discountToApply;
          await ticketRepo.save(ticket);
          await this.syncInvoiceDiscount(ticket, discountToApply);
          await this.logActivity(
            ticket.id,
            'ESTIMATE_DISCOUNT_OFFERED',
            `Staff offered a QAR ${discountToApply} discount instead of rejection. Reason: ${reason}. New total: QAR ${estimate.totalCost}.`,
            req.user?.userId,
          );
        }

        return res.status(200).json({ success: true, data: estimate });
      }

      if (ticket) {
        this.assertVisitChargeCollectionInputValid(ticket, {
          collectVisitCharge,
          paymentMode,
          accountId,
        });
      }

      estimate.status = ServiceEstimateStatus.REJECTED;
      await estimateRepo.save(estimate);

      if (ticket) {
        ticket.status = ServiceTicketStatus.CUSTOMER_REJECTED;
        await ticketRepo.save(ticket);

        try {
          await this.collectVisitChargeOnRejection(
            ticket,
            { collectVisitCharge, paymentMode, accountId },
            req.user?.userId,
          );
        } catch (err) {
          logger.error('Failed to collect visit charge at estimate rejection:', err);
        }

        await this.logActivity(
          ticket.id,
          'ESTIMATE_CUSTOMER_REJECTED',
          `Estimate rejected by Customer. Reason: ${reason}`,
          req.user?.userId,
        );
      }

      res.status(200).json({ success: true, data: estimate });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /service/tickets/:id/estimates/revisions
   */
  createEstimateRevision = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { labourCost, items } = req.body;
      const ticketId = req.params.id as string;

      const ticketRepo = Source.getRepository(ServiceTicket);
      const ticket = await ticketRepo.findOne({ where: { id: String(ticketId) } });
      if (!ticket) throw new Error('Ticket not found');

      const estimateRepo = Source.getRepository(ServiceEstimate);
      const activeEstimate = await estimateRepo.findOne({
        where: { ticketId: String(ticketId), status: ServiceEstimateStatus.CUSTOMER_APPROVED },
      });
      if (!activeEstimate) {
        throw new Error('Cannot create estimate revision without an approved baseline estimate');
      }

      const revisionRepo = Source.getRepository(ServiceEstimateRevision);
      const version = activeEstimate.version + 1;

      let revisionTotal = Number(labourCost) || 0;
      const estItemRepo = Source.getRepository(ServiceEstimateItem);
      const revisionItems: ServiceEstimateItem[] = [];

      const revision = revisionRepo.create({
        estimateId: activeEstimate.id,
        ticketId: String(ticketId),
        version,
        labourCost: Number(labourCost) || 0,
        totalCost: 0,
        status: 'WAITING_ADDITIONAL_APPROVAL',
      });
      await revisionRepo.save(revision);

      const sparePartRepo = Source.getRepository(SparePart);
      // Contract decides what stays free per item category: SMA/FSMA cover
      // parts, AMC does not, and toner is only covered under FSMA. Warranty
      // mirrors SMA (toner chargeable).
      const revisionCoverage =
        (await this.getTicketContractCoverage(ticket.contractReferenceId)) ??
        (ticket.serviceContext === ServiceContext.WARRANTY ||
        ticket.serviceContext === ServiceContext.LEASE_UNDER_WARRANTY
          ? { ...WARRANTY_COVERAGE }
          : null);
      if (items && Array.isArray(items)) {
        for (const it of items) {
          let partName = it.partName || '';
          let sku = it.sku || '';
          let basePrice = Number(it.unitPrice) || 0;
          let partCategory: string | null = null;

          if (it.sparePartId) {
            const part = await sparePartRepo.findOne({ where: { id: String(it.sparePartId) } });
            if (part) {
              partName = part.part_name;
              sku = part.sku;
              partCategory = part.part_category || null;
              if (basePrice === 0) {
                basePrice = Number(part.base_price) || 0;
              }
            }
          }

          const isItemFree = revisionCoverage
            ? coverageAllowsItem(revisionCoverage, { partCategory, partName })
            : ticket.track === 'A'
              ? true
              : !!it.isFree;
          const finalPrice = isItemFree ? 0 : basePrice;
          const itemTotal = finalPrice * (it.quantity || 1);
          revisionTotal += itemTotal;

          const revItem = estItemRepo.create({
            revisionId: revision.id,
            itemSource: it.sparePartId
              ? ServiceEstimateItemSource.SPARE_PART
              : ServiceEstimateItemSource.CUSTOM,
            sparePartId: it.sparePartId || null,
            sku,
            partName,
            quantity: it.quantity || 1,
            unitPrice: finalPrice,
            totalPrice: itemTotal,
            isFree: isItemFree,
            isApproved: false,
          });
          revisionItems.push(revItem);
        }
      }

      revision.totalCost = revisionTotal;
      revision.items = revisionItems;
      await revisionRepo.save(revision);

      // Transition ticket status to WAITING_FINANCE_APPROVAL_2
      ticket.status = ServiceTicketStatus.WAITING_FINANCE_APPROVAL_2;
      await ticketRepo.save(ticket);

      await this.logActivity(
        String(ticketId),
        'ESTIMATE_REVISION_CREATED',
        `Estimate revision Version ${version} created for additional work. Waiting approvals.`,
        req.user?.userId,
      );

      try {
        const financeEmployees = await getFinanceEmployeesByBranch(ticket.branchId);
        for (const financeEmployeeId of financeEmployees) {
          await NotificationPublisher.publishInAppRequest({
            recipientId: financeEmployeeId,
            title: 'Estimate Revision Approval Required',
            message: `Service Estimate Revision v${version} for ticket ${ticket.ticketNumber} is waiting finance approval.`,
            type: 'TASK',
            referenceId: revision.id,
            referenceType: 'SERVICE',
          });
        }
      } catch (e) {
        logger.warn('Failed to notify finance of revision:', e);
      }

      res.status(201).json({ success: true, data: revision });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /service/estimates/revisions/:revisionId/approve-finance
   */
  approveRevisionFinance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const revisionId = req.params.revisionId as string;
      const revisionRepo = Source.getRepository(ServiceEstimateRevision);
      const revision = await revisionRepo.findOne({ where: { id: String(revisionId) } });
      if (!revision) throw new Error('Revision not found');

      revision.status = 'FINANCE_APPROVED';
      await revisionRepo.save(revision);

      const ticketRepo = Source.getRepository(ServiceTicket);
      const ticket = await ticketRepo.findOne({ where: { id: revision.ticketId } });
      if (ticket) {
        ticket.status = ServiceTicketStatus.FINANCE_APPROVED_2;
        await ticketRepo.save(ticket);
      }

      await this.logActivity(
        revision.ticketId,
        'REVISION_FINANCE_APPROVED',
        `Revision Version ${revision.version} approved by Finance.`,
        req.user?.userId,
      );

      res.status(200).json({ success: true, data: revision });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /service/estimates/revisions/:revisionId/approve-customer
   */
  approveRevisionCustomer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const revisionId = req.params.revisionId as string;
      const revisionRepo = Source.getRepository(ServiceEstimateRevision);
      const revision = await revisionRepo.findOne({
        where: { id: String(revisionId) },
        relations: ['items'],
      });
      if (!revision) throw new Error('Revision not found');

      revision.status = 'APPROVED';
      await revisionRepo.save(revision);

      const ticketRepo = Source.getRepository(ServiceTicket);
      const ticket = await ticketRepo.findOne({ where: { id: revision.ticketId } });
      if (ticket) {
        ticket.status = ServiceTicketStatus.IN_PROGRESS;
        await ticketRepo.save(ticket);
      }

      const estimateRepo = Source.getRepository(ServiceEstimate);
      const activeEstimate = await estimateRepo.findOne({
        where: { id: String(revision.estimateId) },
      });
      if (activeEstimate) {
        activeEstimate.version = revision.version;
        activeEstimate.labourCost = Number(activeEstimate.labourCost) + Number(revision.labourCost);
        activeEstimate.totalCost = Number(activeEstimate.totalCost) + Number(revision.totalCost);
        await estimateRepo.save(activeEstimate);

        const estItemRepo = Source.getRepository(ServiceEstimateItem);
        for (const item of revision.items) {
          item.estimateId = activeEstimate.id;
          item.isApproved = true;
          await estItemRepo.save(item);

          if (item.itemSource === ServiceEstimateItemSource.SPARE_PART && item.sparePartId) {
            await this.reserveSparePart(revision.ticketId, item.sparePartId, item.quantity);
          }
        }
      }

      await this.logActivity(
        revision.ticketId,
        'REVISION_CUSTOMER_APPROVED',
        `Revision Version ${revision.version} approved by Customer. New parts reserved.`,
        req.user?.userId,
      );

      res.status(200).json({ success: true, data: revision });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /service/tickets/:id/start-repair
   */
  startRepair = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const ticketRepo = Source.getRepository(ServiceTicket);
      const ticket = await ticketRepo.findOne({ where: { id: String(id) } });
      if (!ticket) throw new Error('Ticket not found');

      ticket.status = ServiceTicketStatus.IN_PROGRESS;
      ticket.repairStartedAt = new Date();
      await ticketRepo.save(ticket);

      await this.logActivity(
        ticket.id,
        'REPAIR_STARTED',
        `Technician started repair work.`,
        req.user?.userId,
      );

      res.status(200).json({ success: true, data: ticket });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /service/tickets/:id/start
   */
  startService = async (req: Request, res: Response, next: NextFunction) => {
    return this.startRepair(req, res, next);
  };

  /**
   * POST /service/tickets/:id/pause-repair
   */
  pauseRepair = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const ticketRepo = Source.getRepository(ServiceTicket);
      const ticket = await ticketRepo.findOne({ where: { id: String(id) } });
      if (!ticket) throw new Error('Ticket not found');

      const isManager = req.user?.role === 'MANAGER' || req.user?.role === 'ADMIN';
      if (!isManager && ticket.assignedTechnicianId !== req.user?.userId) {
        throw new AppError(
          'Only the assigned technician or the branch manager can pause this repair',
          403,
        );
      }

      if (ticket.status !== ServiceTicketStatus.IN_PROGRESS || !ticket.repairStartedAt) {
        throw new AppError('Repair is not currently running', 400);
      }
      if (ticket.repairPausedAt) {
        throw new AppError('Repair is already paused', 400);
      }

      ticket.repairPausedAt = new Date();
      await ticketRepo.save(ticket);

      await this.logActivity(
        ticket.id,
        'REPAIR_PAUSED',
        `Technician paused repair work.`,
        req.user?.userId,
      );

      res.status(200).json({ success: true, data: ticket });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /service/tickets/:id/resume-repair
   */
  resumeRepair = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const ticketRepo = Source.getRepository(ServiceTicket);
      const ticket = await ticketRepo.findOne({ where: { id: String(id) } });
      if (!ticket) throw new Error('Ticket not found');

      const isManager = req.user?.role === 'MANAGER' || req.user?.role === 'ADMIN';
      if (!isManager && ticket.assignedTechnicianId !== req.user?.userId) {
        throw new AppError(
          'Only the assigned technician or the branch manager can resume this repair',
          403,
        );
      }

      if (!ticket.repairPausedAt) {
        throw new AppError('Repair is not paused', 400);
      }

      const pausedMinutes = Math.round((Date.now() - ticket.repairPausedAt.getTime()) / 60000);
      ticket.repairPausedDurationMinutes =
        (ticket.repairPausedDurationMinutes || 0) + pausedMinutes;
      ticket.repairPausedAt = null;
      await ticketRepo.save(ticket);

      await this.logActivity(
        ticket.id,
        'REPAIR_RESUMED',
        `Technician resumed repair work.`,
        req.user?.userId,
      );

      res.status(200).json({ success: true, data: ticket });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /service/tickets/:id/complete
   */
  completeService = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        workPerformed,
        resolutionDetails,
        meterReading,
        customerRemarks,
        technicianRemarks,
        customerSignature,
        technicianSignature,
      } = req.body;

      const id = req.params.id as string;
      const ticketRepo = Source.getRepository(ServiceTicket);
      const ticket = await ticketRepo.findOne({
        where: { id: String(id) },
        relations: ['items'],
      });
      if (!ticket) throw new Error('Ticket not found');

      const allowedCompleteStatuses: ServiceTicketStatus[] = [
        ServiceTicketStatus.IN_PROGRESS,
        ServiceTicketStatus.FREE_SERVICE,
        ServiceTicketStatus.CUSTOMER_APPROVED,
      ];
      if (!allowedCompleteStatuses.includes(ticket.status)) {
        throw new AppError(`Cannot complete ticket with current status: ${ticket.status}`, 400);
      }
      if (ticket.repairPausedAt) {
        throw new AppError('Resume the repair before completing the job.', 400);
      }

      if (meterReading !== undefined && meterReading !== null) {
        const previousReading = ticket.meterReadingAtService ?? 0;
        if (meterReading < previousReading) {
          throw new AppError(
            `Completion meter reading ${meterReading} cannot be less than diagnosis reading ${previousReading}`,
            400,
          );
        }
        ticket.meterReadingAtService = Number(meterReading);
        if (ticket.productId) {
          const completionProduct = await Source.getRepository(Product).findOne({
            where: { id: ticket.productId },
          });
          if (completionProduct) {
            completionProduct.meter_reading = Number(meterReading);
            await Source.getRepository(Product).save(completionProduct);
          }
        }
      }

      ticket.repairCompletedAt = new Date();
      if (ticket.repairStartedAt) {
        const rawMinutes = Math.round(
          (ticket.repairCompletedAt.getTime() - ticket.repairStartedAt.getTime()) / 60000,
        );
        ticket.repairDuration = Math.max(0, rawMinutes - (ticket.repairPausedDurationMinutes || 0));
      }
      ticket.status = ServiceTicketStatus.COMPLETED;
      ticket.completedAt = new Date();
      ticket.completionNotes = resolutionDetails;
      if (!ticket.completionBillNumber) {
        ticket.completionBillNumber = await this.generateBillNumber();
      }
      await ticketRepo.save(ticket);

      // Save Service Report
      const reportRepo = Source.getRepository(ServiceReport);
      const report = reportRepo.create({
        ticketId: ticket.id,
        workPerformed,
        resolutionDetails,
        meterReading: meterReading || 0,
        startTime: ticket.repairStartedAt || new Date(),
        endTime: ticket.repairCompletedAt || new Date(),
        totalTimeSpent: ticket.repairDuration || 0,
        customerRemarks,
        technicianRemarks,
        customerSignature,
        technicianSignature,
      });
      await reportRepo.save(report);

      // Consume Reserved Parts
      await this.consumeReservations(ticket.id);

      const sparePartRepo = Source.getRepository(SparePart);
      const estimateRepo = Source.getRepository(ServiceEstimate);

      const estimate = await estimateRepo.findOne({
        where: { ticketId: ticket.id, status: ServiceEstimateStatus.CUSTOMER_APPROVED },
        relations: ['items'],
      });

      // What the customer was actually billed for parts/consumables (used for the
      // customer/UI-facing Machine History stat) — distinct from purchaseCost below,
      // which is the internal cost basis used only for ServicePartUsageLog/margin tracking.
      let totalPartsBilled = 0;

      const itemsToInspect = estimate ? estimate.items : ticket.items;
      const usageLogRepo = Source.getRepository(ServicePartUsageLog);

      for (const item of itemsToInspect) {
        totalPartsBilled +=
          Number(item.totalPrice) || (Number(item.unitPrice) || 0) * (item.quantity || 1);

        let purchaseCost = 0;
        if (item.sparePartId) {
          const partDetails = await sparePartRepo.findOne({
            where: { id: String(item.sparePartId) },
          });
          if (partDetails) {
            purchaseCost = Number(partDetails.purchase_price) || 0;
            const itemCost = purchaseCost * item.quantity;

            // Yield page calculation for consumables if replaced
            let yieldPages = 0;
            if (this.isConsumable(partDetails.part_name, partDetails.sku)) {
              const yieldRepo = Source.getRepository(ConsumableYieldHistory);
              const activeYield = await yieldRepo.findOne({
                where: {
                  serialNumber: ticket.serialNumber,
                  tonerSku: item.sku || '',
                  replacedMeterReading: IsNull(),
                },
                order: { installedDate: 'DESC' },
              });

              if (activeYield) {
                activeYield.replacedDate = new Date();
                activeYield.replacedMeterReading = meterReading || 0;
                activeYield.yieldPages = Math.max(
                  0,
                  (meterReading || 0) - activeYield.installedMeterReading,
                );
                await yieldRepo.save(activeYield);
                yieldPages = activeYield.yieldPages;
              }

              const newYield = yieldRepo.create({
                productId: ticket.productId || undefined,
                serialNumber: ticket.serialNumber,
                tonerSku: item.sku || '',
                installedDate: new Date(),
                installedMeterReading: meterReading || 0,
                ticketId: ticket.id,
              });
              await yieldRepo.save(newYield);
            }

            // Save Part Usage Log
            const usageLog = usageLogRepo.create({
              ticketId: ticket.id,
              productId: ticket.productId || '',
              sparePartId: item.sparePartId,
              sku: item.sku || '',
              partName: item.partName || '',
              quantityUsed: item.quantity,
              unitCost: purchaseCost,
              totalCost: itemCost,
              replacedAt: new Date(),
              calculatedYield: yieldPages || null,
              isFree: item.isFree,
              isConsumable: this.isConsumable(partDetails.part_name, partDetails.sku),
              meterReadingAtReplacement: meterReading || null,
              linkedInvoiceId: ticket.linkedInvoiceId || null,
            });
            await usageLogRepo.save(usageLog);
          }
        }
      }

      const labourCost = estimate ? Number(estimate.labourCost) : 0;

      // Update Lifetime Machine History (Accumulated single record)
      const historyRepo = Source.getRepository(MachineServiceHistory);
      let historyRecord = await historyRepo.findOne({
        where: { productId: ticket.productId || undefined },
      });

      let nextScheduledMaintenanceDate: Date | null = null;
      if (ticket.serviceContext === ServiceContext.RENT) {
        nextScheduledMaintenanceDate = new Date();
        nextScheduledMaintenanceDate.setMonth(nextScheduledMaintenanceDate.getMonth() + 2);
      }

      if (historyRecord) {
        historyRecord.totalServiceVisits += 1;
        if (ticket.ticketType === 'PREVENTATIVE_MAINTENANCE') {
          historyRecord.totalPreventativeVisits += 1;
        }
        historyRecord.lastServiceDate = new Date();
        historyRecord.nextScheduledMaintenanceDate = nextScheduledMaintenanceDate;
        historyRecord.totalPartsSpend = Number(historyRecord.totalPartsSpend) + totalPartsBilled;
        historyRecord.totalLabourSpend = Number(historyRecord.totalLabourSpend) + labourCost;
        historyRecord.totalLifetimeCost =
          Number(historyRecord.totalPartsSpend) + Number(historyRecord.totalLabourSpend);
      } else {
        historyRecord = historyRepo.create({
          productId: ticket.productId || '',
          serialNumber: ticket.serialNumber,
          totalServiceVisits: 1,
          totalPreventativeVisits: ticket.ticketType === 'PREVENTATIVE_MAINTENANCE' ? 1 : 0,
          lastServiceDate: new Date(),
          nextScheduledMaintenanceDate,
          totalPartsSpend: totalPartsBilled,
          totalLabourSpend: labourCost,
          totalLifetimeCost: totalPartsBilled + labourCost,
        });
      }
      await historyRepo.save(historyRecord);

      // Save report URL to ticket
      ticket.reportUrl = `/i/service/tickets/${ticket.id}/report`;
      await ticketRepo.save(ticket);

      await this.logActivity(
        ticket.id,
        'COMPLETED',
        `Ticket successfully resolved and completed. Service report generated.`,
        req.user?.userId,
      );

      const managerIds = await this.getBranchManagerAndAdmins(ticket.branchId);
      for (const mId of managerIds) {
        await NotificationPublisher.publishInAppRequest({
          recipientId: mId,
          title: 'Service Ticket Completed',
          message: `Ticket ${ticket.ticketNumber} has been completed by technician.`,
          type: 'INFO',
          referenceId: ticket.id,
          referenceType: 'SERVICE',
        });
      }

      res.status(200).json({ success: true, data: ticket });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /service/tickets/:id/cancel
   */
  cancelTicket = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const ticketRepo = Source.getRepository(ServiceTicket);
      const ticket = await ticketRepo.findOne({ where: { id: String(id) } });
      if (!ticket) throw new Error('Ticket not found');

      ticket.status = ServiceTicketStatus.CANCELLED;
      await ticketRepo.save(ticket);

      await this.releaseReservations(ticket.id);

      await this.logActivity(
        ticket.id,
        'CANCELLED',
        `Ticket cancelled. Reserved parts returned to stock.`,
        req.user?.userId,
      );

      if (ticket.assignedTechnicianId) {
        await NotificationPublisher.publishInAppRequest({
          recipientId: ticket.assignedTechnicianId,
          title: 'Job Cancelled',
          message: `The assigned job ${ticket.ticketNumber} has been cancelled by management.`,
          type: 'WARNING',
          referenceId: ticket.id,
          referenceType: 'SERVICE',
        });
      }

      res.status(200).json({ success: true, data: ticket });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /service/tickets
   */
  getTickets = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new Error('User not identified');

      const { branchId: branchIdFilter } = req.query;

      const ticketRepo = Source.getRepository(ServiceTicket);
      let query = ticketRepo
        .createQueryBuilder('ticket')
        .leftJoinAndSelect('ticket.items', 'items');

      if (req.user.role !== 'ADMIN' && req.user.branchId) {
        query = query.where('ticket.branchId = :branchId', { branchId: req.user.branchId });
      } else if (req.user.role === 'ADMIN' && branchIdFilter && branchIdFilter !== 'ALL') {
        query = query.where('ticket.branchId = :branchId', { branchId: branchIdFilter });
      }

      if (req.user.role === 'EMPLOYEE' && req.user.employeeJob === 'SERVICE_TECHNICIAN') {
        query = query.andWhere('ticket.assignedTechnicianId = :techId', {
          techId: req.user.userId,
        });
      }

      const tickets = await query.orderBy('ticket.created_at', 'DESC').getMany();

      if (req.user.role === 'ADMIN' && tickets.length > 0) {
        const branchIds = [...new Set(tickets.map((t) => t.branchId).filter(Boolean))];
        const branchRepo = Source.getRepository(Branch);
        const branches = await branchRepo.find({ where: { id: In(branchIds) } });
        const branchMap = new Map(branches.map((b) => [b.id, b.name]));
        const enriched = tickets.map((t) => ({
          ...t,
          branchName: branchMap.get(t.branchId) ?? '',
        }));
        return res.status(200).json({ success: true, data: enriched });
      }

      res.status(200).json({ success: true, data: tickets });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /service/tickets/:id
   */
  getTicketById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const ticketRepo = Source.getRepository(ServiceTicket);
      const ticket = await ticketRepo.findOne({
        where: { id: String(id) },
        relations: ['items'],
      });
      if (!ticket) throw new Error('Ticket not found');

      if (
        req.user &&
        req.user.role === 'EMPLOYEE' &&
        req.user.employeeJob === 'SERVICE_TECHNICIAN'
      ) {
        if (ticket.assignedTechnicianId !== req.user.userId) {
          return res.status(403).json({
            success: false,
            message: 'You are not assigned to this ticket',
          });
        }
      }

      res.status(200).json({ success: true, data: ticket });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /service/tickets/:id/estimates
   */
  getTicketEstimates = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const estimateRepo = Source.getRepository(ServiceEstimate);
      const revisionRepo = Source.getRepository(ServiceEstimateRevision);

      const estimates = await estimateRepo.find({
        where: { ticketId: String(id) },
        relations: ['items'],
      });
      const revisions = await revisionRepo.find({
        where: { ticketId: String(id) },
        relations: ['items'],
      });

      res.status(200).json({ success: true, data: { estimates, revisions } });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /service/technicians
   */
  getTechnicians = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const empRes = await axios.get(`${EMPLOYEE_SERVICE_URL}/employee?job=SERVICE_TECHNICIAN`, {
        headers: { Authorization: req.headers.authorization },
      });

      const responseData = empRes.data.data;
      const techniciansList = Array.isArray(responseData)
        ? responseData
        : responseData?.employees || [];

      res.status(200).json({ success: true, data: techniciansList });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /service/accounts/cash-bank?branchId=...
   *
   * Proxies billing_service's cash-bank account list for technician/helpdesk
   * roles that aren't in ACCOUNTS_ALLOWED_ROLES (ADMIN/FINANCE/MANAGER) there —
   * used to populate the "which account did this land in" picker when a visit
   * charge is collected on-site or at estimate rejection.
   */
  listCashBankAccounts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const branchId = req.query.branchId as string;
      if (!branchId) throw new AppError('branchId is required', 400);
      const token = sign({ userId: 'ven_inv_service', role: 'ADMIN' }, ACCESS_SECRET as string, {
        expiresIn: '1m',
      });
      const response = await axios.get(`${BILLING_SERVICE_URL}/accounts/cash-bank`, {
        params: { branchId },
        headers: { Authorization: `Bearer ${token}` },
      });
      res.status(200).json({ success: true, data: response.data?.data || [] });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /service/customers/:customerId/history
   */
  /**
   * Attaches `warrantyInfo` to every product allocation in a customer's
   * billing history (grouped by bill type as returned by the billing service).
   *
   * - RENT: always fully covered (our machine).
   * - SALE/LEASE: evaluated from the invoice's warranty fields, copies used
   *   taken from allocation counters (A3 = 2 pages) or the product's meter.
   */
  private async enrichBillingHistoryWithWarranty(
    billingHistory: Record<
      string,
      Array<{
        effectiveFrom?: string;
        createdAt?: string;
        warrantyType?: string;
        warrantyDurationValue?: number;
        warrantyDurationUnit?: string;
        warrantyCopyLimit?: number;
        leaseTenureMonths?: number;
        maxCopyLimit?: number;
        productAllocations?: Array<{
          productId?: string;
          currentBwA4?: number;
          currentBwA3?: number;
          currentColorA4?: number;
          currentColorA3?: number;
          warrantyInfo?: unknown;
        }>;
      }>
    >,
  ): Promise<void> {
    const productIds = new Set<string>();
    for (const invoices of Object.values(billingHistory)) {
      if (!Array.isArray(invoices)) continue;
      for (const inv of invoices) {
        for (const alloc of inv.productAllocations || []) {
          if (alloc.productId) productIds.add(alloc.productId);
        }
      }
    }

    const products = productIds.size
      ? await Source.getRepository(Product).find({ where: { id: In([...productIds]) } })
      : [];
    const productById = new Map(products.map((p) => [p.id, p]));

    for (const [billType, invoices] of Object.entries(billingHistory)) {
      if (!Array.isArray(invoices)) continue;
      for (const inv of invoices) {
        for (const alloc of inv.productAllocations || []) {
          const product = alloc.productId ? productById.get(alloc.productId) : undefined;

          if (billType === 'RENT') {
            alloc.warrantyInfo = { isUnderWarranty: true, fullCoverage: true };
            continue;
          }
          if (billType !== 'SALE' && billType !== 'LEASE') continue;

          const startRaw = inv.effectiveFrom || inv.createdAt;
          if (!startRaw) continue;

          const copiesUsed = copiesUsedFromCounters(alloc, product?.meter_reading);
          const isLease = billType === 'LEASE';

          alloc.warrantyInfo = evaluateWarranty({
            warrantyType: inv.warrantyType || (isLease ? 'both' : 'duration'),
            warrantyDurationValue: inv.warrantyDurationValue,
            warrantyDurationUnit: inv.warrantyDurationUnit,
            warrantyCopyLimit: inv.warrantyCopyLimit,
            startDate: new Date(startRaw),
            copiesUsed,
            fallbackMonths: isLease
              ? Number(inv.leaseTenureMonths) || 0
              : parseInt(product?.warranty || '12', 10) || 12,
            fallbackCopyLimit:
              (isLease ? Number(inv.maxCopyLimit) : 0) || product?.warranty_max_pages || 200000,
          });
        }
      }
    }
  }

  getCustomerHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customerId = req.params.customerId as string;
      const ticketRepo = Source.getRepository(ServiceTicket);

      const tickets = await ticketRepo.find({
        where: { customerId: String(customerId) },
        relations: ['items'],
        order: { created_at: 'DESC' },
      });

      let billingHistory = null;
      try {
        const billingRes = await axios.get(
          `${BILLING_SERVICE_URL}${BILLING_ENDPOINTS.CUSTOMER_HISTORY.replace(':customerId', customerId)}`,
          { headers: { Authorization: req.headers.authorization } },
        );
        if (billingRes.data && billingRes.data.success) {
          billingHistory = billingRes.data.data;
        }
      } catch (err) {
        logger.error('Failed to fetch billing history for customer history:', err);
      }

      // Attach warranty status to each SALE/LEASE/RENT allocation so the UI
      // never has to re-derive it (single source of truth: warrantyHelper).
      if (billingHistory) {
        try {
          await this.enrichBillingHistoryWithWarranty(billingHistory);
        } catch (err) {
          logger.error('Failed to enrich billing history with warranty info:', err);
        }
      }

      const assignedProducts = await Source.getRepository(Product).find({
        where: { customer_id: customerId },
      });

      res.status(200).json({ success: true, data: { tickets, billingHistory, assignedProducts } });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /service/machines/:serialNumber/context
   */
  getMachineContext = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { serialNumber } = req.params;
      const meterReadingParam = req.query.meterReading as string | undefined;
      const meterReading =
        meterReadingParam !== undefined &&
        meterReadingParam !== '' &&
        !isNaN(Number(meterReadingParam))
          ? Number(meterReadingParam)
          : undefined;
      const details = await this.determineServiceContextAndJobType(
        String(serialNumber),
        meterReading,
      );

      let activeContract = null;
      let coverage: ContractCoverage = { ...NO_COVERAGE };

      if (details.contractReferenceId) {
        activeContract = await Source.getRepository(ServiceContract).findOne({
          where: { id: details.contractReferenceId as string },
        });
        if (activeContract) {
          // Coverage rules are fixed per contract type; normalize legacy rows
          coverage = normalizeCoverage(
            activeContract.coverageRules || coverageForContractType(activeContract.contractType),
          );
        }
      } else if (details.serviceContext === ServiceContext.RENT) {
        coverage = { ...FULL_COVERAGE };
      } else if (
        details.serviceContext === ServiceContext.WARRANTY ||
        details.serviceContext === ServiceContext.LEASE_UNDER_WARRANTY
      ) {
        // Warranty mirrors SMA: toner chargeable
        coverage = { ...WARRANTY_COVERAGE };
      }

      res.status(200).json({
        success: true,
        data: {
          serviceContext: details.serviceContext,
          contractReferenceId: details.contractReferenceId,
          productId: details.productId,
          coverage,
          contract: activeContract,
          warrantyInfo: details.warrantyInfo,
          contractUsage: details.contractUsage,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /service/machines/:serialNumber/lifetime-cost
   */
  getMachineLifetimeCost = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const serialNumber = req.params.serialNumber as string;
      const historyRepo = Source.getRepository(MachineServiceHistory);
      const history = await historyRepo.findOne({ where: { serialNumber: String(serialNumber) } });

      if (!history) {
        return res.status(200).json({
          success: true,
          data: {
            totalTicketsCount: 0,
            totalPartsCost: 0,
            totalConsumablesCost: 0,
            totalLabourCost: 0,
            lifetimeCost: 0,
            history: [],
          },
        });
      }

      res.status(200).json({
        success: true,
        data: {
          totalTicketsCount: history.totalServiceVisits,
          totalPartsCost: Number(history.totalPartsSpend) || 0,
          totalConsumablesCost: 0,
          totalLabourCost: Number(history.totalLabourSpend) || 0,
          lifetimeCost: Number(history.totalLifetimeCost) || 0,
          history: [history],
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /service/machines/:serialNumber/yield-history
   */
  getMachineYieldHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const serialNumber = req.params.serialNumber as string;
      const yieldRepo = Source.getRepository(ConsumableYieldHistory);
      const yields = await yieldRepo.find({
        where: { serialNumber: String(serialNumber) },
        order: { installedDate: 'DESC' },
      });

      res.status(200).json({ success: true, data: yields });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /service/finance/dashboard
   */
  getFinanceDashboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { branchId, startDate, endDate } = req.query;
      const ticketRepo = Source.getRepository(ServiceTicket);

      let query = ticketRepo
        .createQueryBuilder('ticket')
        .where('ticket.status = :status', { status: ServiceTicketStatus.COMPLETED });

      if (branchId) {
        query = query.andWhere('ticket.branchId = :branchId', { branchId });
      }

      if (startDate) {
        query = query.andWhere('ticket.completedAt >= :startDate', {
          startDate: new Date(startDate as string),
        });
      }

      if (endDate) {
        query = query.andWhere('ticket.completedAt <= :endDate', {
          endDate: new Date(endDate as string),
        });
      }

      const tickets = await query.getMany();

      let totalRevenue = 0;
      let totalPartsCost = 0;
      let totalLaborCost = 0;

      const partUsageRepo = Source.getRepository(ServicePartUsageLog);
      const estimateRepo = Source.getRepository(ServiceEstimate);
      const ticketItemRepo = Source.getRepository(ServiceTicketItem);

      for (const ticket of tickets) {
        const usageLogs = await partUsageRepo.find({ where: { ticketId: ticket.id } });
        for (const log of usageLogs) {
          totalPartsCost += Number(log.totalCost) || 0;
        }

        const estimate = await estimateRepo.findOne({
          where: { ticketId: ticket.id, status: ServiceEstimateStatus.CUSTOMER_APPROVED },
        });
        const labour = estimate ? Number(estimate.labourCost) || 0 : 0;
        totalLaborCost += labour;

        const items = await ticketItemRepo.find({ where: { ticketId: ticket.id } });
        let ticketRevenue = labour;
        for (const item of items) {
          if (!item.isFree) {
            ticketRevenue += Number(item.totalPrice) || 0;
          }
        }
        if (ticket.visitChargeMethod === 'ADDED_TO_ESTIMATE') {
          ticketRevenue += Number(ticket.visitChargeAmount) || 0;
        }
        ticketRevenue += Number(ticket.transportChargeAmount) || 0;
        ticketRevenue -= Number(ticket.discountAmount) || 0;
        totalRevenue += Math.max(0, ticketRevenue);
      }

      const netServiceMargin = totalRevenue - (totalPartsCost + totalLaborCost);

      res.status(200).json({
        success: true,
        data: {
          totalRevenue,
          totalPartsCost,
          totalLaborCost,
          netServiceMargin,
          ticketsCount: tickets.length,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /service/tickets/achievement-summary
   * Internal endpoint for billing_service's employee-targets module: sums the
   * accepted deal value (CUSTOMER_APPROVED estimate totalCost) of completed
   * tickets assigned to a technician within a date range.
   */
  getAchievementSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { employeeId, monthStart, monthEnd } = req.query;
      if (!employeeId || !monthStart || !monthEnd) {
        throw new AppError('employeeId, monthStart and monthEnd are required', 400);
      }

      const ticketRepo = Source.getRepository(ServiceTicket);
      const estimateRepo = Source.getRepository(ServiceEstimate);

      const tickets = await ticketRepo
        .createQueryBuilder('ticket')
        .where('ticket.assignedTechnicianId = :employeeId', { employeeId })
        .andWhere('ticket.status = :status', { status: ServiceTicketStatus.COMPLETED })
        .andWhere('ticket.completedAt >= :monthStart AND ticket.completedAt < :monthEnd', {
          monthStart: new Date(monthStart as string),
          monthEnd: new Date(monthEnd as string),
        })
        .getMany();

      let totalAmount = 0;
      for (const ticket of tickets) {
        const estimate = await estimateRepo.findOne({
          where: { ticketId: ticket.id, status: ServiceEstimateStatus.CUSTOMER_APPROVED },
        });
        totalAmount += estimate ? Number(estimate.totalCost) || 0 : 0;
      }

      res.status(200).json({
        success: true,
        data: { totalAmount, dealCount: tickets.length },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /service/technicians/:technicianId/performance
   */
  getTechnicianPerformance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const technicianId = req.params.technicianId as string;
      const ticketRepo = Source.getRepository(ServiceTicket);

      const resolvedTickets = await ticketRepo.find({
        where: {
          assignedTechnicianId: String(technicianId),
          status: ServiceTicketStatus.COMPLETED,
        },
      });

      if (resolvedTickets.length === 0) {
        return res.status(200).json({
          success: true,
          data: {
            totalTicketsResolved: 0,
            mttd: 0,
            mttr: 0,
            firstTimeFixRate: 100,
          },
        });
      }

      let totalMttd = 0;
      let mttdCount = 0;
      let totalMttr = 0;
      let mttrCount = 0;

      let firstTimeFixes = 0;

      for (const ticket of resolvedTickets) {
        if (ticket.diagnosisDuration !== null && ticket.diagnosisDuration !== undefined) {
          totalMttd += ticket.diagnosisDuration;
          mttdCount++;
        }
        if (ticket.repairDuration !== null && ticket.repairDuration !== undefined) {
          totalMttr += ticket.repairDuration;
          mttrCount++;
        }

        const completedDate = ticket.completedAt || new Date();
        const fourteenDaysLater = new Date(completedDate.getTime() + 14 * 24 * 60 * 60 * 1000);

        const followUpTicket = await ticketRepo
          .createQueryBuilder('t')
          .where('t.serialNumber = :serialNumber', { serialNumber: ticket.serialNumber })
          .andWhere('t.id != :id', { id: ticket.id })
          .andWhere('t.created_at > :completedDate', { completedDate })
          .andWhere('t.created_at <= :fourteenDaysLater', { fourteenDaysLater })
          .getOne();

        if (!followUpTicket) {
          firstTimeFixes++;
        }
      }

      const mttd = mttdCount > 0 ? Math.round(totalMttd / mttdCount) : 0;
      const mttr = mttrCount > 0 ? Math.round(totalMttr / mttrCount) : 0;
      const firstTimeFixRate = Math.round((firstTimeFixes / resolvedTickets.length) * 100);

      res.status(200).json({
        success: true,
        data: {
          totalTicketsResolved: resolvedTickets.length,
          mttd,
          mttr,
          firstTimeFixRate,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /service/spare-parts/:id/mark-damaged
   */
  markSparePartDamaged = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const { quantity } = req.body;
      const qty = Number(quantity) || 1;

      const sparePartRepo = Source.getRepository(SparePart);
      const part = await sparePartRepo.findOne({ where: { id: String(id) } });
      if (!part) throw new Error('Spare part not found');

      if (part.quantity < qty) {
        throw new Error(
          `Insufficient available inventory to mark as damaged. Available: ${part.quantity}`,
        );
      }

      part.quantity -= qty;
      part.damaged_quantity += qty;
      await sparePartRepo.save(part);
      await deleteCached(`sparepart:${part.id}`);

      res.status(200).json({ success: true, data: part });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /service/tickets/:id/quote
   * Retained for legacy quotation logic.
   */
  submitQuotation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        laborCost,
        visitChargeAmount,
        visitChargeMethod,
        discountAmount,
        technicianNoteToFinance,
      } = req.body;
      const id = req.params.id as string;
      const ticketRepo = Source.getRepository(ServiceTicket);
      const ticket = await ticketRepo.findOne({
        where: { id: String(id) },
        relations: ['items'],
      });
      if (!ticket) throw new Error('Ticket not found');

      // Validate discount <= total maxDiscountableAmount across parts
      let totalMaxDiscount = 0;
      const sparePartRepo = Source.getRepository(SparePart);
      for (const item of ticket.items) {
        if (item.sparePartId) {
          const part = await sparePartRepo.findOne({ where: { id: item.sparePartId } });
          if (part) {
            totalMaxDiscount += (Number(part.maxDiscountableAmount) || 0) * (item.quantity || 1);
          }
        }
      }

      if (Number(discountAmount || 0) > totalMaxDiscount) {
        throw new AppError(
          `Discount of QAR ${discountAmount} exceeds the maximum allowed discount of QAR ${totalMaxDiscount} for the selected parts.`,
          400,
        );
      }

      // RENT covers everything; warranty mirrors SMA (toner chargeable);
      // contract contexts cover per item category (SMA/AMC charge toner,
      // AMC charges parts too). Labour is free under all three contract types.
      const baseFreeContext = ticket.serviceContext === ServiceContext.RENT;
      const warrantyContext = [
        ServiceContext.WARRANTY,
        ServiceContext.LEASE_UNDER_WARRANTY,
      ].includes(ticket.serviceContext);
      const quoteCoverage: ContractCoverage = baseFreeContext
        ? { ...FULL_COVERAGE }
        : warrantyContext
          ? { ...WARRANTY_COVERAGE }
          : ((await this.getTicketContractCoverage(ticket.contractReferenceId)) ?? {
              ...NO_COVERAGE,
            });
      const partCategories = await this.getPartCategories(ticket.items.map((it) => it.sparePartId));

      const hasContractContext = baseFreeContext || warrantyContext || !!ticket.contractReferenceId;

      const items = ticket.items.map((it) => {
        const itemCovered = hasContractContext
          ? coverageAllowsItem(quoteCoverage, {
              partCategory: it.sparePartId ? partCategories.get(it.sparePartId) : null,
              partName: it.partName,
            })
          : false;
        const isFree = itemCovered || !!it.isFree;
        return {
          description: it.partName,
          quantity: it.quantity,
          unitPrice: isFree ? 0 : Number(it.unitPrice) || 0,
          isFree,
        };
      });

      const labourFree = hasContractContext && quoteCoverage.labour;
      items.push({
        description: 'Labor Cost / Service Charge',
        quantity: 1,
        unitPrice: labourFree ? 0 : Number(laborCost) || 0,
        isFree: labourFree,
      });

      const effectiveVisitCharge =
        hasContractContext && quoteCoverage.travel ? 0 : Number(visitChargeAmount) || 0;

      const allFree = items.every((it) => it.isFree) && effectiveVisitCharge === 0;

      const billingPayload = {
        customerId: ticket.customerId,
        branchId: ticket.branchId,
        createdBy: ticket.createdBy,
        serviceTicketId: ticket.id,
        items,
        visitChargeAmount: effectiveVisitCharge,
        visitChargeMethod: visitChargeMethod || null,
        discountAmount: Number(discountAmount) || 0,
        technicianNoteToFinance: technicianNoteToFinance || null,
        saleType: 'PRODUCT_SALE',
        status: allFree ? 'CUSTOMER_ACCEPTED' : 'WAITING_FINANCE_APPROVAL',
      };

      const token = sign({ userId: 'ven_inv_service', role: 'ADMIN' }, ACCESS_SECRET as string, {
        expiresIn: '1m',
      });

      const quoteRes = await axios.post(
        `${BILLING_SERVICE_URL}${BILLING_ENDPOINTS.SERVICE_QUOTATION}`,
        billingPayload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const quotation = quoteRes.data.data;

      if (allFree) {
        ticket.status = ServiceTicketStatus.CUSTOMER_APPROVED;
      } else {
        ticket.status = ServiceTicketStatus.WAITING_FINANCE_APPROVAL;
      }

      ticket.serviceQuotationId = quotation.id;
      ticket.visitChargeAmount = effectiveVisitCharge;
      ticket.visitChargeMethod = visitChargeMethod || null;
      await ticketRepo.save(ticket);

      res.status(200).json({
        success: true,
        data: ticket,
        quotationId: quotation.id,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /service/tickets/:id/quotation-link
   */
  patchQuotationLink = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { serviceQuotationId, status } = req.body;
      const id = req.params.id as string;
      const ticketRepo = Source.getRepository(ServiceTicket);
      const ticket = await ticketRepo.findOne({ where: { id: String(id) } });
      if (!ticket) throw new Error('Ticket not found');

      ticket.serviceQuotationId = serviceQuotationId;
      if (status) {
        ticket.status = status;
      } else {
        ticket.status = ServiceTicketStatus.QUOTED;
      }
      await ticketRepo.save(ticket);

      res.status(200).json({
        success: true,
        data: ticket,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /service/tickets/:id/finance-approved
   */
  financeApproved = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const ticketRepo = Source.getRepository(ServiceTicket);
      const ticket = await ticketRepo.findOne({ where: { id: String(id) } });
      if (!ticket) throw new Error('Ticket not found');

      ticket.status = ServiceTicketStatus.QUOTED;
      await ticketRepo.save(ticket);

      const estimateRepo = Source.getRepository(ServiceEstimate);
      const estimate = await estimateRepo.findOne({
        where: { ticketId: String(id), status: ServiceEstimateStatus.WAITING_FINANCE_APPROVAL },
      });
      if (estimate) {
        estimate.status = ServiceEstimateStatus.FINANCE_APPROVED;
        await estimateRepo.save(estimate);
      }

      // Update the latest pending revision for the ticket
      const revisionRepo = Source.getRepository(ServiceEstimateRevision);
      const latestRevision = await revisionRepo.findOne({
        where: { ticketId: String(id), financeDecision: IsNull() },
        order: { submittedAt: 'DESC' },
      });
      if (latestRevision) {
        latestRevision.financeDecision = 'APPROVED';
        latestRevision.financeDecisionBy = req.user?.userId || 'FINANCE';
        latestRevision.financeDecisionAt = new Date();

        let validUntilDate = new Date();
        validUntilDate.setDate(validUntilDate.getDate() + 30);

        try {
          const token = sign(
            { userId: 'ven_inv_service', role: 'ADMIN' },
            ACCESS_SECRET as string,
            {
              expiresIn: '1m',
            },
          );
          const approveRes = await axios.post(
            `${BILLING_SERVICE_URL}/invoices/${ticket.serviceQuotationId}/finance-approve-quotation`,
            {},
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );
          const invoice = approveRes.data.data;
          if (invoice && invoice.estimateValidUntil) {
            validUntilDate = new Date(invoice.estimateValidUntil);
          }
        } catch (err) {
          logger.error('Failed to approve invoice in billing service:', err);
        }

        latestRevision.validUntil = validUntilDate;
        await revisionRepo.save(latestRevision);
      }

      await this.logActivity(
        id,
        'FINANCE_APPROVED',
        `Service ticket estimate approved by Finance. Status set to QUOTED.`,
        req.user?.userId,
      );

      // Notify assigned technician
      if (ticket.assignedTechnicianId) {
        try {
          await NotificationPublisher.publishInAppRequest({
            recipientId: ticket.assignedTechnicianId,
            title: 'Estimate Approved by Finance',
            message: `Service estimate for ticket ${ticket.ticketNumber} has been approved by Finance.`,
            type: 'TASK',
            referenceId: ticket.id,
            referenceType: 'SERVICE_TICKET',
          });
        } catch (err) {
          logger.error('Failed to notify technician about finance approval:', err);
        }
      }

      // Notify all SERVICE_HELP_DESK employees in branch
      try {
        const helpdeskEmployees = await getHelpDeskEmployeesByBranch(ticket.branchId);
        for (const empId of helpdeskEmployees) {
          await NotificationPublisher.publishInAppRequest({
            recipientId: empId,
            title: 'Estimate Approved by Finance',
            message: `Service estimate for ticket ${ticket.ticketNumber} has been approved by Finance. Status is now QUOTED.`,
            type: 'TASK',
            referenceId: ticket.id,
            referenceType: 'SERVICE_TICKET',
          });
        }
      } catch (err) {
        logger.error('Failed to notify help desk about finance approval:', err);
      }

      res.status(200).json({ success: true, data: ticket });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /service/tickets/:id/finance-rejected
   */
  financeRejected = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const { reason } = req.body;
      if (!reason || !reason.trim()) {
        throw new AppError('Rejection reason is required', 400);
      }
      const ticketRepo = Source.getRepository(ServiceTicket);
      const ticket = await ticketRepo.findOne({ where: { id: String(id) } });
      if (!ticket) throw new Error('Ticket not found');

      ticket.status = ServiceTicketStatus.FINANCE_REJECTED;
      await ticketRepo.save(ticket);

      // Update the latest pending revision for the ticket
      const revisionRepo = Source.getRepository(ServiceEstimateRevision);
      const latestRevision = await revisionRepo.findOne({
        where: { ticketId: String(id), financeDecision: IsNull() },
        order: { submittedAt: 'DESC' },
      });
      if (latestRevision) {
        latestRevision.financeDecision = 'REJECTED';
        latestRevision.financeDecisionBy = req.user?.userId || 'FINANCE';
        latestRevision.financeDecisionAt = new Date();
        latestRevision.financeDecisionNote = reason;
        await revisionRepo.save(latestRevision);
      }

      // Call billing service to reject invoice
      try {
        const token = sign({ userId: 'ven_inv_service', role: 'ADMIN' }, ACCESS_SECRET as string, {
          expiresIn: '1m',
        });
        await axios.post(
          `${BILLING_SERVICE_URL}/invoices/${ticket.serviceQuotationId}/finance-reject`,
          { reason },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
      } catch (err) {
        logger.error('Failed to reject invoice in billing service:', err);
      }

      await this.logActivity(
        id,
        'FINANCE_REJECTED',
        `Service ticket estimate rejected by Finance. Reason: ${reason}. Status set to FINANCE_REJECTED.`,
        req.user?.userId,
      );

      // Notify assigned technician with rejection reason
      if (ticket.assignedTechnicianId) {
        try {
          await NotificationPublisher.publishInAppRequest({
            recipientId: ticket.assignedTechnicianId,
            title: 'Estimate Rejected by Finance',
            message: `Service estimate for ticket ${ticket.ticketNumber} was rejected by Finance. Reason: ${reason}. Please revise.`,
            type: 'TASK',
            referenceId: ticket.id,
            referenceType: 'SERVICE_TICKET',
          });
        } catch (err) {
          logger.error('Failed to notify technician about finance rejection:', err);
        }
      }

      res.status(200).json({ success: true, data: ticket });
    } catch (error) {
      next(error);
    }
  };

  extendValidity = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { newDate } = req.body;
      if (!newDate) throw new Error('New validity date is required');

      const ticketRepo = Source.getRepository(ServiceTicket);
      const ticket = await ticketRepo.findOne({ where: { id: String(id) } });
      if (!ticket) throw new Error('Ticket not found');
      if (!ticket.serviceQuotationId) throw new Error('Ticket has no quotation');

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const targetDate = new Date(newDate);
      targetDate.setHours(0, 0, 0, 0);
      const diffTime = targetDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const extensionDays = diffDays - 30;

      // Call billing service to extend validity
      try {
        const token = sign({ userId: 'ven_inv_service', role: 'ADMIN' }, ACCESS_SECRET as string, {
          expiresIn: '1m',
        });
        await axios.post(
          `${BILLING_SERVICE_URL}/invoices/${ticket.serviceQuotationId}/finance-extend-validity`,
          { extensionDays, extensionFee: 0 },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
      } catch (err) {
        logger.error('Failed to extend validity in billing service:', err);
        throw new Error('Failed to extend validity in billing service');
      }

      // Also update latest revision's validUntil
      const revisionRepo = Source.getRepository(ServiceEstimateRevision);
      const latestRevision = await revisionRepo.findOne({
        where: { ticketId: String(id) },
        order: { submittedAt: 'DESC' },
      });
      if (latestRevision) {
        latestRevision.financeDecision = 'APPROVED';
        latestRevision.validUntil = new Date(newDate);
        await revisionRepo.save(latestRevision);
      }

      ticket.status = ServiceTicketStatus.QUOTED;
      await ticketRepo.save(ticket);

      await this.logActivity(
        String(id),
        'VALIDITY_EXTENDED',
        `Service estimate validity extended until ${newDate} by Finance. Status set to QUOTED.`,
        req.user?.userId,
      );

      res.status(200).json({ success: true, message: 'Validity extended successfully' });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /service/tickets/:id/customer-approve
   */
  customerApprove = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const ticketRepo = Source.getRepository(ServiceTicket);
      const ticket = await ticketRepo.findOne({ where: { id: String(id) } });
      if (!ticket) throw new Error('Ticket not found');

      // Validity rules: the up-front visit/estimate charge pays for the labour
      // of making the estimate — a customer approving within the 1-month
      // validity is not charged labour again. Approving after expiry keeps
      // labour billed. Covered machines (contract/warranty) can't expire into
      // charges — finance must extend the validity instead.
      const approvalTravelCovered = [
        ServiceContext.AMC,
        ServiceContext.SMA,
        ServiceContext.FSMA,
        ServiceContext.RENT,
        ServiceContext.WARRANTY,
        ServiceContext.LEASE_UNDER_WARRANTY,
      ].includes(ticket.serviceContext);

      if (ticket.serviceQuotationId) {
        const token = sign({ userId: 'ven_inv_service', role: 'ADMIN' }, ACCESS_SECRET as string, {
          expiresIn: '1m',
        });
        let estimateExpired = false;
        let invoiceFetched = false;
        try {
          const invRes = await axios.get(
            `${BILLING_SERVICE_URL}/invoices/${ticket.serviceQuotationId}`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          const invoice = invRes.data?.data;
          invoiceFetched = !!invoice;
          if (invoice?.estimateValidUntil) {
            estimateExpired = new Date() > new Date(invoice.estimateValidUntil);
          }
        } catch (err) {
          logger.error('Failed to fetch estimate for validity check:', err);
        }

        if (estimateExpired && approvalTravelCovered) {
          throw new AppError(
            'Estimate validity has expired. Send it back to Finance to extend the validity before the customer can approve.',
            400,
          );
        }

        if (invoiceFetched && !estimateExpired && !approvalTravelCovered) {
          // Timely approval — waive the labour line on the billing estimate.
          try {
            await axios.post(
              `${BILLING_SERVICE_URL}/invoices/${ticket.serviceQuotationId}/waive-labour`,
              { reason: `Customer approved ticket ${ticket.ticketNumber} within validity` },
              { headers: { Authorization: `Bearer ${token}` } },
            );
            await this.logActivity(
              ticket.id,
              'LABOUR_WAIVED',
              'Customer approved within estimate validity — labour cost waived (covered by the up-front visit/estimate charge).',
              req.user?.userId,
            );
          } catch (err) {
            logger.error('Failed to waive labour on billing estimate:', err);
          }
        }

        if (estimateExpired && !approvalTravelCovered) {
          await this.logActivity(
            ticket.id,
            'LABOUR_CHARGED',
            'Customer approved after estimate validity expired — labour cost remains chargeable.',
            req.user?.userId,
          );
        }
      }

      ticket.status = ServiceTicketStatus.CUSTOMER_APPROVED;

      // Keep the estimate's own status in sync with the ticket — the estimate-level
      // approval path (approveEstimateCustomer) already does this; this ticket-level
      // path must too, or every downstream read that filters on
      // estimate.status === CUSTOMER_APPROVED (labour cost at completion, COGS report,
      // finance dashboards) silently misses tickets approved from this button.
      try {
        const estimateRepo = Source.getRepository(ServiceEstimate);
        const latestEstimate = await estimateRepo.findOne({
          where: { ticketId: ticket.id },
          order: { created_at: 'DESC' },
        });
        if (latestEstimate && latestEstimate.status !== ServiceEstimateStatus.CUSTOMER_APPROVED) {
          latestEstimate.status = ServiceEstimateStatus.CUSTOMER_APPROVED;
          await estimateRepo.save(latestEstimate);
        }
      } catch (err) {
        logger.error('Failed to sync estimate status on customer approval:', err);
      }

      if (ticket.leadId) {
        try {
          const convertRes = await axios.post(
            `${CRM_SERVICE_URL}${CRM_ENDPOINTS.LEAD_CONVERT.replace(':id', ticket.leadId)}`,
            { location: 'Service Delivery Location' },
            { headers: { Authorization: req.headers.authorization } },
          );

          if (convertRes.data && convertRes.data.success) {
            ticket.customerId = convertRes.data.data.customerId;
            ticket.leadId = null;
          }
        } catch (crmErr) {
          logger.error('Failed to convert CRM lead to customer:', crmErr);
        }
      }

      await ticketRepo.save(ticket);

      // Keep the billing estimate in sync so finance sees the same state.
      if (ticket.serviceQuotationId) {
        try {
          const token = sign(
            { userId: 'ven_inv_service', role: 'ADMIN' },
            ACCESS_SECRET as string,
            {
              expiresIn: '1m',
            },
          );
          await axios.put(
            `${BILLING_SERVICE_URL}/invoices/${ticket.serviceQuotationId}/status`,
            { status: 'CUSTOMER_ACCEPTED' },
            { headers: { Authorization: `Bearer ${token}` } },
          );
        } catch (err) {
          logger.error('Failed to sync CUSTOMER_ACCEPTED status to billing invoice:', err);
        }
      }

      if (ticket.assignedTechnicianId) {
        await NotificationPublisher.publishInAppRequest({
          recipientId: ticket.assignedTechnicianId,
          title: 'Customer Approved Service',
          message: `Customer approved service for ticket ${ticket.ticketNumber}. You can start work.`,
          type: 'TASK',
          referenceId: ticket.id,
          referenceType: 'SERVICE',
        });
      }

      res.status(200).json({
        success: true,
        data: ticket,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /service/tickets/:id/customer-reject
   */
  // The visit charge is owed the moment the technician does the site visit and
  // diagnosis — if the customer later rejects the estimate, that charge is still
  // earned and must be collected, not silently dropped. Only applies when it was
  // deferred onto the estimate (SEPARATE was already collected on-site at diagnosis
  // time) and only for chargeable (no warranty/contract) tickets.
  private isVisitChargeCollectionEligible(ticket: ServiceTicket): boolean {
    return (
      ticket.serviceContext === ServiceContext.CHARGEABLE &&
      Number(ticket.visitChargeAmount) > 0 &&
      ticket.visitChargeMethod === 'ADDED_TO_ESTIMATE' &&
      !ticket.visitChargeCollected
    );
  }

  private assertVisitChargeCollectionInputValid(
    ticket: ServiceTicket,
    body: { collectVisitCharge?: boolean; paymentMode?: string; accountId?: string },
  ): void {
    if (!body.collectVisitCharge || !this.isVisitChargeCollectionEligible(ticket)) return;
    if (!body.paymentMode || (body.paymentMode !== 'CHEQUE' && !body.accountId)) {
      throw new AppError(
        'paymentMode (and accountId, unless paying by cheque) are required to collect the visit charge.',
        400,
      );
    }
  }

  private async collectVisitChargeOnRejection(
    ticket: ServiceTicket,
    body: { collectVisitCharge?: boolean; paymentMode?: string; accountId?: string },
    userId?: string,
  ): Promise<void> {
    if (!body.collectVisitCharge || !this.isVisitChargeCollectionEligible(ticket)) return;
    const token = sign({ userId: 'ven_inv_service', role: 'ADMIN' }, ACCESS_SECRET as string, {
      expiresIn: '1m',
    });
    await axios.post(
      `${BILLING_SERVICE_URL}/invoices/service-visit-charge`,
      {
        serviceTicketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        customerId: ticket.customerId,
        branchId: ticket.branchId,
        amount: Number(ticket.visitChargeAmount),
        collectedBy: userId || 'SYSTEM',
        paymentMode: body.paymentMode,
        accountId: body.accountId,
        remarks: `Service Visit Charge — Ticket ${ticket.ticketNumber} — collected at estimate rejection`,
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    ticket.visitChargeCollected = true;
    ticket.visitChargeCollectedAt = new Date();
    await Source.getRepository(ServiceTicket).save(ticket);
    await this.logActivity(
      ticket.id,
      'VISIT_CHARGE_COLLECTED',
      `Visit charge of ${ticket.visitChargeAmount} collected at estimate rejection and posted to accounts.`,
      userId,
    );
  }

  /**
   * Applies an incremental discount to the linked billing Invoice without
   * touching its status — this is a status-preserving sibling of the
   * technician "revise estimate" flow, used when staff offer an on-the-spot
   * discount to save a sale instead of the customer rejecting outright.
   */
  private async syncInvoiceDiscount(ticket: ServiceTicket, discountDelta: number): Promise<void> {
    if (!ticket.serviceQuotationId || discountDelta <= 0) return;
    try {
      const token = sign({ userId: 'ven_inv_service', role: 'ADMIN' }, ACCESS_SECRET as string, {
        expiresIn: '1m',
      });
      await axios.patch(
        `${BILLING_SERVICE_URL}/invoices/${ticket.serviceQuotationId}/apply-discount`,
        { discountAmount: discountDelta },
        { headers: { Authorization: `Bearer ${token}` } },
      );
    } catch (err) {
      logger.error('Failed to sync discount to billing invoice:', err);
    }
  }

  customerReject = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const ticketRepo = Source.getRepository(ServiceTicket);
      const ticket = await ticketRepo.findOne({ where: { id: String(id) } });
      if (!ticket) throw new Error('Ticket not found');

      const { collectVisitCharge, paymentMode, accountId, reason, discountAmount } = req.body ?? {};

      if (!reason || !String(reason).trim()) {
        throw new AppError('A reason is required, whether rejecting or offering a discount', 400);
      }

      const discountToApply = Number(discountAmount) || 0;
      if (discountToApply > 0) {
        const estimateRepo = Source.getRepository(ServiceEstimate);
        const estimate = await estimateRepo.findOne({
          where: { ticketId: ticket.id },
          order: { created_at: 'DESC' },
        });
        if (estimate) {
          if (discountToApply > Number(estimate.totalCost)) {
            throw new AppError(
              `Discount of QAR ${discountToApply} exceeds the current estimate total of QAR ${estimate.totalCost}.`,
              400,
            );
          }
          estimate.discountAmount = (Number(estimate.discountAmount) || 0) + discountToApply;
          estimate.totalCost = Math.max(0, Number(estimate.totalCost) - discountToApply);
          await estimateRepo.save(estimate);
        }

        ticket.discountAmount = (Number(ticket.discountAmount) || 0) + discountToApply;
        await ticketRepo.save(ticket);
        await this.syncInvoiceDiscount(ticket, discountToApply);
        await this.logActivity(
          ticket.id,
          'ESTIMATE_DISCOUNT_OFFERED',
          `Staff offered a QAR ${discountToApply} discount instead of rejection. Reason: ${reason}.${
            estimate ? ` New total: QAR ${estimate.totalCost}.` : ''
          }`,
          req.user?.userId,
        );

        return res.status(200).json({ success: true, data: ticket });
      }

      this.assertVisitChargeCollectionInputValid(ticket, {
        collectVisitCharge,
        paymentMode,
        accountId,
      });

      ticket.status = ServiceTicketStatus.CUSTOMER_REJECTED;
      await ticketRepo.save(ticket);

      try {
        await this.collectVisitChargeOnRejection(
          ticket,
          { collectVisitCharge, paymentMode, accountId },
          req.user?.userId,
        );
      } catch (err) {
        logger.error('Failed to collect visit charge at customer rejection:', err);
      }

      await this.logActivity(
        ticket.id,
        'CUSTOMER_REJECTED',
        `Customer rejected the quotation. Reason: ${reason}`,
        req.user?.userId,
      );

      // Keep the billing estimate in sync so finance sees the same state.
      if (ticket.serviceQuotationId) {
        try {
          const token = sign(
            { userId: 'ven_inv_service', role: 'ADMIN' },
            ACCESS_SECRET as string,
            {
              expiresIn: '1m',
            },
          );
          await axios.put(
            `${BILLING_SERVICE_URL}/invoices/${ticket.serviceQuotationId}/status`,
            { status: 'CUSTOMER_REJECTED' },
            { headers: { Authorization: `Bearer ${token}` } },
          );
        } catch (err) {
          logger.error('Failed to sync CUSTOMER_REJECTED status to billing invoice:', err);
        }
      }

      const managerIds = await this.getBranchManagerAndAdmins(ticket.branchId);
      for (const mId of managerIds) {
        await NotificationPublisher.publishInAppRequest({
          recipientId: mId,
          title: 'Customer Rejected Service',
          message: `Customer rejected quotation for ticket ${ticket.ticketNumber}.`,
          type: 'WARNING',
          referenceId: ticket.id,
          referenceType: 'SERVICE',
        });
      }

      res.status(200).json({
        success: true,
        data: ticket,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /service/contracts
   */
  /**
   * POST /service/external-machines
   *
   * Registers a machine the customer bought elsewhere so it can carry a
   * service contract / tickets. Stored as a product with ownership EXTERNAL —
   * no model/warehouse/vendor of ours, never part of sellable stock.
   */
  registerExternalMachine = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { customerId, brand, modelName, serialNumber, meterReading, printColour, description } =
        req.body;

      if (!customerId) throw new AppError('customerId is required.', 400);
      if (!brand || !String(brand).trim()) throw new AppError('Brand is required.', 400);
      if (!modelName || !String(modelName).trim())
        throw new AppError('Model name is required.', 400);
      if (!serialNumber || !String(serialNumber).trim())
        throw new AppError('Serial number is required.', 400);
      const meter = Number(meterReading);
      if (meterReading === undefined || meterReading === '' || isNaN(meter) || meter < 0) {
        throw new AppError('Current meter reading is required (0 or more).', 400);
      }

      const productRepo = Source.getRepository(Product);
      const serial = String(serialNumber).trim();
      const existing = await productRepo.findOne({ where: { serial_no: serial } });
      if (existing) {
        throw new AppError(
          `A machine with serial number ${serial} already exists${
            existing.customer_id ? ' and is assigned to a customer' : ''
          }.`,
          400,
        );
      }

      const colour = Object.values(PrintColour).includes(printColour as PrintColour)
        ? (printColour as PrintColour)
        : PrintColour.BLACK_WHITE;

      const product = productRepo.create({
        serial_no: serial,
        name: String(modelName).trim(),
        brand: String(brand).trim(),
        ownership: OwnershipType.EXTERNAL,
        customer_id: customerId,
        meter_reading: meter,
        // Not our stock — keep it out of available inventory
        product_status: ProductStatus.SOLD,
        tax_rate: 0,
        print_colour: colour,
        description: description ? String(description) : undefined,
      });
      await productRepo.save(product);

      res.status(201).json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Validates and normalizes the type-specific billing fields of a contract.
   * Coverage is always derived from the type — client-sent rules are ignored.
   */
  private buildContractFields(body: Record<string, unknown>): Partial<ServiceContract> {
    const contractType = body.contractType as ServiceContractType;
    if (!Object.values(ServiceContractType).includes(contractType)) {
      throw new AppError('Invalid contract type. Must be FSMA, SMA or AMC.', 400);
    }

    const numOrNull = (v: unknown): number | null =>
      v === undefined || v === null || v === '' || isNaN(Number(v)) ? null : Number(v);

    const fields: Partial<ServiceContract> = {
      contractType,
      coverageRules: coverageForContractType(contractType) as ServiceContract['coverageRules'],
      contractValue: numOrNull(body.contractValue) || 0,
      notes: (body.notes as string) || null,
      monthlyCharge: null,
      copyLimit: null,
      overagePerCopyRate: null,
      startMeterReading: null,
      fsmaBillingMode: null,
      ratePerClickBW: null,
      ratePerClickColor: null,
      ratePerClickCombined: null,
      startMeterBW: null,
      startMeterColor: null,
    };

    // AMC (fixed annual fee) and SMA (agreed contract value, separate from
    // overage billing) are invoiced in full at signing, so both require a
    // contract value. FSMA is pure pay-per-click — its entire charge comes
    // from monthly meter readings (recordContractMeterReading), so it has no
    // upfront contract value at all.
    if (contractType !== ServiceContractType.FSMA) {
      if (!fields.contractValue || fields.contractValue <= 0) {
        throw new AppError('Contract value must be greater than 0.', 400);
      }
    } else {
      fields.contractValue = 0;
    }

    if (contractType === ServiceContractType.AMC) {
      // AMC has no type-specific fields beyond contractValue (checked above).
    } else if (contractType === ServiceContractType.SMA) {
      const copyLimit = numOrNull(body.copyLimit);
      const startMeterReading = numOrNull(body.startMeterReading);
      const overagePerCopyRate = numOrNull(body.overagePerCopyRate);
      if (copyLimit === null || copyLimit <= 0) {
        throw new AppError('SMA contracts require a copy limit greater than 0.', 400);
      }
      if (startMeterReading === null || startMeterReading < 0) {
        throw new AppError(
          'SMA contracts require the machine current meter reading at signing.',
          400,
        );
      }
      if (overagePerCopyRate !== null && overagePerCopyRate < 0) {
        throw new AppError('Overage per-copy rate cannot be negative.', 400);
      }
      fields.copyLimit = copyLimit;
      fields.startMeterReading = startMeterReading;
      fields.overagePerCopyRate = overagePerCopyRate ?? 0;
      const smaMonthly = numOrNull(body.monthlyCharge);
      if (smaMonthly !== null && smaMonthly < 0) {
        throw new AppError('Monthly charge cannot be negative.', 400);
      }
      fields.monthlyCharge = smaMonthly;
    } else {
      // FSMA — billed per click monthly
      const mode = body.fsmaBillingMode as FsmaBillingMode;
      if (!Object.values(FsmaBillingMode).includes(mode)) {
        throw new AppError('FSMA contracts require billing mode INDIVIDUAL or COMBINED.', 400);
      }
      fields.fsmaBillingMode = mode;
      if (mode === FsmaBillingMode.INDIVIDUAL) {
        const rateBW = numOrNull(body.ratePerClickBW);
        const rateColor = numOrNull(body.ratePerClickColor);
        const startBW = numOrNull(body.startMeterBW);
        const startColor = numOrNull(body.startMeterColor);
        if (rateBW === null || rateBW < 0 || rateColor === null || rateColor < 0) {
          throw new AppError(
            'FSMA INDIVIDUAL contracts require per-click rates for both B&W and colour.',
            400,
          );
        }
        if (startBW === null || startBW < 0 || startColor === null || startColor < 0) {
          throw new AppError(
            'FSMA INDIVIDUAL contracts require starting B&W and colour meter readings.',
            400,
          );
        }
        fields.ratePerClickBW = rateBW;
        fields.ratePerClickColor = rateColor;
        fields.startMeterBW = startBW;
        fields.startMeterColor = startColor;
        fields.startMeterReading = startBW + startColor;
      } else {
        const rate = numOrNull(body.ratePerClickCombined);
        const startTotal = numOrNull(body.startMeterReading);
        if (rate === null || rate < 0) {
          throw new AppError('FSMA COMBINED contracts require a per-click rate.', 400);
        }
        if (startTotal === null || startTotal < 0) {
          throw new AppError(
            'FSMA COMBINED contracts require the starting total meter reading.',
            400,
          );
        }
        fields.ratePerClickCombined = rate;
        fields.startMeterReading = startTotal;
      }
    }

    return fields;
  }

  createContract = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { customerId, productId, startDate, endDate, status } = req.body;
      if (!customerId || !productId) {
        throw new AppError('customerId and productId are required.', 400);
      }
      if (!startDate) throw new AppError('startDate is required.', 400);

      const fields = this.buildContractFields(req.body);
      const start = new Date(startDate);
      // Contracts default to a 1-year term
      const end = endDate
        ? new Date(endDate)
        : new Date(new Date(start).setFullYear(start.getFullYear() + 1));
      if (end <= start) throw new AppError('endDate must be after startDate.', 400);

      const contractRepo = Source.getRepository(ServiceContract);

      // A machine can only be under one active contract at a time
      const existing = await contractRepo.findOne({
        where: { productId: String(productId), status: 'ACTIVE' },
      });
      if (existing && new Date(existing.endDate) > new Date()) {
        throw new AppError(
          `This machine already has an active ${existing.contractType} contract until ${new Date(
            existing.endDate,
          ).toLocaleDateString()}. Terminate it before creating a new one.`,
          400,
        );
      }

      const branchId = req.user?.branchId || req.body.branchId || null;

      const contract = contractRepo.create({
        ...fields,
        customerId,
        productId,
        startDate: start,
        endDate: end,
        status: status || 'ACTIVE',
        branchId,
        // FSMA is pure pay-per-click: schedule the first automatic monthly
        // bill for one day before the signing-date anniversary next month.
        nextBillingDate:
          fields.contractType === ServiceContractType.FSMA ? firstFsmaBillingDate(start) : null,
      });
      await contractRepo.save(contract);

      // Every contract (AMC, SMA, FSMA) is invoiced in full for its contractValue at signing,
      // so Finance can track paid/pending from day one. If an amount was collected at
      // signing, record it against this same invoice immediately.
      if (contract.contractValue > 0) {
        if (branchId) {
          try {
            const token = sign(
              { userId: 'ven_inv_service', role: 'ADMIN' },
              ACCESS_SECRET as string,
              { expiresIn: '1m' },
            );
            const initialPayment = req.body.initialPayment;
            const response = await axios.post(
              `${BILLING_SERVICE_URL}/invoices/service-contract`,
              {
                customerId,
                branchId,
                createdBy: req.user?.userId || 'SYSTEM',
                serviceContractId: contract.id,
                billType: fields.contractType,
                description: `${fields.contractType} Service Contract (${start.toLocaleDateString()} – ${end.toLocaleDateString()})`,
                amount: contract.contractValue,
                initialPayment:
                  initialPayment && Number(initialPayment.amount) > 0
                    ? {
                        amount: Number(initialPayment.amount),
                        paymentMode: initialPayment.paymentMode,
                        paymentDate: initialPayment.paymentDate,
                        referenceNumber: initialPayment.referenceNumber,
                        remarks: initialPayment.remarks,
                      }
                    : undefined,
              },
              { headers: { Authorization: `Bearer ${token}` } },
            );
            if (response.data?.success) {
              contract.invoiceId = response.data.data.id;
              await contractRepo.save(contract);
            }
          } catch (billingErr) {
            logger.error('Failed to create contract invoice in billing service:', billingErr);
          }
        } else {
          logger.error('Cannot create contract invoice: no branchId available.');
        }
      }

      res.status(201).json({ success: true, data: contract });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /service/contracts
   */
  getContracts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { customerId, productId, contractType, status } = req.query;
      const contractRepo = Source.getRepository(ServiceContract);

      const query: FindOptionsWhere<ServiceContract> = {};
      if (customerId) query.customerId = customerId as string;
      if (productId) query.productId = productId as string;
      if (contractType) query.contractType = contractType as ServiceContractType;
      if (status) query.status = status as string;

      const contracts = await contractRepo.find({
        where: query,
        order: { created_at: 'DESC' },
      });

      // Attach per-contract billing/usage summary in one query
      let summaries: Array<{
        contractId: string;
        readingCount: string;
        totalBilled: string;
        lastTotalReading: number | null;
        lastReadingDate: Date | null;
      }> = [];
      if (contracts.length > 0) {
        summaries = await Source.getRepository(ContractMeterReading)
          .createQueryBuilder('r')
          .select('r.contractId', 'contractId')
          .addSelect('COUNT(*)', 'readingCount')
          .addSelect('COALESCE(SUM(r.amountCharged), 0)', 'totalBilled')
          .addSelect('MAX(r.totalReading)', 'lastTotalReading')
          .addSelect('MAX(r.readingDate)', 'lastReadingDate')
          .where('r.contractId IN (:...ids)', { ids: contracts.map((c) => c.id) })
          .groupBy('r.contractId')
          .getRawMany();
      }
      const summaryMap = new Map(summaries.map((s) => [s.contractId, s]));

      // Resolve machine details directly so the client doesn't depend on its
      // (branch-filtered) product list — external machines have no warehouse
      // and would otherwise show up as "Unknown Product".
      const contractProductIds = [...new Set(contracts.map((c) => c.productId).filter(Boolean))];
      const contractProducts = contractProductIds.length
        ? await Source.getRepository(Product).find({
            where: { id: In(contractProductIds) },
            relations: { model: true },
          })
        : [];
      const productMap = new Map(contractProducts.map((p) => [p.id, p]));

      const data = contracts.map((c) => {
        const p = c.productId ? productMap.get(c.productId) : undefined;
        const s = summaryMap.get(c.id);
        const lastTotal = s?.lastTotalReading != null ? Number(s.lastTotalReading) : null;
        const copiesUsed =
          c.contractType === ServiceContractType.SMA &&
          c.startMeterReading != null &&
          lastTotal != null
            ? Math.max(0, lastTotal - Number(c.startMeterReading))
            : null;
        return {
          ...c,
          machine: p
            ? {
                modelName: p.model?.model_name || p.name,
                brand: p.brand,
                serialNumber: p.serial_no,
              }
            : null,
          usageSummary: {
            readingCount: Number(s?.readingCount || 0),
            totalBilled: Number(s?.totalBilled || 0),
            lastTotalReading: lastTotal,
            lastReadingDate: s?.lastReadingDate || null,
            copiesUsed,
            copiesRemaining:
              copiesUsed != null && c.copyLimit != null
                ? Math.max(0, Number(c.copyLimit) - copiesUsed)
                : null,
          },
        };
      });

      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /service/contracts/:id
   */
  getContractById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const contractRepo = Source.getRepository(ServiceContract);
      const contract = await contractRepo.findOne({ where: { id: id as string } });
      if (!contract) throw new AppError('Service Contract not found', 404);

      // Machine details (resolved server-side; works for external machines too)
      const product = contract.productId
        ? await Source.getRepository(Product).findOne({
            where: { id: contract.productId },
            relations: { model: true },
          })
        : null;

      // Meter readings + billed-to-date
      const readings = await Source.getRepository(ContractMeterReading).find({
        where: { contractId: contract.id },
        order: { readingDate: 'DESC', created_at: 'DESC' },
      });
      const totalBilled = readings.reduce((sum, r) => sum + Number(r.amountCharged || 0), 0);

      // Service tickets under this contract: linked by reference, or raised for
      // the same machine inside the contract period.
      const ticketRepo = Source.getRepository(ServiceTicket);
      const ticketWhere: FindOptionsWhere<ServiceTicket>[] = [{ contractReferenceId: contract.id }];
      if (contract.productId) {
        ticketWhere.push({
          productId: contract.productId,
          created_at: Between(new Date(contract.startDate), new Date(contract.endDate)),
        });
      }
      const tickets = await ticketRepo.find({ where: ticketWhere, order: { created_at: 'DESC' } });

      // Per-ticket cost = billable items + visit charge − discount
      const ticketIds = tickets.map((t) => t.id);
      const items = ticketIds.length
        ? await Source.getRepository(ServiceTicketItem).find({ where: { ticketId: In(ticketIds) } })
        : [];
      const itemsTotalByTicket = new Map<string, number>();
      for (const item of items) {
        if (item.isFree) continue;
        const line =
          item.totalPrice != null
            ? Number(item.totalPrice)
            : Number(item.unitPrice || 0) * Number(item.quantity || 1);
        itemsTotalByTicket.set(item.ticketId, (itemsTotalByTicket.get(item.ticketId) || 0) + line);
      }

      const ticketSummaries = tickets.map((t) => {
        const itemsTotal = itemsTotalByTicket.get(t.id) || 0;
        const totalCost = Math.max(
          0,
          itemsTotal + Number(t.visitChargeAmount || 0) - Number(t.discountAmount || 0),
        );
        return {
          id: t.id,
          ticketNumber: t.ticketNumber,
          status: t.status,
          ticketType: t.ticketType,
          jobType: t.jobType,
          issueDescription: t.issueDescription,
          workPerformed: t.workPerformed,
          createdAt: t.created_at,
          completedAt: t.completedAt,
          itemsTotal,
          visitChargeAmount: Number(t.visitChargeAmount || 0),
          discountAmount: Number(t.discountAmount || 0),
          totalCost,
        };
      });

      // Only work that finance has approved and the technician has actually finished
      // should count toward the contract's service history / total cost — a ticket
      // still awaiting finance approval (or otherwise in progress) isn't a completed
      // service yet.
      const completedTicketSummaries = ticketSummaries.filter(
        (t) => t.status === ServiceTicketStatus.COMPLETED,
      );

      const customer = await this.fetchCustomerDetails(contract.customerId);

      const data = {
        ...contract,
        customer,
        machine: product
          ? {
              modelName: product.model?.model_name || product.name,
              brand: product.brand,
              serialNumber: product.serial_no,
              ownership: product.ownership || null,
              meterReading: product.meter_reading ?? null,
            }
          : null,
        readings,
        totalBilled,
        serviceHistory: {
          ticketCount: completedTicketSummaries.length,
          completedCount: completedTicketSummaries.length,
          totalServiceCost: completedTicketSummaries.reduce((sum, t) => sum + t.totalCost, 0),
          tickets: completedTicketSummaries,
        },
      };

      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /service/contracts/:id
   */
  updateContract = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { customerId, productId, startDate, endDate, status } = req.body;
      const contractRepo = Source.getRepository(ServiceContract);
      const contract = await contractRepo.findOne({ where: { id: id as string } });
      if (!contract) throw new AppError('Service Contract not found', 404);

      // Re-validate the full set of type-specific fields (merged over current
      // values) so a type change can never leave stale billing fields behind.
      const merged = { ...contract, ...req.body };
      const fields = this.buildContractFields(merged);
      Object.assign(contract, fields);

      // A contract is bound to its customer and machine for life — reject swaps.
      if (customerId && customerId !== contract.customerId) {
        throw new AppError(
          'The customer of a contract cannot be changed. Delete this contract and create a new one instead.',
          400,
        );
      }
      if (productId && productId !== contract.productId) {
        throw new AppError(
          'The machine of a contract cannot be changed. Delete this contract and create a new one instead.',
          400,
        );
      }
      if (startDate) contract.startDate = new Date(startDate);
      if (endDate) contract.endDate = new Date(endDate);
      if (new Date(contract.endDate) <= new Date(contract.startDate)) {
        throw new AppError('endDate must be after startDate.', 400);
      }
      if (status) contract.status = status;

      // Keep the monthly billing schedule in sync with type/startDate edits.
      if (contract.contractType === ServiceContractType.FSMA) {
        if (!contract.nextBillingDate || startDate) {
          contract.nextBillingDate = firstFsmaBillingDate(new Date(contract.startDate));
        }
      } else {
        contract.nextBillingDate = null;
      }

      await contractRepo.save(contract);
      res.status(200).json({ success: true, data: contract });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /service/contracts/:id
   */
  deleteContract = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const contractRepo = Source.getRepository(ServiceContract);
      const contract = await contractRepo.findOne({ where: { id: id as string } });
      if (!contract) throw new Error('Service Contract not found');
      if (contract.invoiceId) {
        throw new AppError(
          'This contract has already been invoiced and cannot be deleted. Edit it instead.',
          400,
        );
      }
      await contractRepo.remove(contract);
      res.status(200).json({ success: true, message: 'Service Contract deleted successfully' });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /service/contracts/:id/meter-readings
   *
   * Records the (typically monthly) meter reading against a contract and
   * computes the amount to collect for the period:
   * - AMC : flat monthlyCharge (meters optional, tracking only)
   * - SMA : clicks beyond copyLimit this period × overagePerCopyRate
   *         (+ monthlyCharge if configured)
   * - FSMA INDIVIDUAL : bwClicks × ratePerClickBW + colorClicks × ratePerClickColor
   * - FSMA COMBINED   : totalClicks × ratePerClickCombined
   */
  recordContractMeterReading = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { totalReading, bwReading, colorReading, readingDate, notes } = req.body;

      const contractRepo = Source.getRepository(ServiceContract);
      const contract = await contractRepo.findOne({ where: { id: id as string } });
      if (!contract) throw new AppError('Service Contract not found', 404);
      if (contract.status !== 'ACTIVE') {
        throw new AppError(`Cannot record readings on a ${contract.status} contract.`, 400);
      }

      const readingRepo = Source.getRepository(ContractMeterReading);
      const lastReading = await readingRepo.findOne({
        where: { contractId: contract.id },
        order: { readingDate: 'DESC', created_at: 'DESC' },
      });

      const numOrNull = (v: unknown): number | null =>
        v === undefined || v === null || v === '' || isNaN(Number(v)) ? null : Number(v);

      let newTotal = numOrNull(totalReading);
      const newBW = numOrNull(bwReading);
      const newColor = numOrNull(colorReading);

      const isIndividualFsma =
        contract.contractType === ServiceContractType.FSMA &&
        contract.fsmaBillingMode === FsmaBillingMode.INDIVIDUAL;

      if (isIndividualFsma) {
        if (newBW === null || newColor === null) {
          throw new AppError(
            'FSMA INDIVIDUAL contracts require both B&W and colour meter readings.',
            400,
          );
        }
        newTotal = newBW + newColor;
      } else if (contract.contractType !== ServiceContractType.AMC && newTotal === null) {
        throw new AppError('totalReading is required.', 400);
      }

      // Meters only count upward — baselines come from the contract itself
      const prevTotal = lastReading?.totalReading ?? contract.startMeterReading;
      const prevBW = lastReading?.bwReading ?? contract.startMeterBW;
      const prevColor = lastReading?.colorReading ?? contract.startMeterColor;
      if (newTotal !== null && prevTotal != null && newTotal < Number(prevTotal)) {
        throw new AppError(
          `Total reading ${newTotal} cannot be less than the previous reading ${prevTotal}.`,
          400,
        );
      }
      if (newBW !== null && prevBW != null && newBW < Number(prevBW)) {
        throw new AppError(
          `B&W reading ${newBW} cannot be less than the previous reading ${prevBW}.`,
          400,
        );
      }
      if (newColor !== null && prevColor != null && newColor < Number(prevColor)) {
        throw new AppError(
          `Colour reading ${newColor} cannot be less than the previous reading ${prevColor}.`,
          400,
        );
      }

      const clicksTotal = newTotal !== null && prevTotal != null ? newTotal - Number(prevTotal) : 0;
      const clicksBW = newBW !== null && prevBW != null ? newBW - Number(prevBW) : 0;
      const clicksColor = newColor !== null && prevColor != null ? newColor - Number(prevColor) : 0;

      let amountCharged = 0;
      let chargeBreakdown: Record<string, unknown> = {};

      if (contract.contractType === ServiceContractType.AMC) {
        // AMC is a fixed annual/monthly agreement billed outside meter readings.
        // Readings are kept for tracking only — clicks are never charged.
        amountCharged = 0;
        chargeBreakdown = { type: 'AMC', trackingOnly: true };
      } else if (contract.contractType === ServiceContractType.SMA) {
        const startMeter = Number(contract.startMeterReading) || 0;
        const copyLimit = Number(contract.copyLimit) || 0;
        const rate = Number(contract.overagePerCopyRate) || 0;
        const usedToDate = Math.max(0, (newTotal as number) - startMeter);
        const prevUsedToDate = Math.max(0, Number(prevTotal ?? startMeter) - startMeter);
        // Only the overage newly accrued this period is billed
        const overageClicks =
          Math.max(0, usedToDate - copyLimit) - Math.max(0, prevUsedToDate - copyLimit);
        const overageAmount = overageClicks * rate;
        const monthly = Number(contract.monthlyCharge) || 0;
        amountCharged = overageAmount + monthly;
        chargeBreakdown = {
          type: 'SMA',
          usedToDate,
          copyLimit,
          copiesRemaining: Math.max(0, copyLimit - usedToDate),
          overageClicks,
          overagePerCopyRate: rate,
          overageAmount,
          monthlyCharge: monthly,
          limitExceeded: usedToDate > copyLimit,
        };
      } else if (isIndividualFsma) {
        const rateBW = Number(contract.ratePerClickBW) || 0;
        const rateColor = Number(contract.ratePerClickColor) || 0;
        amountCharged = clicksBW * rateBW + clicksColor * rateColor;
        chargeBreakdown = {
          type: 'FSMA_INDIVIDUAL',
          clicksBW,
          ratePerClickBW: rateBW,
          amountBW: clicksBW * rateBW,
          clicksColor,
          ratePerClickColor: rateColor,
          amountColor: clicksColor * rateColor,
        };
      } else {
        const rate = Number(contract.ratePerClickCombined) || 0;
        amountCharged = clicksTotal * rate;
        chargeBreakdown = {
          type: 'FSMA_COMBINED',
          clicksTotal,
          ratePerClickCombined: rate,
        };
      }

      amountCharged = Math.round(amountCharged * 100) / 100;

      const reading = readingRepo.create({
        contractId: contract.id,
        readingDate: readingDate ? new Date(readingDate) : new Date(),
        totalReading: newTotal,
        bwReading: newBW,
        colorReading: newColor,
        clicksTotal,
        clicksBW,
        clicksColor,
        amountCharged,
        chargeBreakdown,
        notes: notes || null,
        recordedBy: req.user?.userId || null,
      });
      await readingRepo.save(reading);

      // Keep the machine's lifetime meter in sync so service tickets validate
      // against the freshest value.
      if (newTotal !== null) {
        const productRepo = Source.getRepository(Product);
        const product = await productRepo.findOne({ where: { id: contract.productId } });
        if (product && (!product.meter_reading || newTotal > product.meter_reading)) {
          product.meter_reading = newTotal;
          await productRepo.save(product);
        }
      }

      res.status(201).json({ success: true, data: reading });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /service/contracts/:id/meter-readings
   */
  getContractMeterReadings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const contractRepo = Source.getRepository(ServiceContract);
      const contract = await contractRepo.findOne({ where: { id: id as string } });
      if (!contract) throw new AppError('Service Contract not found', 404);

      const readings = await Source.getRepository(ContractMeterReading).find({
        where: { contractId: contract.id },
        order: { readingDate: 'DESC', created_at: 'DESC' },
      });

      const totalBilled = readings.reduce((sum, r) => sum + Number(r.amountCharged || 0), 0);
      res.status(200).json({
        success: true,
        data: { contract, readings, totalBilled: Math.round(totalBilled * 100) / 100 },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /service/contracts/:id/bills
   *
   * Lists the monthly bills the FSMA billing job has generated for this
   * contract — one row per billing_service Invoice, grouped from the
   * ContractMeterReading rows it swept up (see fsmaBillingJob.ts).
   */
  getContractBills = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const contractRepo = Source.getRepository(ServiceContract);
      const contract = await contractRepo.findOne({ where: { id: id as string } });
      if (!contract) throw new AppError('Service Contract not found', 404);

      const groups = await Source.getRepository(ContractMeterReading)
        .createQueryBuilder('r')
        .select('r.billingInvoiceId', 'invoiceId')
        .addSelect('SUM(r.amountCharged)', 'amount')
        .addSelect('MIN(r.readingDate)', 'periodStart')
        .addSelect('MAX(r.readingDate)', 'periodEnd')
        .addSelect('MAX(r.billedAt)', 'billedAt')
        .where('r.contractId = :contractId', { contractId: contract.id })
        .andWhere('r.billingInvoiceId IS NOT NULL')
        .groupBy('r.billingInvoiceId')
        .orderBy('MAX(r.billedAt)', 'DESC')
        .getRawMany();

      const token = sign({ userId: 'ven_inv_service', role: 'ADMIN' }, ACCESS_SECRET as string, {
        expiresIn: '1m',
      });

      const bills = await Promise.all(
        groups.map(async (g) => {
          let invoice: Record<string, unknown> | null = null;
          try {
            const response = await axios.get(`${BILLING_SERVICE_URL}/invoices/${g.invoiceId}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            invoice = response.data?.data || null;
          } catch (err) {
            logger.error(`Failed to fetch FSMA bill invoice ${g.invoiceId}:`, err);
          }
          return {
            invoiceId: g.invoiceId as string,
            amount: Math.round(Number(g.amount) * 100) / 100,
            periodStart: g.periodStart,
            periodEnd: g.periodEnd,
            billedAt: g.billedAt,
            invoiceNumber: invoice?.invoiceNumber ?? null,
            status: invoice?.status ?? null,
            emailSentAt: invoice?.emailSentAt ?? null,
            totalAmount: invoice?.totalAmount ?? null,
          };
        }),
      );

      res.status(200).json({ success: true, data: bills });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /service/tickets/:id/report
   */
  generateReportPDF = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const ticketRepo = Source.getRepository(ServiceTicket);
      const ticket = await ticketRepo.findOne({
        where: { id: String(id) },
        relations: ['items'],
      });
      if (!ticket) throw new Error('Ticket not found');

      const reportRepo = Source.getRepository(ServiceReport);
      const report = await reportRepo.findOne({ where: { ticketId: ticket.id } });

      const estimateRepo = Source.getRepository(ServiceEstimate);
      const estimate = await estimateRepo.findOne({
        where: { ticketId: ticket.id },
        relations: ['items'],
        order: { created_at: 'DESC' },
      });

      const customer = await this.fetchCustomerDetails(ticket.customerId);
      const branchRepo = Source.getRepository(Branch);
      const branch = await branchRepo.findOne({ where: { id: ticket.branchId } });
      const technician = await this.fetchEmployeeDetails(ticket.assignedTechnicianId);

      const pdfBuffer = await generateServiceReportPdf(
        ticket,
        report,
        estimate,
        customer,
        branch,
        technician,
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=Service_Report_${ticket.ticketNumber}.pdf`,
      );
      return res.end(pdfBuffer);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /service/machine/:productId/history
   */
  getMachineHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      let productId = req.params.productId as string;
      const ticketRepo = Source.getRepository(ServiceTicket);

      // If productId is not a UUID, check if it's a serial number
      if (
        productId &&
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId)
      ) {
        const ticket = await ticketRepo.findOne({ where: { serialNumber: productId } });
        if (ticket && ticket.productId) {
          productId = ticket.productId;
        }
      }

      const historyRepo = Source.getRepository(MachineServiceHistory);
      const history = await historyRepo.findOne({ where: { productId: productId } });

      const product = await Source.getRepository(Product).findOne({ where: { id: productId } });

      const tickets = await ticketRepo.find({
        where: { productId: productId },
        relations: ['items'],
        order: { created_at: 'DESC' },
      });

      const partUsageRepo = Source.getRepository(ServicePartUsageLog);
      const partLogs = await partUsageRepo.find({
        where: { productId: productId },
        order: { replacedAt: 'DESC' },
      });

      const yieldRepo = Source.getRepository(ConsumableYieldHistory);
      const yields = await yieldRepo.find({
        where: { productId: productId },
        order: { installedDate: 'DESC' },
      });

      // Self-healing: Product.meter_reading only reflects diagnoses that ran
      // after the write-path existed there. Fall back to the highest reading
      // ever recorded across all tickets for this machine so older tickets
      // (diagnosed before that write existed) don't show a stale value.
      const readingCandidates = [
        Number(product?.meter_reading) || 0,
        ...tickets.map((t) =>
          Math.max(Number(t.meterReadingAtService) || 0, Number(t.meterReadingAtCreation) || 0),
        ),
      ];
      const currentMeterReading = readingCandidates.length ? Math.max(...readingCandidates) : null;

      if (
        product &&
        currentMeterReading &&
        currentMeterReading > (Number(product.meter_reading) || 0)
      ) {
        product.meter_reading = currentMeterReading;
        await Source.getRepository(Product).save(product);
      }

      res.status(200).json({
        success: true,
        data: {
          history: history || null,
          currentMeterReading: currentMeterReading || null,
          tickets,
          partLogs,
          yields,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Helper to fetch customer details from CRM service
   */
  private async fetchCustomerDetails(
    customerId: string | undefined | null,
  ): Promise<PdfPerson | null> {
    if (!customerId) return null;
    try {
      const token = sign({ userId: 'ven_inv_service', role: 'ADMIN' }, ACCESS_SECRET as string, {
        expiresIn: '5m',
      });
      const response = await axios.get(`${CRM_SERVICE_URL}/customers/${customerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data?.data;
    } catch (err) {
      logger.error('Error fetching customer details:', err);
      return null;
    }
  }

  /**
   * Helper to fetch employee details by ID
   */
  private async fetchEmployeeDetails(
    employeeId: string | undefined | null,
  ): Promise<PdfPerson | null> {
    if (!employeeId) return null;
    try {
      const token = sign({ userId: 'ven_inv_service', role: 'ADMIN' }, ACCESS_SECRET as string, {
        expiresIn: '5m',
      });
      const response = await axios.get(`${EMPLOYEE_SERVICE_URL}/employee/${employeeId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data?.data;
    } catch (err) {
      logger.error('Error fetching employee details:', err);
      return null;
    }
  }

  /**
   * GET /service/tickets/:id/quotation-pdf
   */
  getQuotationPdf = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const ticketRepo = Source.getRepository(ServiceTicket);
      const ticket = await ticketRepo.findOne({ where: { id: String(id) } });
      if (!ticket) {
        return res.status(404).json({ success: false, message: 'Service ticket not found' });
      }

      const estimateRepo = Source.getRepository(ServiceEstimate);
      const estimate = await estimateRepo.findOne({
        where: { ticketId: ticket.id },
        relations: ['items'],
        order: { created_at: 'DESC' },
      });

      if (!estimate) {
        return res
          .status(404)
          .json({ success: false, message: 'Estimate not found for this ticket' });
      }

      // Fetch customer details
      const customer = await this.fetchCustomerDetails(ticket.customerId);

      // Fetch branch details
      const branchRepo = Source.getRepository(Branch);
      const branch = await branchRepo.findOne({ where: { id: ticket.branchId } });

      // Fetch finance approver
      const activityRepo = Source.getRepository(ServiceTicketActivity);
      const activity = await activityRepo.findOne({
        where: { ticketId: ticket.id, activityType: 'FINANCE_APPROVED' },
        order: { created_at: 'DESC' },
      });
      const financeApprover =
        activity && activity.performedBy
          ? await this.fetchEmployeeDetails(activity.performedBy)
          : null;

      const pdfBuffer = await generateServiceQuotationPdf(
        ticket,
        estimate,
        customer,
        branch,
        financeApprover,
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename=Quotation_${ticket.ticketNumber}.pdf`);
      return res.end(pdfBuffer);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /service/tickets/:id/completion-bill-pdf
   */
  getCompletionBillPdf = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const ticketRepo = Source.getRepository(ServiceTicket);
      const ticket = await ticketRepo.findOne({ where: { id: String(id) }, relations: ['items'] });
      if (!ticket) {
        return res.status(404).json({ success: false, message: 'Service ticket not found' });
      }

      if (ticket.status !== ServiceTicketStatus.COMPLETED) {
        return res.status(400).json({
          success: false,
          message: 'Completion bill is only available for completed tickets',
        });
      }

      // Fetch the approved estimate (real billed labour/visit/transport/discount)
      // and the completion service report (real work-performed/resolution text) —
      // both needed so the printed bill reflects what was actually approved/typed.
      const estimateRepo = Source.getRepository(ServiceEstimate);
      const estimate = await estimateRepo.findOne({
        where: { ticketId: ticket.id },
        relations: ['items'],
        order: { created_at: 'DESC' },
      });
      const reportRepo = Source.getRepository(ServiceReport);
      const report = await reportRepo.findOne({ where: { ticketId: ticket.id } });

      // Fetch customer details
      const customer = await this.fetchCustomerDetails(ticket.customerId);

      // Fetch branch details
      const branchRepo = Source.getRepository(Branch);
      const branch = await branchRepo.findOne({ where: { id: ticket.branchId } });

      // Fetch technician
      const technician = await this.fetchEmployeeDetails(ticket.assignedTechnicianId);

      const pdfBuffer = await generateServiceCompletionBillPdf(
        ticket,
        estimate,
        report,
        customer,
        branch,
        technician,
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `inline; filename=Completion_Bill_${ticket.ticketNumber}.pdf`,
      );
      return res.end(pdfBuffer);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /service/tickets/:id/send-quotation
   */
  sendQuotation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const { sendToPhone, sendToEmail } = req.body;

      const ticketRepo = Source.getRepository(ServiceTicket);
      const ticket = await ticketRepo.findOne({ where: { id: String(id) } });
      if (!ticket) {
        return res.status(404).json({ success: false, message: 'Service ticket not found' });
      }

      const estimateRepo = Source.getRepository(ServiceEstimate);
      const estimate = await estimateRepo.findOne({
        where: { ticketId: ticket.id },
        relations: ['items'],
        order: { created_at: 'DESC' },
      });

      if (!estimate) {
        return res.status(404).json({ success: false, message: 'Estimate not found' });
      }

      const customer = await this.fetchCustomerDetails(ticket.customerId);
      const branchRepo = Source.getRepository(Branch);
      const branch = await branchRepo.findOne({ where: { id: ticket.branchId } });

      const activityRepo = Source.getRepository(ServiceTicketActivity);
      const activity = await activityRepo.findOne({
        where: { ticketId: ticket.id, activityType: 'FINANCE_APPROVED' },
        order: { created_at: 'DESC' },
      });
      const financeApprover =
        activity && activity.performedBy
          ? await this.fetchEmployeeDetails(activity.performedBy)
          : null;

      const pdfBuffer = await generateServiceQuotationPdf(
        ticket,
        estimate,
        customer,
        branch,
        financeApprover,
      );

      const emailToUse = sendToEmail || customer?.email;
      const phoneToUse = sendToPhone || customer?.phone;

      if (!emailToUse && !phoneToUse) {
        return res.status(400).json({
          success: false,
          message: 'No email or phone number provided or available on customer record',
        });
      }

      let emailSent = false;
      let whatsappSent = false;

      if (emailToUse) {
        const subject = `Service Quotation - ${ticket.ticketNumber}`;
        const bodyText = `Dear Customer,

Please find attached the service quotation ${ticket.ticketNumber} for your approval.

Machine Details:
Brand: ${ticket.productBrand}
Model: ${ticket.productModel}
Serial No: ${ticket.serialNumber}

Total Estimated cost: QAR ${Number(estimate.totalCost).toFixed(2)}

Please review and approve the quotation to start the service.

Best regards,
Xerocare Technical Services`;

        await sendServicePdfEmail(
          emailToUse,
          subject,
          bodyText,
          pdfBuffer,
          `Quotation_${ticket.ticketNumber}.pdf`,
        );
        emailSent = true;
      }

      if (phoneToUse) {
        const downloadUrl = `http://localhost:3001/i/service/tickets/${ticket.id}/quotation-pdf`;
        const customerName = customer
          ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim()
          : 'Valued Customer';

        const message = `*Xerocare Technical Services*

Dear ${customerName},

Your service quotation is ready.

📋 *Quotation No:* SQ-${ticket.ticketNumber.replace('ST-', '')}
🖨️ *Machine:* ${ticket.productBrand} ${ticket.productModel} (SN: ${ticket.serialNumber})
💰 *Total Estimate:* QAR ${Number(estimate.totalCost).toFixed(2)}

Download your quotation: ${downloadUrl}

For queries contact us at +974 4455 6677`;

        await sendWhatsappMessage(phoneToUse, message);
        whatsappSent = true;
      }

      return res.status(200).json({
        success: true,
        message: 'Quotation sent successfully',
        data: { emailSent, whatsappSent, emailToUse, phoneToUse },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /service/tickets/:id/send-completion-bill
   */
  sendCompletionBill = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const { sendToPhone, sendToEmail } = req.body;

      const ticketRepo = Source.getRepository(ServiceTicket);
      const ticket = await ticketRepo.findOne({ where: { id: String(id) }, relations: ['items'] });
      if (!ticket) {
        return res.status(404).json({ success: false, message: 'Service ticket not found' });
      }

      if (ticket.status !== ServiceTicketStatus.COMPLETED) {
        return res.status(400).json({
          success: false,
          message: 'Service completion bill is only available for completed tickets',
        });
      }

      const estimateRepo = Source.getRepository(ServiceEstimate);
      const estimate = await estimateRepo.findOne({
        where: { ticketId: ticket.id },
        relations: ['items'],
        order: { created_at: 'DESC' },
      });
      const reportRepo = Source.getRepository(ServiceReport);
      const report = await reportRepo.findOne({ where: { ticketId: ticket.id } });

      const customer = await this.fetchCustomerDetails(ticket.customerId);
      const branchRepo = Source.getRepository(Branch);
      const branch = await branchRepo.findOne({ where: { id: ticket.branchId } });
      const technician = await this.fetchEmployeeDetails(ticket.assignedTechnicianId);

      const pdfBuffer = await generateServiceCompletionBillPdf(
        ticket,
        estimate,
        report,
        customer,
        branch,
        technician,
      );

      const emailToUse = sendToEmail || customer?.email;
      const phoneToUse = sendToPhone || customer?.phone;

      if (!emailToUse && !phoneToUse) {
        return res.status(400).json({
          success: false,
          message: 'No email or phone number provided or available on customer record',
        });
      }

      let emailSent = false;
      let whatsappSent = false;

      if (emailToUse) {
        const subject = `Service Completion Bill - ${ticket.ticketNumber}`;
        const bodyText = `Dear Customer,

Your service request under ticket ${ticket.ticketNumber} has been successfully completed.

Please find attached the completion bill: ${ticket.completionBillNumber || 'N/A'}.

Best regards,
Xerocare Technical Services`;

        await sendServicePdfEmail(
          emailToUse,
          subject,
          bodyText,
          pdfBuffer,
          `Completion_Bill_${ticket.ticketNumber}.pdf`,
        );
        emailSent = true;
      }

      if (phoneToUse) {
        const downloadUrl = `http://localhost:3001/i/service/tickets/${ticket.id}/completion-bill-pdf`;
        const customerName = customer
          ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim()
          : 'Valued Customer';

        const message = `*Xerocare Technical Services*

Dear ${customerName},

Your service job has been completed.

📋 *Bill No:* ${ticket.completionBillNumber || 'N/A'}
🖨️ *Machine:* ${ticket.productBrand} ${ticket.productModel} (SN: ${ticket.serialNumber})
✅ *Status:* Completed

Download your Completion Bill: ${downloadUrl}

For queries contact us at +974 4455 6677`;

        await sendWhatsappMessage(phoneToUse, message);
        whatsappSent = true;
      }

      return res.status(200).json({
        success: true,
        message: 'Completion bill sent successfully',
        data: { emailSent, whatsappSent, emailToUse, phoneToUse },
      });
    } catch (error) {
      next(error);
    }
  };

  reviseEstimate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const {
        items: rawItems,
        visitChargeAmount,
        visitChargeMethod,
        discountAmount,
        technicianNoteToFinance,
        revisionType,
      } = req.body;
      const items = rawItems as ReviseEstimateItem[];

      if (!technicianNoteToFinance) {
        throw new AppError(
          'Technician note to finance is required explaining the reason for revision',
          400,
        );
      }

      const ticketRepo = Source.getRepository(ServiceTicket);
      const ticket = await ticketRepo.findOne({
        where: { id: String(id) },
        relations: ['items'],
      });
      if (!ticket) throw new AppError('Ticket not found', 404);

      if (!ticket.serviceQuotationId) {
        throw new AppError('Ticket does not have an active estimate to revise', 400);
      }

      const { role, employeeJob, userId } = req.user || {};
      if (role === 'EMPLOYEE' && employeeJob === 'SERVICE_TECHNICIAN') {
        if (ticket.assignedTechnicianId !== userId) {
          throw new AppError(
            'Access denied: You are not the assigned technician for this ticket',
            403,
          );
        }
      }

      const token = sign({ userId: 'ven_inv_service', role: 'ADMIN' }, ACCESS_SECRET as string, {
        expiresIn: '1m',
      });

      // 1. Fetch current invoice to create a revision snapshot
      const getInvoiceRes = await axios.get(
        `${BILLING_SERVICE_URL}/invoices/${ticket.serviceQuotationId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const invoice = getInvoiceRes.data.data;

      // Create new ServiceEstimateRevision record (snapshot current state before update)
      const revisionRepo = Source.getRepository(ServiceEstimateRevision);
      const newRevision = revisionRepo.create({
        invoiceId: invoice.id,
        ticketId: ticket.id,
        revisionNumber: invoice.revisionCount || 0,
        revisionType: revisionType || 'DISCOUNT',
        itemsSnapshot: invoice.items || {},
        totalAmount: Number(invoice.totalAmount) || 0,
        discountApplied: Number(invoice.totalDiscountAmount) || 0,
        visitChargeAmount: Number(invoice.visitChargeAmount) || 0,
        technicianNoteToFinance: invoice.technicianNoteToFinance || null,
        submittedBy: userId || 'SYSTEM',
        financeDecision: null,
        financeDecisionBy: null,
        financeDecisionNote: null,
        financeDecisionAt: null,
        validUntil: invoice.estimateValidUntil ? new Date(invoice.estimateValidUntil) : null,
      });
      await revisionRepo.save(newRevision);

      // Coverage is per item category under contracts (SMA/AMC charge toner,
      // AMC charges parts). Warranty mirrors SMA (toner chargeable); RENT stays
      // fully covered. Computed BEFORE any mutation so validation can reject early.
      const baseFreeContext = ticket.serviceContext === ServiceContext.RENT;
      const warrantyContext = [
        ServiceContext.WARRANTY,
        ServiceContext.LEASE_UNDER_WARRANTY,
      ].includes(ticket.serviceContext);
      const reviseCoverage: ContractCoverage = baseFreeContext
        ? { ...FULL_COVERAGE }
        : warrantyContext
          ? { ...WARRANTY_COVERAGE }
          : ((await this.getTicketContractCoverage(ticket.contractReferenceId)) ?? {
              ...NO_COVERAGE,
            });
      const hasContractContext = baseFreeContext || warrantyContext || !!ticket.contractReferenceId;
      const revisePartCategories = await this.getPartCategories(
        items.map((it: ReviseEstimateItem) => it.sparePartId),
      );

      // Brand + MPN for registered parts come from the spare part record.
      const revisePartIds = items
        .map((it: ReviseEstimateItem) => it.sparePartId)
        .filter((pid): pid is string => !!pid);
      const revisePartsById = new Map<string, SparePart>();
      if (revisePartIds.length > 0) {
        const parts = await Source.getRepository(SparePart).find({
          where: { id: In(revisePartIds) },
        });
        parts.forEach((p) => revisePartsById.set(p.id, p));
      }

      const billingItems = items.map((it: ReviseEstimateItem) => {
        const covered = hasContractContext
          ? coverageAllowsItem(reviseCoverage, {
              partCategory: it.sparePartId ? revisePartCategories.get(it.sparePartId) : null,
              partName: it.partName || it.description,
            })
          : false;
        const isFree = covered || !!it.isFree;
        const part = it.sparePartId ? revisePartsById.get(it.sparePartId) : undefined;
        const brand = part?.brand || it.customPartBrand || null;
        const mpn = part?.mpn || it.mpn || null;
        const baseDescription = it.partName || it.description || 'Spare Part';
        return {
          description: `${baseDescription}${brand ? ` — ${brand}` : ''}${
            mpn ? ` [MPN: ${mpn}]` : ''
          }`,
          quantity: it.quantity,
          unitPrice: isFree ? 0 : Number(it.unitPrice) || 0,
          isFree,
        };
      });

      // Travel-covered contexts never pay a visit charge, revisions included.
      const reviseEffectiveVisitCharge =
        hasContractContext && reviseCoverage.travel ? 0 : Number(visitChargeAmount) || 0;

      // Discount is capped by the whole estimate total, not per-part limits.
      const reviseItemsTotal = billingItems.reduce(
        (sum, it) => sum + (it.isFree ? 0 : it.quantity * it.unitPrice),
        0,
      );
      const reviseGrandTotal =
        reviseItemsTotal +
        (visitChargeMethod === 'ADDED_TO_ESTIMATE' ? reviseEffectiveVisitCharge : 0);
      if (Number(discountAmount || 0) > reviseGrandTotal) {
        throw new AppError(
          `Discount of QAR ${discountAmount} exceeds the total estimate amount of QAR ${reviseGrandTotal}.`,
          400,
        );
      }

      // Update service ticket items in local db
      const ticketItemRepo = Source.getRepository(ServiceTicketItem);
      await ticketItemRepo.delete({ ticketId: ticket.id });

      const newTicketItems = items.map((it: ReviseEstimateItem) => {
        const part = it.sparePartId ? revisePartsById.get(it.sparePartId) : undefined;
        return ticketItemRepo.create({
          ticketId: ticket.id,
          itemSource: it.itemSource || ServiceItemSource.SPARE_PART,
          sparePartId: it.sparePartId || null,
          sku: it.sku || null,
          partName: it.partName || it.description || 'Spare Part',
          partBrand: part?.brand || it.customPartBrand || null,
          mpn: part?.mpn || it.mpn || null,
          quantity: it.quantity,
          unitPrice: Number(it.unitPrice) || 0,
          totalPrice: (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0),
          isFree: !!it.isFree,
        });
      });
      await ticketItemRepo.save(newTicketItems);

      // Update ticket fields
      ticket.status = ServiceTicketStatus.WAITING_FINANCE_APPROVAL;
      ticket.visitChargeAmount = reviseEffectiveVisitCharge;
      ticket.visitChargeMethod = visitChargeMethod || null;
      ticket.discountAmount = Number(discountAmount) || 0;
      await ticketRepo.save(ticket);

      // Log activity
      await this.logActivity(
        ticket.id,
        'ESTIMATE_REVISED',
        `Estimate revised by technician. Revision number: ${newRevision.revisionNumber}. Reason: ${technicianNoteToFinance}`,
        userId,
      );

      const billingPayload = {
        items: billingItems,
        visitChargeAmount: reviseEffectiveVisitCharge,
        visitChargeMethod: visitChargeMethod || null,
        discountAmount: Number(discountAmount) || 0,
        technicianNoteToFinance,
      };

      const reviseRes = await axios.patch(
        `${BILLING_SERVICE_URL}/invoices/${ticket.serviceQuotationId}/revise-estimate`,
        billingPayload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      return res.status(200).json({
        success: true,
        data: {
          ticket,
          invoice: reviseRes.data.data,
          revision: newRevision,
        },
        message: 'Estimate revised and submitted to finance successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  getRevisions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const revisionRepo = Source.getRepository(ServiceEstimateRevision);
      const revisions = await revisionRepo.find({
        where: { ticketId: String(id) },
        order: { submittedAt: 'DESC' },
      });
      return res.status(200).json({
        success: true,
        data: revisions,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Internal endpoint called by Billing service to aggregate COGS (spare parts consumed)
   * and labour cost from CUSTOMER_APPROVED or COMPLETED service estimates for a period.
   * Secured via x-internal-service header validated by authMiddleware.
   */
  getCogsReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { branchIds, dateFrom, dateTo } = req.query as Record<string, string>;
      const db = Source;

      let branchClause = '';
      if (branchIds) {
        const ids = branchIds.split(',').filter((b) => /^[0-9a-f-]{36}$/i.test(b));
        if (ids.length === 1) branchClause = `AND t."branchId" = '${ids[0]}'`;
        else if (ids.length > 1)
          branchClause = `AND t."branchId" IN (${ids.map((b) => `'${b}'`).join(',')})`;
      }

      const dateFromEstClause = dateFrom ? `AND e.created_at::date >= '${dateFrom}'` : '';
      const dateToEstClause = dateTo ? `AND e.created_at::date <= '${dateTo}'` : '';

      const dateFromRevClause = dateFrom ? `AND r.created_at::date >= '${dateFrom}'` : '';
      const dateToRevClause = dateTo ? `AND r.created_at::date <= '${dateTo}'` : '';

      // Spare parts from CUSTOMER_APPROVED/COMPLETED estimates (via estimate items)
      const cogsRows = await db.query<{ amount: string }[]>(`
        SELECT COALESCE(SUM(sei."totalPrice"), 0) AS amount
        FROM service_estimate_items sei
        JOIN service_estimates e ON sei."estimateId" = e.id
        JOIN service_tickets t ON e."ticketId" = t.id
        WHERE sei."itemSource" = 'SPARE_PART'
          AND sei."isApproved" = true
          AND e.status IN ('CUSTOMER_APPROVED')
          AND t.status IN ('CUSTOMER_APPROVED', 'COMPLETED')
          ${branchClause}
          ${dateFromEstClause}
          ${dateToEstClause}
      `);

      // Spare parts from estimate revisions (latest approved revision)
      const cogsRevRows = await db.query<{ amount: string }[]>(`
        SELECT COALESCE(SUM(sei."totalPrice"), 0) AS amount
        FROM service_estimate_items sei
        JOIN service_estimate_revisions r ON sei."revisionId" = r.id
        JOIN service_tickets t ON r.ticket_id = t.id
        WHERE sei."itemSource" = 'SPARE_PART'
          AND sei."isApproved" = true
          AND t.status IN ('CUSTOMER_APPROVED', 'COMPLETED')
          ${branchClause}
          ${dateFromRevClause}
          ${dateToRevClause}
      `);

      // Labour cost from estimates
      const labourRows = await db.query<{ amount: string }[]>(`
        SELECT COALESCE(SUM(e."labourCost"), 0) AS amount
        FROM service_estimates e
        JOIN service_tickets t ON e."ticketId" = t.id
        WHERE e.status = 'CUSTOMER_APPROVED'
          AND t.status IN ('CUSTOMER_APPROVED', 'COMPLETED')
          ${branchClause}
          ${dateFromEstClause}
          ${dateToEstClause}
      `);

      // Labour from revisions
      const labourRevRows = await db.query<{ amount: string }[]>(`
        SELECT COALESCE(SUM(r."labourCost"), 0) AS amount
        FROM service_estimate_revisions r
        JOIN service_tickets t ON r.ticket_id = t.id
        WHERE t.status IN ('CUSTOMER_APPROVED', 'COMPLETED')
          ${branchClause}
          ${dateFromRevClause}
          ${dateToRevClause}
      `);

      const cogsAmount = Number(cogsRows[0]?.amount ?? 0) + Number(cogsRevRows[0]?.amount ?? 0);
      const labourAmount =
        Number(labourRows[0]?.amount ?? 0) + Number(labourRevRows[0]?.amount ?? 0);

      return res.json({ success: true, cogsAmount, labourAmount });
    } catch (error) {
      next(error);
    }
  };

  // Same population/query shape as getCogsReport above (spare parts consumed +
  // labour from CUSTOMER_APPROVED/COMPLETED tickets), but grouped by the
  // ticket's productId instead of summed branch-wide — used by billing_service's
  // Segmented P&L to attribute service/labour cost to the specific machine a
  // Rent/Lease contract has allocated, not just the branch total.
  getCogsReportByProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { productIds, dateFrom, dateTo } = req.query as Record<string, string>;
      const db = Source;

      const ids = (productIds ?? '')
        .split(',')
        .map((id) => id.trim())
        .filter((id) => /^[0-9a-f-]{36}$/i.test(id));
      if (ids.length === 0) {
        return res.json({ success: true, data: [] });
      }

      const dateFromEstClause = dateFrom ? `AND e.created_at::date >= '${dateFrom}'` : '';
      const dateToEstClause = dateTo ? `AND e.created_at::date <= '${dateTo}'` : '';
      const dateFromRevClause = dateFrom ? `AND r.created_at::date >= '${dateFrom}'` : '';
      const dateToRevClause = dateTo ? `AND r.created_at::date <= '${dateTo}'` : '';

      const rows = await db.query<{ productId: string; amount: string }[]>(
        `
        SELECT combined."productId", COALESCE(SUM(combined.amount), 0) AS amount FROM (
          SELECT t."productId" AS "productId", sei."totalPrice" AS amount
          FROM service_estimate_items sei
          JOIN service_estimates e ON sei."estimateId" = e.id
          JOIN service_tickets t ON e."ticketId" = t.id
          WHERE sei."itemSource" = 'SPARE_PART'
            AND sei."isApproved" = true
            AND e.status IN ('CUSTOMER_APPROVED')
            AND t.status IN ('CUSTOMER_APPROVED', 'COMPLETED')
            AND t."productId" = ANY($1::uuid[])
            ${dateFromEstClause}
            ${dateToEstClause}
          UNION ALL
          SELECT t."productId" AS "productId", sei."totalPrice" AS amount
          FROM service_estimate_items sei
          JOIN service_estimate_revisions r ON sei."revisionId" = r.id
          JOIN service_tickets t ON r.ticket_id = t.id
          WHERE sei."itemSource" = 'SPARE_PART'
            AND sei."isApproved" = true
            AND t.status IN ('CUSTOMER_APPROVED', 'COMPLETED')
            AND t."productId" = ANY($1::uuid[])
            ${dateFromRevClause}
            ${dateToRevClause}
          UNION ALL
          SELECT t."productId" AS "productId", e."labourCost" AS amount
          FROM service_estimates e
          JOIN service_tickets t ON e."ticketId" = t.id
          WHERE e.status = 'CUSTOMER_APPROVED'
            AND t.status IN ('CUSTOMER_APPROVED', 'COMPLETED')
            AND t."productId" = ANY($1::uuid[])
            ${dateFromEstClause}
            ${dateToEstClause}
          UNION ALL
          SELECT t."productId" AS "productId", r."labourCost" AS amount
          FROM service_estimate_revisions r
          JOIN service_tickets t ON r.ticket_id = t.id
          WHERE t.status IN ('CUSTOMER_APPROVED', 'COMPLETED')
            AND t."productId" = ANY($1::uuid[])
            ${dateFromRevClause}
            ${dateToRevClause}
        ) combined
        GROUP BY combined."productId"
        `,
        [ids],
      );

      return res.json({
        success: true,
        data: rows.map((r) => ({ productId: r.productId, amount: Number(r.amount) })),
      });
    } catch (error) {
      next(error);
    }
  };
}
