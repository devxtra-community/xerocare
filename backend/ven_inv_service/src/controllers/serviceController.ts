// Trigger reload to pick up new .env variables
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/appError';
import { Source } from '../config/db';
import { IsNull, FindOptionsWhere } from 'typeorm';
import {
  generateServiceQuotationPdf,
  generateServiceCompletionBillPdf,
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
import { Product } from '../entities/productEntity';
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
import { ServiceContract, ServiceContractType } from '../entities/serviceContractEntity';
import { ServicePartUsageLog } from '../entities/servicePartUsageLogEntity';
import { NotificationPublisher } from '../events/publisher/notificationPublisher';
import axios from 'axios';
import { sign } from 'jsonwebtoken';
import { logger } from '../config/logger';
import { BILLING_ENDPOINTS, CRM_ENDPOINTS } from '../constants/serviceUrls';
import {
  getFinanceEmployeesByBranch,
  getCustomerName,
  getHelpDeskEmployeesByBranch,
} from '../helpers/serviceHelpers';

const ACCESS_SECRET = process.env.ACCESS_SECRET || 'secret';
const CRM_SERVICE_URL = process.env.CRM_SERVICE_URL || 'http://localhost:3005';
const BILLING_SERVICE_URL = process.env.BILLING_SERVICE_URL || 'http://localhost:3004';
const EMPLOYEE_SERVICE_URL = process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:3002';

interface ReviseEstimateItem {
  itemSource?: ServiceItemSource;
  sparePartId?: string;
  sku?: string;
  partName?: string;
  description?: string;
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
   * Automated Context and Job Type Identification.
   */
  private async determineServiceContextAndJobType(serialNumber: string): Promise<{
    serviceContext: ServiceContext;
    contractReferenceId: string | null;
    productId: string | null;
    jobType: JobType;
    track: 'A' | 'B';
    linkedInvoiceId: string | null;
  }> {
    let serviceContext = ServiceContext.CHARGEABLE;
    let contractReferenceId: string | null = null;
    let productId: string | null = null;
    let jobType = JobType.ONSITE;
    let track: 'A' | 'B' = 'B';
    let linkedInvoiceId: string | null = null;

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
          const saleDate = new Date(saleInvoice.effectiveFrom || saleInvoice.createdAt);
          const warrantyStr = saleInvoice.warranty || product.warranty || '12';
          const warrantyMonths = parseInt(warrantyStr, 10) || 12;
          const warrantyEndDate = new Date(saleDate);
          warrantyEndDate.setMonth(warrantyEndDate.getMonth() + warrantyMonths);

          let copiesUsed = 0;
          if (latestAllocation) {
            copiesUsed =
              (latestAllocation.currentBwA4 || 0) +
              (latestAllocation.currentBwA3 || 0) * 2 +
              (latestAllocation.currentColorA4 || 0) +
              (latestAllocation.currentColorA3 || 0) * 2;
          } else if (product.meter_reading) {
            copiesUsed = product.meter_reading;
          }

          const warrantyMaxCopies = product.warranty_max_pages || 200000;
          const currentDate = new Date();
          if (currentDate <= warrantyEndDate && copiesUsed < warrantyMaxCopies) {
            serviceContext = ServiceContext.WARRANTY;
            track = 'A';
            linkedInvoiceId = saleInvoice.id;
            isSaleWarrantyActive = true;
          }
        }

        if (!isSaleWarrantyActive) {
          // Step 3 - Check if machine is on LEASE
          if (leaseInvoice) {
            const effectiveFrom = new Date(leaseInvoice.effectiveFrom);
            const leaseTenureMonths = Number(leaseInvoice.leaseTenureMonths) || 0;
            const warrantyEndDate = new Date(effectiveFrom);
            warrantyEndDate.setMonth(warrantyEndDate.getMonth() + leaseTenureMonths);

            let copiesUsed = 0;
            if (latestAllocation) {
              copiesUsed =
                (latestAllocation.currentBwA4 || 0) +
                (latestAllocation.currentBwA3 || 0) * 2 +
                (latestAllocation.currentColorA4 || 0) +
                (latestAllocation.currentColorA3 || 0) * 2;
            } else if (product.meter_reading) {
              copiesUsed = product.meter_reading;
            }

            const maxCopyLimit =
              Number(leaseInvoice.maxCopyLimit) || product.warranty_max_pages || 200000;
            const currentDate = new Date();
            if (currentDate <= warrantyEndDate && copiesUsed < maxCopyLimit) {
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
            const activeContract = await Source.getRepository(ServiceContract).findOne({
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

    return { serviceContext, contractReferenceId, productId, jobType, track, linkedInvoiceId };
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
      } = req.body;

      const {
        serviceContext,
        contractReferenceId,
        productId,
        jobType: finalJobType,
        track,
        linkedInvoiceId,
      } = await this.determineServiceContextAndJobType(serialNumber);

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

      const id = req.params.id as string;
      const ticketRepo = Source.getRepository(ServiceTicket);
      const ticket = await ticketRepo.findOne({ where: { id: String(id) } });
      if (!ticket) throw new Error('Ticket not found');

      ticket.assignedTechnicianId = assignedTechnicianId;
      if (scheduledVisitDate) {
        ticket.scheduledVisitDate = new Date(scheduledVisitDate);
      }
      ticket.status = ServiceTicketStatus.ASSIGNED;
      await ticketRepo.save(ticket);

      await this.logActivity(
        ticket.id,
        'ASSIGNMENT',
        `Technician assigned to ticket. Status updated to ASSIGNED.`,
        req.user?.userId,
      );

      await NotificationPublisher.publishInAppRequest({
        recipientId: assignedTechnicianId,
        title: 'New Service Job Assigned',
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

      ticket.diagnosisStartedAt = new Date();
      await ticketRepo.save(ticket);

      await this.logActivity(
        ticket.id,
        'DIAGNOSIS_STARTED',
        `Technician started diagnosis.`,
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
        discountAmount,
        technicianNoteToFinance,
      } = req.body;
      const id = req.params.id as string;
      const ticketRepo = Source.getRepository(ServiceTicket);
      const ticket = await ticketRepo.findOne({ where: { id: String(id) } });
      if (!ticket) throw new Error('Ticket not found');

      const isFreeContext = ticket.track === 'A';

      // Validate discount <= total maxDiscountableAmount across parts
      if (!isFreeContext) {
        let totalMaxDiscount = 0;
        const sparePartRepo = Source.getRepository(SparePart);
        if (items && Array.isArray(items)) {
          for (const itemData of items) {
            if (itemData.itemSource === ServiceItemSource.SPARE_PART && itemData.sparePartId) {
              const part = await sparePartRepo.findOne({
                where: { id: String(itemData.sparePartId) },
              });
              if (part) {
                totalMaxDiscount +=
                  (Number(part.maxDiscountableAmount) || 0) * (itemData.quantity || 1);
              }
            }
          }
        }

        if (Number(discountAmount || 0) > totalMaxDiscount) {
          throw new AppError(
            `Discount of QAR ${discountAmount} exceeds the maximum allowed discount of QAR ${totalMaxDiscount} for the selected parts.`,
            400,
          );
        }
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
        ticket.visitChargeAmount = Number(visitChargeAmount) || 0;
        ticket.visitChargeMethod = visitChargeMethod || null;
      }

      await ticketRepo.save(ticket);

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

      if (items && Array.isArray(items)) {
        const sparePartRepo = Source.getRepository(SparePart);
        for (const itemData of items) {
          let partName = itemData.partName;
          let sku = itemData.sku || null;
          let barcodeId = itemData.barcodeId || null;
          let unitPrice = Number(itemData.unitPrice) || 0;

          if (itemData.itemSource === ServiceItemSource.SPARE_PART && itemData.sparePartId) {
            const part = await sparePartRepo.findOne({
              where: { id: String(itemData.sparePartId) },
            });
            if (part) {
              partName = part.part_name;
              sku = part.sku;
              barcodeId = part.barcode_id || null;
              unitPrice = Number(part.base_price) || 0;

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

          const isItemFree = isFreeContext ? true : !!itemData.isFree;
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

      // For Track A, automatically generate/send FOC Estimate to billing service
      if (isFreeContext) {
        const billingItems = ticketItems.map((item) => ({
          itemSource: item.itemSource,
          productId: item.sparePartId || null,
          sparePartId: item.sparePartId || null,
          partName: item.partName,
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: 0,
          totalPrice: 0,
          isFree: true,
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

      if (!isFreeContext && ((ticketItems && ticketItems.length > 0) || finalLabourCost > 0)) {
        const estimateRepo = Source.getRepository(ServiceEstimate);
        const estItemRepo = Source.getRepository(ServiceEstimateItem);

        let totalCost = finalLabourCost;
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

        estimate.totalCost = totalCost;
        estimate.items = estItemsToSave;
        await estimateRepo.save(estimate);

        await this.logActivity(
          ticket.id,
          'ESTIMATE_CREATED',
          `Estimate Version 1 created in WAITING_FINANCE_APPROVAL status. Total: ${totalCost}`,
          req.user?.userId,
        );

        // Generate billing invoice for Track B
        const billingItems = ticketItems.map((item) => ({
          description: item.partName,
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
              visitChargeAmount: Number(visitChargeAmount) || 0,
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

          if (it.sparePartId) {
            const part = await sparePartRepo.findOne({ where: { id: String(it.sparePartId) } });
            if (part) {
              partName = part.part_name;
              sku = part.sku;
              if (basePrice === 0) {
                basePrice = Number(part.base_price) || 0;
              }
            }
          }

          let isItemFree = !!it.isFree;
          if (
            ticket.serviceContext === ServiceContext.RENT ||
            ticket.serviceContext === ServiceContext.WARRANTY ||
            ticket.serviceContext === ServiceContext.LEASE_UNDER_WARRANTY ||
            ticket.serviceContext === ServiceContext.FSMA
          ) {
            isItemFree = true;
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

      estimate.status = ServiceEstimateStatus.REJECTED;
      await estimateRepo.save(estimate);

      const ticketRepo = Source.getRepository(ServiceTicket);
      const ticket = await ticketRepo.findOne({ where: { id: estimate.ticketId } });
      if (ticket) {
        ticket.status = ServiceTicketStatus.CUSTOMER_REJECTED;
        await ticketRepo.save(ticket);

        await this.logActivity(
          ticket.id,
          'ESTIMATE_CUSTOMER_REJECTED',
          `Estimate rejected by Customer.`,
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
      if (items && Array.isArray(items)) {
        for (const it of items) {
          let partName = it.partName || '';
          let sku = it.sku || '';
          let basePrice = Number(it.unitPrice) || 0;

          if (it.sparePartId) {
            const part = await sparePartRepo.findOne({ where: { id: String(it.sparePartId) } });
            if (part) {
              partName = part.part_name;
              sku = part.sku;
              if (basePrice === 0) {
                basePrice = Number(part.base_price) || 0;
              }
            }
          }

          const isItemFree = ticket.serviceContext === ServiceContext.AMC ? true : !!it.isFree;
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

      ticket.repairCompletedAt = new Date();
      if (ticket.repairStartedAt) {
        ticket.repairDuration = Math.round(
          (ticket.repairCompletedAt.getTime() - ticket.repairStartedAt.getTime()) / 60000,
        );
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

      let totalPartsCost = 0;
      let totalConsumablesCost = 0;

      const itemsToInspect = estimate ? estimate.items : ticket.items;
      const usageLogRepo = Source.getRepository(ServicePartUsageLog);

      for (const item of itemsToInspect) {
        let purchaseCost = 0;
        if (item.sparePartId) {
          const partDetails = await sparePartRepo.findOne({
            where: { id: String(item.sparePartId) },
          });
          if (partDetails) {
            purchaseCost = Number(partDetails.purchase_price) || 0;
            const itemCost = purchaseCost * item.quantity;
            if (this.isConsumable(partDetails.part_name, partDetails.sku)) {
              totalConsumablesCost += itemCost;
            } else {
              totalPartsCost += itemCost;
            }

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
        historyRecord.totalPartsSpend =
          Number(historyRecord.totalPartsSpend) + totalPartsCost + totalConsumablesCost;
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
          totalPartsSpend: totalPartsCost + totalConsumablesCost,
          totalLabourSpend: labourCost,
          totalLifetimeCost: totalPartsCost + totalConsumablesCost + labourCost,
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

      const ticketRepo = Source.getRepository(ServiceTicket);
      let query = ticketRepo
        .createQueryBuilder('ticket')
        .leftJoinAndSelect('ticket.items', 'items');

      if (req.user.role !== 'ADMIN' && req.user.branchId) {
        query = query.where('ticket.branchId = :branchId', { branchId: req.user.branchId });
      }

      if (req.user.role === 'EMPLOYEE' && req.user.employeeJob === 'SERVICE_TECHNICIAN') {
        query = query.andWhere('ticket.assignedTechnicianId = :techId', {
          techId: req.user.userId,
        });
      }

      const tickets = await query.orderBy('ticket.created_at', 'DESC').getMany();

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
   * GET /service/customers/:customerId/history
   */
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
      const details = await this.determineServiceContextAndJobType(String(serialNumber));

      let activeContract = null;
      let coverage = { labour: false, consumables: false, travel: false };

      if (details.contractReferenceId) {
        activeContract = await Source.getRepository(ServiceContract).findOne({
          where: { id: details.contractReferenceId as string },
        });
        if (activeContract) {
          coverage = activeContract.coverageRules;
        }
      } else if (
        details.serviceContext === ServiceContext.RENT ||
        details.serviceContext === ServiceContext.WARRANTY ||
        details.serviceContext === ServiceContext.LEASE_UNDER_WARRANTY
      ) {
        coverage = { labour: true, consumables: true, travel: true };
      }

      res.status(200).json({
        success: true,
        data: {
          serviceContext: details.serviceContext,
          contractReferenceId: details.contractReferenceId,
          productId: details.productId,
          coverage,
          contract: activeContract,
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
        totalRevenue += ticketRevenue;
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

      const isFreeContext = [
        ServiceContext.RENT,
        ServiceContext.WARRANTY,
        ServiceContext.LEASE_UNDER_WARRANTY,
        ServiceContext.FSMA,
        ServiceContext.SMA,
      ].includes(ticket.serviceContext);

      const items = ticket.items.map((it) => ({
        description: it.partName,
        quantity: it.quantity,
        unitPrice: isFreeContext ? 0 : Number(it.unitPrice) || 0,
        isFree: isFreeContext ? true : it.isFree,
      }));

      items.push({
        description: 'Labor Cost / Service Charge',
        quantity: 1,
        unitPrice: isFreeContext ? 0 : Number(laborCost) || 0,
        isFree: isFreeContext,
      });

      const billingPayload = {
        customerId: ticket.customerId,
        branchId: ticket.branchId,
        createdBy: ticket.createdBy,
        serviceTicketId: ticket.id,
        items,
        visitChargeAmount: Number(visitChargeAmount) || 0,
        visitChargeMethod: visitChargeMethod || null,
        discountAmount: Number(discountAmount) || 0,
        technicianNoteToFinance: technicianNoteToFinance || null,
        saleType: 'PRODUCT_SALE',
        status: isFreeContext ? 'CUSTOMER_ACCEPTED' : 'WAITING_FINANCE_APPROVAL',
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

      if (isFreeContext) {
        ticket.status = ServiceTicketStatus.CUSTOMER_APPROVED;
      } else {
        ticket.status = ServiceTicketStatus.WAITING_FINANCE_APPROVAL;
      }

      ticket.serviceQuotationId = quotation.id;
      ticket.visitChargeAmount = Number(visitChargeAmount) || 0;
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

      ticket.status = ServiceTicketStatus.CUSTOMER_APPROVED;

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
  customerReject = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const ticketRepo = Source.getRepository(ServiceTicket);
      const ticket = await ticketRepo.findOne({ where: { id: String(id) } });
      if (!ticket) throw new Error('Ticket not found');

      ticket.status = ServiceTicketStatus.CUSTOMER_REJECTED;
      await ticketRepo.save(ticket);

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
  createContract = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        customerId,
        productId,
        contractType,
        startDate,
        endDate,
        contractValue,
        coverageRules,
        status,
      } = req.body;
      const contractRepo = Source.getRepository(ServiceContract);
      const contract = contractRepo.create({
        customerId,
        productId,
        contractType,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        contractValue: Number(contractValue) || 0,
        coverageRules: coverageRules || { labour: true, consumables: true, travel: true },
        status: status || 'ACTIVE',
      });
      await contractRepo.save(contract);
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
      res.status(200).json({ success: true, data: contracts });
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
      if (!contract) throw new Error('Service Contract not found');
      res.status(200).json({ success: true, data: contract });
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
      const {
        customerId,
        productId,
        contractType,
        startDate,
        endDate,
        contractValue,
        coverageRules,
        status,
      } = req.body;
      const contractRepo = Source.getRepository(ServiceContract);
      const contract = await contractRepo.findOne({ where: { id: id as string } });
      if (!contract) throw new Error('Service Contract not found');

      if (customerId) contract.customerId = customerId;
      if (productId) contract.productId = productId;
      if (contractType) contract.contractType = contractType;
      if (startDate) contract.startDate = new Date(startDate);
      if (endDate) contract.endDate = new Date(endDate);
      if (contractValue !== undefined) contract.contractValue = Number(contractValue);
      if (coverageRules !== undefined) contract.coverageRules = coverageRules;
      if (status) contract.status = status;

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
      await contractRepo.remove(contract);
      res.status(200).json({ success: true, message: 'Service Contract deleted successfully' });
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

      const { default: PDFDocument } = await import('pdfkit');
      const doc = new PDFDocument({ margin: 50 });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=Service_Report_${ticket.ticketNumber}.pdf`,
      );

      doc.pipe(res);

      // Draw Professional Header
      doc.rect(0, 0, 612, 100).fill('#0f172a');
      doc.fillColor('#ffffff').fontSize(24).font('Helvetica-Bold').text('XEROCARE ERP', 50, 30);
      doc.fontSize(12).font('Helvetica').text('Official Service & Maintenance Report', 50, 60);

      // Reset color
      doc.fillColor('#334155');

      // Ticket Summary Box
      doc.font('Helvetica-Bold').fontSize(14).text('Ticket Summary', 50, 120);
      doc.moveTo(50, 140).lineTo(562, 140).stroke('#cbd5e1');

      doc.font('Helvetica-Bold').fontSize(10);
      doc.text('Ticket Number:', 50, 155);
      doc.text('Service Context:', 50, 175);
      doc.text('Customer ID:', 50, 195);
      doc.text('Serial Number:', 50, 215);

      doc.text('Technician:', 320, 155);
      doc.text('Status:', 320, 175);
      doc.text('Scheduled Visit:', 320, 195);
      doc.text('Completed At:', 320, 215);

      doc.font('Helvetica');
      doc.text(ticket.ticketNumber || '', 150, 155);
      doc.text(ticket.serviceContext || '', 150, 175);
      doc.text(ticket.customerId || 'N/A', 150, 195);
      doc.text(ticket.serialNumber || '', 150, 215);

      doc.text(ticket.assignedTechnicianId || 'Unassigned', 420, 155);
      doc.text(ticket.status || '', 420, 175);
      doc.text(
        ticket.scheduledVisitDate
          ? new Date(ticket.scheduledVisitDate).toLocaleDateString()
          : 'N/A',
        420,
        195,
      );
      doc.text(
        ticket.completedAt ? new Date(ticket.completedAt).toLocaleDateString() : 'N/A',
        420,
        215,
      );

      // Diagnosis & Resolution Box
      doc.font('Helvetica-Bold').fontSize(14).text('Diagnosis & Work Details', 50, 250);
      doc.moveTo(50, 270).lineTo(562, 270).stroke('#cbd5e1');

      doc.font('Helvetica-Bold').fontSize(10);
      doc.text('Problem Found:', 50, 285);
      doc
        .font('Helvetica')
        .text(ticket.problemFound || report?.workPerformed || 'N/A', 150, 285, { width: 400 });

      doc.font('Helvetica-Bold').text('Root Cause:', 50, 315);
      doc.font('Helvetica').text(ticket.rootCause || 'N/A', 150, 315, { width: 400 });

      doc.font('Helvetica-Bold').text('Resolution/Work:', 50, 345);
      doc
        .font('Helvetica')
        .text(report?.resolutionDetails || ticket.completionNotes || 'N/A', 150, 345, {
          width: 400,
        });

      doc.font('Helvetica-Bold').text('Meter Reading:', 50, 375);
      doc
        .font('Helvetica')
        .text(String(report?.meterReading || ticket.meterReadingAtService || 0), 150, 375);

      // Parts Consumed Table
      let currentY = 410;
      doc.font('Helvetica-Bold').fontSize(14).text('Parts & Consumables Consumed', 50, currentY);
      currentY += 20;
      doc.moveTo(50, currentY).lineTo(562, currentY).stroke('#cbd5e1');
      currentY += 15;

      doc.font('Helvetica-Bold').fontSize(10);
      doc.text('Part Name / SKU', 50, currentY);
      doc.text('Quantity', 320, currentY);
      doc.text('Unit Price', 420, currentY);
      doc.text('Total Price', 500, currentY);
      currentY += 15;

      doc.font('Helvetica');
      const itemsToRender = ticket.items || [];
      if (itemsToRender.length === 0) {
        doc.text('No parts or consumables were replaced.', 50, currentY);
        currentY += 20;
      } else {
        itemsToRender.forEach((item) => {
          doc.text(`${item.partName} (SKU: ${item.sku || 'N/A'})`, 50, currentY, { width: 250 });
          doc.text(String(item.quantity), 320, currentY);
          doc.text(`QAR ${Number(item.unitPrice).toFixed(2)}`, 420, currentY);
          doc.text(`QAR ${Number(item.totalPrice).toFixed(2)}`, 500, currentY);
          currentY += 20;
        });
      }

      currentY += 10;
      // Signatures & Remarks Box
      doc.font('Helvetica-Bold').fontSize(14).text('Signatures & Remarks', 50, currentY);
      currentY += 20;
      doc.moveTo(50, currentY).lineTo(562, currentY).stroke('#cbd5e1');
      currentY += 15;

      doc.font('Helvetica-Bold').text('Customer Remarks:', 50, currentY);
      doc
        .font('Helvetica')
        .text(report?.customerRemarks || 'No remarks provided.', 50, currentY + 15, { width: 230 });

      doc.font('Helvetica-Bold').text('Technician Remarks:', 320, currentY);
      doc
        .font('Helvetica')
        .text(report?.technicianRemarks || 'No remarks provided.', 320, currentY + 15, {
          width: 230,
        });

      currentY += 80;

      doc.font('Helvetica-Bold').text('Customer Signature:', 50, currentY);
      if (report?.customerSignature) {
        doc.font('Helvetica').text('[Signed digitally]', 50, currentY + 15);
      } else {
        doc.font('Helvetica').text('___________________________', 50, currentY + 15);
      }

      doc.font('Helvetica-Bold').text('Technician Signature:', 320, currentY);
      if (report?.technicianSignature) {
        doc.font('Helvetica').text('[Signed digitally]', 320, currentY + 15);
      } else {
        doc.font('Helvetica').text('___________________________', 320, currentY + 15);
      }

      // Footer
      doc
        .fontSize(8)
        .fillColor('#64748b')
        .text('Xerocare ERP — Service Workflow Management. All rights reserved.', 50, 720, {
          align: 'center',
        });

      doc.end();
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

      res.status(200).json({
        success: true,
        data: {
          history: history || null,
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
      const ticket = await ticketRepo.findOne({ where: { id: String(id) } });
      if (!ticket) {
        return res.status(404).json({ success: false, message: 'Service ticket not found' });
      }

      if (ticket.status !== ServiceTicketStatus.COMPLETED) {
        return res.status(400).json({
          success: false,
          message: 'Completion bill is only available for completed tickets',
        });
      }

      // Fetch parts usage logs
      const usageLogRepo = Source.getRepository(ServicePartUsageLog);
      const usageLogs = await usageLogRepo.find({ where: { ticketId: ticket.id } });

      // Fetch customer details
      const customer = await this.fetchCustomerDetails(ticket.customerId);

      // Fetch branch details
      const branchRepo = Source.getRepository(Branch);
      const branch = await branchRepo.findOne({ where: { id: ticket.branchId } });

      // Fetch technician
      const technician = await this.fetchEmployeeDetails(ticket.assignedTechnicianId);

      const pdfBuffer = await generateServiceCompletionBillPdf(
        ticket,
        usageLogs,
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
      const ticket = await ticketRepo.findOne({ where: { id: String(id) } });
      if (!ticket) {
        return res.status(404).json({ success: false, message: 'Service ticket not found' });
      }

      if (ticket.status !== ServiceTicketStatus.COMPLETED) {
        return res.status(400).json({
          success: false,
          message: 'Service completion bill is only available for completed tickets',
        });
      }

      const usageLogRepo = Source.getRepository(ServicePartUsageLog);
      const usageLogs = await usageLogRepo.find({ where: { ticketId: ticket.id } });

      const customer = await this.fetchCustomerDetails(ticket.customerId);
      const branchRepo = Source.getRepository(Branch);
      const branch = await branchRepo.findOne({ where: { id: ticket.branchId } });
      const technician = await this.fetchEmployeeDetails(ticket.assignedTechnicianId);

      const pdfBuffer = await generateServiceCompletionBillPdf(
        ticket,
        usageLogs,
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

      // Validate discount <= total maxDiscountableAmount across parts
      let totalMaxDiscount = 0;
      const sparePartRepo = Source.getRepository(SparePart);
      for (const item of items) {
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

      // Update service ticket items in local db
      const ticketItemRepo = Source.getRepository(ServiceTicketItem);
      await ticketItemRepo.delete({ ticketId: ticket.id });

      const newTicketItems = items.map((it: ReviseEstimateItem) => {
        return ticketItemRepo.create({
          ticketId: ticket.id,
          itemSource: it.itemSource || ServiceItemSource.SPARE_PART,
          sparePartId: it.sparePartId || null,
          sku: it.sku || null,
          partName: it.partName || it.description || 'Spare Part',
          quantity: it.quantity,
          unitPrice: Number(it.unitPrice) || 0,
          totalPrice: (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0),
          isFree: !!it.isFree,
        });
      });
      await ticketItemRepo.save(newTicketItems);

      // Update ticket fields
      ticket.status = ServiceTicketStatus.WAITING_FINANCE_APPROVAL;
      ticket.visitChargeAmount = Number(visitChargeAmount) || 0;
      ticket.visitChargeMethod = visitChargeMethod || null;
      await ticketRepo.save(ticket);

      // Log activity
      await this.logActivity(
        ticket.id,
        'ESTIMATE_REVISED',
        `Estimate revised by technician. Revision number: ${newRevision.revisionNumber}. Reason: ${technicianNoteToFinance}`,
        userId,
      );

      // Call billing service to update the invoice
      const isFreeContext = [
        ServiceContext.RENT,
        ServiceContext.WARRANTY,
        ServiceContext.LEASE_UNDER_WARRANTY,
        ServiceContext.FSMA,
        ServiceContext.SMA,
      ].includes(ticket.serviceContext);

      const billingItems = items.map((it: ReviseEstimateItem) => ({
        description: it.partName || it.description || 'Spare Part',
        quantity: it.quantity,
        unitPrice: isFreeContext ? 0 : Number(it.unitPrice) || 0,
        isFree: isFreeContext ? true : !!it.isFree,
      }));

      const billingPayload = {
        items: billingItems,
        visitChargeAmount: Number(visitChargeAmount) || 0,
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
}
