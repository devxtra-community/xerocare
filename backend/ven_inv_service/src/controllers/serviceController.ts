import { Request, Response, NextFunction } from 'express';
import { Source } from '../config/db';
import { IsNull, FindOptionsWhere } from 'typeorm';
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
import { MachineServiceHistory, PartUsed } from '../entities/machineServiceHistoryEntity';
import { ConsumableYieldHistory } from '../entities/consumableYieldHistoryEntity';
import { InventoryReservation, ReservationStatus } from '../entities/inventoryReservationEntity';
import { ServiceTicketActivity } from '../entities/serviceTicketActivityEntity';
import { ServiceContract, ServiceContractType } from '../entities/serviceContractEntity';
import { NotificationPublisher } from '../events/publisher/notificationPublisher';
import axios from 'axios';
import { logger } from '../config/logger';
import { BILLING_ENDPOINTS, CRM_ENDPOINTS } from '../constants/serviceUrls';

const CRM_SERVICE_URL = process.env.CRM_SERVICE_URL || 'http://localhost:3005';
const BILLING_SERVICE_URL = process.env.BILLING_SERVICE_URL || 'http://localhost:3004';
const EMPLOYEE_SERVICE_URL = process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:3002';

export class ServiceController {
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
      quantity,
      status: ReservationStatus.RESERVED,
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
      where: { ticketId, status: ReservationStatus.RESERVED },
    });
    for (const res of reservations) {
      const part = await sparePartRepo.findOne({ where: { id: res.sparePartId } });
      if (part) {
        part.quantity += res.quantity;
        part.reserved_quantity = Math.max(0, part.reserved_quantity - res.quantity);
        await sparePartRepo.save(part);
      }
      res.status = ReservationStatus.RELEASED;
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
      where: { ticketId, status: ReservationStatus.RESERVED },
    });
    for (const res of reservations) {
      const part = await sparePartRepo.findOne({ where: { id: res.sparePartId } });
      if (part) {
        part.reserved_quantity = Math.max(0, part.reserved_quantity - res.quantity);
        part.consumed_quantity += res.quantity;
        await sparePartRepo.save(part);
      }
      res.status = ReservationStatus.CONSUMED;
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
  }> {
    let serviceContext = ServiceContext.CHARGEABLE;
    let contractReferenceId: string | null = null;
    let productId: string | null = null;
    let jobType = JobType.ONSITE;

    const product = await Source.getRepository(Product).findOne({
      where: { serial_no: serialNumber },
    });
    if (product) {
      productId = product.id;

      const getActiveContract = async (prodId: string) => {
        const contract = await Source.getRepository(ServiceContract).findOne({
          where: {
            productId: prodId,
            status: 'ACTIVE',
          },
        });
        if (contract) {
          const now = new Date();
          if (now >= contract.startDate && now <= contract.endDate) {
            return contract;
          }
        }
        return null;
      };

      const mapContractTypeToServiceContext = (type: string) => {
        if (type === 'FSMA') return ServiceContext.FSMA;
        if (type === 'SMA') return ServiceContext.SMA;
        if (type === 'AMC') return ServiceContext.AMC;
        return ServiceContext.CHARGEABLE;
      };

      const ownership = product.ownership; // RENT, LEASE, SALE, EXTERNAL

      if (ownership === 'RENT') {
        serviceContext = ServiceContext.RENT;
      } else if (ownership === 'LEASE') {
        const now = new Date();
        const start = product.warranty_start_date
          ? new Date(product.warranty_start_date)
          : product.created_at
            ? new Date(product.created_at)
            : new Date(product.MFD);
        const end = product.warranty_end_date
          ? new Date(product.warranty_end_date)
          : new Date(start.getTime() + 365 * 24 * 60 * 60 * 1000);
        const maxPages = product.warranty_max_pages || 200000;
        const currentPages = product.meter_reading || 0;
        const isLeaseWarrantyActive = now <= end && currentPages <= maxPages;

        if (isLeaseWarrantyActive) {
          serviceContext = ServiceContext.LEASE_UNDER_WARRANTY;
        } else {
          const activeContract = await getActiveContract(product.id);
          if (activeContract) {
            serviceContext = mapContractTypeToServiceContext(activeContract.contractType);
            contractReferenceId = activeContract.id;
          } else {
            serviceContext = ServiceContext.CHARGEABLE;
          }
        }
      } else if (ownership === 'SALE') {
        const now = new Date();
        const start = product.warranty_start_date
          ? new Date(product.warranty_start_date)
          : product.created_at
            ? new Date(product.created_at)
            : new Date(product.MFD);
        const end = product.warranty_end_date
          ? new Date(product.warranty_end_date)
          : new Date(start.getTime() + 365 * 24 * 60 * 60 * 1000);
        const maxPages = product.warranty_max_pages || 200000;
        const currentPages = product.meter_reading || 0;
        const isSaleWarrantyActive = now <= end && currentPages <= maxPages;

        if (isSaleWarrantyActive) {
          serviceContext = ServiceContext.WARRANTY;
        } else {
          const activeContract = await getActiveContract(product.id);
          if (activeContract) {
            serviceContext = mapContractTypeToServiceContext(activeContract.contractType);
            contractReferenceId = activeContract.id;
          } else {
            serviceContext = ServiceContext.CHARGEABLE;
          }
        }
      } else if (ownership === 'EXTERNAL') {
        const activeContract = await getActiveContract(product.id);
        if (activeContract) {
          serviceContext = mapContractTypeToServiceContext(activeContract.contractType);
          contractReferenceId = activeContract.id;
        } else {
          serviceContext = ServiceContext.CHARGEABLE;
        }
      }
    } else {
      serviceContext = ServiceContext.CHARGEABLE; // Fallback context if no product
    }

    const freeContexts = [
      ServiceContext.RENT,
      ServiceContext.WARRANTY,
      ServiceContext.LEASE_UNDER_WARRANTY,
      ServiceContext.FSMA,
      ServiceContext.SMA,
    ];
    if (freeContexts.includes(serviceContext)) {
      jobType = JobType.ONSITE;
    }

    return { serviceContext, contractReferenceId, productId, jobType };
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
      } = req.body;

      const {
        serviceContext,
        contractReferenceId,
        productId,
        jobType: finalJobType,
      } = await this.determineServiceContextAndJobType(serialNumber);

      const ticketRepo = Source.getRepository(ServiceTicket);
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const count = await ticketRepo.count();
      const ticketNumber = `ST-${year}${month}-${String(count + 1).padStart(4, '0')}`;

      const freeContexts = [
        ServiceContext.RENT,
        ServiceContext.WARRANTY,
        ServiceContext.LEASE_UNDER_WARRANTY,
        ServiceContext.FSMA,
        ServiceContext.SMA,
      ];
      const status = freeContexts.includes(serviceContext)
        ? ServiceTicketStatus.FREE_SERVICE
        : ServiceTicketStatus.OPEN;

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
      });

      await ticketRepo.save(ticket);
      await this.logActivity(
        ticket.id,
        'CREATION',
        `Ticket ${ticket.ticketNumber} created under context ${ticket.serviceContext}`,
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
      const { problemFound, rootCause, technicianNotes, meterReading, items } = req.body;
      const id = req.params.id as string;
      const ticketRepo = Source.getRepository(ServiceTicket);
      const ticket = await ticketRepo.findOne({ where: { id: String(id) } });
      if (!ticket) throw new Error('Ticket not found');

      ticket.diagnosisCompletedAt = new Date();
      if (ticket.diagnosisStartedAt) {
        ticket.diagnosisDuration = Math.round(
          (ticket.diagnosisCompletedAt.getTime() - ticket.diagnosisStartedAt.getTime()) / 60000,
        );
      }
      ticket.status = ServiceTicketStatus.DIAGNOSED;
      ticket.diagnosisNotes = technicianNotes;
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

      // Enforce contexts
      const freeContexts = [
        ServiceContext.RENT,
        ServiceContext.WARRANTY,
        ServiceContext.LEASE_UNDER_WARRANTY,
        ServiceContext.FSMA,
        ServiceContext.SMA,
      ];
      const isFreeContext = freeContexts.includes(ticket.serviceContext);

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

      // If AMC or Chargeable workflow with parts, automatically generate a DRAFT Estimate
      if (!isFreeContext && items && items.length > 0) {
        const estimateRepo = Source.getRepository(ServiceEstimate);
        const estItemRepo = Source.getRepository(ServiceEstimateItem);

        const labourCost = 0;
        let totalCost = labourCost;
        const estItemsToSave: ServiceEstimateItem[] = [];

        const estimate = estimateRepo.create({
          ticketId: ticket.id,
          labourCost,
          totalCost: 0,
          status: ServiceEstimateStatus.DRAFT,
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
          `Draft Estimate Version 1 automatically created. Total: ${totalCost}`,
          req.user?.userId,
        );
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
        await ticketRepo.save(ticket);
      }

      await this.logActivity(
        id,
        'ESTIMATE_SUBMITTED',
        `Estimate submitted for internal finance approval.`,
        req.user?.userId,
      );

      try {
        const empRes = await axios.get(`${EMPLOYEE_SERVICE_URL}/employee?job=FINANCE`);
        const financeUsers = empRes.data.data || [];
        for (const fUser of financeUsers) {
          await NotificationPublisher.publishInAppRequest({
            recipientId: fUser.id,
            title: 'Finance Approval Required',
            message: `Service Estimate for ticket ${ticket?.ticketNumber} is waiting finance approval.`,
            type: 'TASK',
            referenceId: estimate.id,
            referenceType: 'QUOTATION',
          });
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

      await this.logActivity(
        String(ticketId),
        'ESTIMATE_REVISION_CREATED',
        `Estimate revision Version ${version} created for additional work. Waiting approvals.`,
        req.user?.userId,
      );

      try {
        const empRes = await axios.get(`${EMPLOYEE_SERVICE_URL}/employee?job=FINANCE`);
        const financeUsers = empRes.data.data || [];
        for (const fUser of financeUsers) {
          await NotificationPublisher.publishInAppRequest({
            recipientId: fUser.id,
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

      const estimateRepo = Source.getRepository(ServiceEstimate);
      const activeEstimate = await estimateRepo.findOne({ where: { id: revision.estimateId } });
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

      const partsUsedList: PartUsed[] = [];
      let totalPartsCost = 0;
      let totalConsumablesCost = 0;
      let customerCharge = 0;

      const itemsToInspect = estimate ? estimate.items : ticket.items;

      for (const item of itemsToInspect) {
        const isItemFree = item.isFree;
        const priceCharged = Number(item.totalPrice) || 0;

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
          }
        }

        partsUsedList.push({
          partName: item.partName || '',
          sku: item.sku || '',
          quantity: item.quantity || 0,
          unitPrice: Number(item.unitPrice) || 0,
          isFree: isItemFree,
        });

        customerCharge += priceCharged;
      }

      const labourCost = estimate ? Number(estimate.labourCost) : 0;
      customerCharge += labourCost;

      const totalCost = totalPartsCost + totalConsumablesCost + labourCost;

      const historyRepo = Source.getRepository(MachineServiceHistory);
      const historyRecord = historyRepo.create({
        productId: ticket.productId,
        serialNumber: ticket.serialNumber,
        ticketId: ticket.id,
        serviceDate: new Date(),
        serviceContext: ticket.serviceContext,
        meterReading: meterReading || 0,
        partsUsed: partsUsedList,
        totalCost,
        customerCharge,
      });
      await historyRepo.save(historyRecord);

      // Consumable Yield / Toner yield logic
      const yieldRepo = Source.getRepository(ConsumableYieldHistory);
      for (const item of itemsToInspect) {
        if (item.sku && this.isConsumable(item.partName, item.sku)) {
          const activeYield = await yieldRepo.findOne({
            where: {
              serialNumber: ticket.serialNumber,
              tonerSku: item.sku,
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
          }

          const newYield = yieldRepo.create({
            productId: ticket.productId,
            serialNumber: ticket.serialNumber,
            tonerSku: item.sku,
            installedDate: new Date(),
            installedMeterReading: meterReading || 0,
            ticketId: ticket.id,
          });
          await yieldRepo.save(newYield);
        }
      }

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

      if (req.user.employeeJob === 'SERVICE_TECHNICIAN') {
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
      const histories = await historyRepo.find({ where: { serialNumber: String(serialNumber) } });

      let totalPartsCost = 0;
      let totalConsumablesCost = 0;
      let totalLabourCost = 0;

      const sparePartRepo = Source.getRepository(SparePart);

      for (const hist of histories) {
        const partsUsed = hist.partsUsed || [];
        let histPartsCost = 0;
        let histConsumablesCost = 0;

        for (const pu of partsUsed) {
          if (pu.sku) {
            const part = await sparePartRepo.findOne({ where: { sku: pu.sku } });
            if (part) {
              const itemCost = (Number(part.purchase_price) || 0) * (pu.quantity || 1);
              if (this.isConsumable(part.part_name, part.sku)) {
                histConsumablesCost += itemCost;
              } else {
                histPartsCost += itemCost;
              }
            }
          }
        }

        totalPartsCost += histPartsCost;
        totalConsumablesCost += histConsumablesCost;

        const histLabour = Math.max(
          0,
          Number(hist.totalCost) - histPartsCost - histConsumablesCost,
        );
        totalLabourCost += histLabour;
      }

      const lifetimeCost = totalPartsCost + totalConsumablesCost + totalLabourCost;

      res.status(200).json({
        success: true,
        data: {
          totalTicketsCount: histories.length,
          totalPartsCost,
          totalConsumablesCost,
          totalLabourCost,
          lifetimeCost,
          history: histories,
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
      const historyRepo = Source.getRepository(MachineServiceHistory);

      let query = historyRepo.createQueryBuilder('history');

      if (branchId) {
        query = query.innerJoin(
          ServiceTicket,
          'ticket',
          'ticket.id = history.ticketId AND ticket.branchId = :branchId',
          { branchId },
        );
      }

      if (startDate) {
        query = query.andWhere('history.serviceDate >= :startDate', {
          startDate: new Date(startDate as string),
        });
      }

      if (endDate) {
        query = query.andWhere('history.serviceDate <= :endDate', {
          endDate: new Date(endDate as string),
        });
      }

      const histories = await query.getMany();

      let totalRevenue = 0;
      let totalPartsCost = 0;
      let totalConsumablesCost = 0;
      let totalLaborCost = 0;

      const sparePartRepo = Source.getRepository(SparePart);

      for (const hist of histories) {
        totalRevenue += Number(hist.customerCharge) || 0;

        const partsUsed = hist.partsUsed || [];
        let histPartsCost = 0;
        let histConsumablesCost = 0;

        for (const pu of partsUsed) {
          if (pu.sku) {
            const part = await sparePartRepo.findOne({ where: { sku: pu.sku } });
            if (part) {
              const itemCost = (Number(part.purchase_price) || 0) * (pu.quantity || 1);
              if (this.isConsumable(part.part_name, part.sku)) {
                histConsumablesCost += itemCost;
              } else {
                histPartsCost += itemCost;
              }
            }
          }
        }

        totalPartsCost += histPartsCost;
        totalConsumablesCost += histConsumablesCost;

        const histLabour = Math.max(
          0,
          Number(hist.totalCost) - histPartsCost - histConsumablesCost,
        );
        totalLaborCost += histLabour;
      }

      const netServiceMargin =
        totalRevenue - (totalPartsCost + totalConsumablesCost + totalLaborCost);

      res.status(200).json({
        success: true,
        data: {
          totalRevenue,
          totalPartsCost,
          totalConsumablesCost,
          totalLaborCost,
          netServiceMargin,
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
      const { laborCost } = req.body;
      const id = req.params.id as string;
      const ticketRepo = Source.getRepository(ServiceTicket);
      const ticket = await ticketRepo.findOne({
        where: { id: String(id) },
        relations: ['items'],
      });
      if (!ticket) throw new Error('Ticket not found');

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
        saleType: 'PRODUCT_SALE',
        status: isFreeContext ? 'CUSTOMER_ACCEPTED' : 'WAITING_FINANCE_APPROVAL',
      };

      const quoteRes = await axios.post(
        `${BILLING_SERVICE_URL}${BILLING_ENDPOINTS.SERVICE_QUOTATION}`,
        billingPayload,
      );
      const quotation = quoteRes.data.data;

      if (isFreeContext) {
        ticket.status = ServiceTicketStatus.CUSTOMER_APPROVED;
      } else {
        ticket.status = ServiceTicketStatus.WAITING_FINANCE_APPROVAL;
      }

      ticket.serviceQuotationId = quotation.id;
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
}
