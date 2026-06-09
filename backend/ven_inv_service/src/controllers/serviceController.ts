import { Request, Response, NextFunction } from 'express';
import { Source } from '../config/db';
import {
  ServiceTicket,
  ServiceTicketStatus,
  ServiceContext,
} from '../entities/serviceTicketEntity';
import { ServiceTicketItem, ServiceItemSource } from '../entities/serviceTicketItemEntity';
import { SparePart } from '../entities/sparePartEntity';
import { Branch } from '../entities/branchEntity';
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
      // Find branch manager
      const branchRepo = Source.getRepository(Branch);
      const branch = await branchRepo.findOne({ where: { id: branchId } });
      if (branch && branch.manager_id) {
        ids.push(branch.manager_id);
      }

      // We can also fetch the ADMIN ids from employee service, but as a fallback,
      // notifyAdmins field in rabbitMQ takes care of general admins. We will just return manager.
    } catch (err) {
      logger.error('Failed to get branch manager for notification:', err);
    }
    return ids;
  }

  /**
   * POST /service/tickets
   * Help Desk creates a ticket.
   */
  createTicket = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new Error('User not identified');

      const {
        customerId,
        leadId,
        productId,
        productBrand,
        productModel,
        productName,
        serialNumber,
        serviceContext,
        contractReferenceId,
        issueDescription,
        jobType,
        scheduledVisitDate,
      } = req.body;

      const ticketRepo = Source.getRepository(ServiceTicket);

      // Generate ST-YYYYMM-XXXX ticket number
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const count = await ticketRepo.count();
      const ticketNumber = `ST-${year}${month}-${String(count + 1).padStart(4, '0')}`;

      // Check lease warranty status if context indicates lease
      let calculatedContext = serviceContext;
      let calculatedContractRef = contractReferenceId;

      if (serviceContext === 'LEASE_UNDER_WARRANTY' || serviceContext === 'LEASE_EXPIRED') {
        try {
          const contractRes = await axios.get(
            `${BILLING_SERVICE_URL}${BILLING_ENDPOINTS.CONTRACT_BY_SERIAL.replace(':serialNumber', serialNumber)}`,
          );
          if (contractRes.data && contractRes.data.success && contractRes.data.data) {
            const { contract, allocation } = contractRes.data.data;
            calculatedContractRef = contract.id;

            // Date validation
            const start = new Date(contract.effectiveFrom);
            const tenureMonths = contract.leaseTenureMonths || 0;
            const expiryDate = new Date(start.setMonth(start.getMonth() + tenureMonths));
            const isTimeValid = new Date() <= expiryDate;

            // Copies validation
            const currentCopies =
              (allocation.currentBwA4 || 0) +
              (allocation.currentBwA3 || 0) +
              (allocation.currentColorA4 || 0) +
              (allocation.currentColorA3 || 0);
            const maxCopies = contract.maxCopyLimit || 0;
            const isCopyValid = currentCopies < maxCopies;

            if (isTimeValid && isCopyValid) {
              calculatedContext = ServiceContext.LEASE_UNDER_WARRANTY;
            } else {
              calculatedContext = ServiceContext.LEASE_EXPIRED;
            }
          }
        } catch (err) {
          logger.warn('Failed to query contract details for lease warranty check:', err);
        }
      }

      // Determine starting status
      const freeContexts = [
        ServiceContext.RENT,
        ServiceContext.LEASE_UNDER_WARRANTY,
        ServiceContext.FSMA,
        ServiceContext.SMA,
        ServiceContext.AMC,
      ];
      const status = freeContexts.includes(calculatedContext)
        ? ServiceTicketStatus.FREE_SERVICE
        : ServiceTicketStatus.OPEN;

      const branchId = req.user.branchId || req.body.branchId;
      if (!branchId) throw new Error('Branch ID is required');

      const ticket = ticketRepo.create({
        ticketNumber,
        customerId: customerId || null,
        leadId: leadId || null,
        productId: productId || null,
        productBrand,
        productModel,
        productName,
        serialNumber,
        serviceContext: calculatedContext,
        contractReferenceId: calculatedContractRef || null,
        issueDescription,
        jobType,
        status,
        scheduledVisitDate: scheduledVisitDate ? new Date(scheduledVisitDate) : null,
        createdBy: req.user.userId,
        branchId,
      });

      await ticketRepo.save(ticket);

      // Notify Branch Manager & Admin
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

      res.status(201).json({
        success: true,
        data: ticket,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /service/tickets/:id/assign
   * Help Desk assigns a technician.
   */
  assignTechnician = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { assignedTechnicianId, scheduledVisitDate } = req.body;
      if (!assignedTechnicianId) throw new Error('Technician ID is required');

      const id = req.params.id as string;
      const ticketRepo = Source.getRepository(ServiceTicket);
      const ticket = await ticketRepo.findOne({ where: { id } });
      if (!ticket) throw new Error('Ticket not found');

      ticket.assignedTechnicianId = assignedTechnicianId;
      if (scheduledVisitDate) {
        ticket.scheduledVisitDate = new Date(scheduledVisitDate);
      }
      ticket.status = ServiceTicketStatus.ASSIGNED;
      await ticketRepo.save(ticket);

      // Notify Technician
      await NotificationPublisher.publishInAppRequest({
        recipientId: assignedTechnicianId,
        title: 'New Service Job Assigned',
        message: `You have been assigned to service ticket ${ticket.ticketNumber}. Scheduled visit: ${ticket.scheduledVisitDate?.toLocaleDateString() || 'N/A'}.`,
        type: 'TASK',
        referenceId: ticket.id,
        referenceType: 'SERVICE',
      });

      res.status(200).json({
        success: true,
        data: ticket,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /service/tickets/:id/diagnose
   * Technician updates diagnosis notes and records required parts.
   */
  diagnoseTicket = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { diagnosisNotes, items } = req.body; // items: array of { itemSource, sparePartId, customPartName, customPartBrand, customPartDescription, partName, quantity, isFree }
      const id = req.params.id as string;
      const ticketRepo = Source.getRepository(ServiceTicket);
      const ticket = await ticketRepo.findOne({ where: { id } });
      if (!ticket) throw new Error('Ticket not found');

      ticket.diagnosisNotes = diagnosisNotes;
      ticket.status = ServiceTicketStatus.DIAGNOSED;

      // Save diagnosis items
      const itemRepo = Source.getRepository(ServiceTicketItem);
      const ticketItems: ServiceTicketItem[] = [];

      if (items && Array.isArray(items)) {
        for (const itemData of items) {
          let partName = itemData.partName;
          let sku = itemData.sku || null;
          let barcodeId = itemData.barcodeId || null;
          let unitPrice = itemData.unitPrice || 0;

          if (itemData.itemSource === ServiceItemSource.SPARE_PART) {
            const sparePartRepo = Source.getRepository(SparePart);
            const part = await sparePartRepo.findOne({ where: { id: itemData.sparePartId } });
            if (part) {
              partName = part.part_name;
              sku = part.sku;
              barcodeId = part.barcode_id || null;
              unitPrice = Number(part.base_price) || 0;

              // Check for low stock warning
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
          } else if (itemData.itemSource === ServiceItemSource.CUSTOM) {
            // Trigger unregistered custom part warning to Branch Manager & Admin
            const managerIds = await this.getBranchManagerAndAdmins(ticket.branchId);
            for (const mId of managerIds) {
              await NotificationPublisher.publishInAppRequest({
                recipientId: mId,
                title: 'Custom Unregistered Part Requested',
                message: `Technician requested custom part "${itemData.customPartName}" for ticket ${ticket.ticketNumber}. Manager review required.`,
                type: 'WARNING',
                referenceId: ticket.id,
                referenceType: 'SERVICE',
              });
            }
          }

          // If ticket context is a free service context, enforce isFree = true and price = 0
          const freeContexts = [
            ServiceContext.RENT,
            ServiceContext.LEASE_UNDER_WARRANTY,
            ServiceContext.FSMA,
            ServiceContext.SMA,
            ServiceContext.AMC,
          ];
          const isFree = freeContexts.includes(ticket.serviceContext) ? true : !!itemData.isFree;
          const finalPrice = isFree ? 0 : unitPrice;

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
            isFree,
          });
          ticketItems.push(serviceItem);
        }
      }

      ticket.items = ticketItems;
      await ticketRepo.save(ticket);

      // Notify Branch Manager & Help Desk
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

      res.status(200).json({
        success: true,
        data: ticket,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /service/tickets/:id/quote
   * Technician submits quotation (triggers billing service quotation creation).
   */
  submitQuotation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { laborCost } = req.body;
      const id = req.params.id as string;
      const ticketRepo = Source.getRepository(ServiceTicket);
      const ticket = await ticketRepo.findOne({
        where: { id },
        relations: ['items'],
      });
      if (!ticket) throw new Error('Ticket not found');

      // Create Quotation Payload for Billing Service
      const isFreeContext = [
        ServiceContext.RENT,
        ServiceContext.LEASE_UNDER_WARRANTY,
        ServiceContext.FSMA,
        ServiceContext.SMA,
        ServiceContext.AMC,
      ].includes(ticket.serviceContext);

      const items = ticket.items.map((it) => ({
        description: it.partName,
        quantity: it.quantity,
        unitPrice: isFreeContext ? 0 : Number(it.unitPrice) || 0,
        isFree: isFreeContext ? true : it.isFree,
      }));

      // Add labor cost line item
      items.push({
        description: 'Labor Cost / Service Charge',
        quantity: 1,
        unitPrice: isFreeContext ? 0 : Number(laborCost) || 0,
        isFree: isFreeContext,
      });

      // Submit Quotation to Billing Service
      const billingPayload = {
        customerId: ticket.customerId,
        branchId: ticket.branchId,
        createdBy: ticket.createdBy,
        serviceTicketId: ticket.id,
        items,
        saleType: 'PRODUCT_SALE', // Direct sale quotation
        status: isFreeContext ? 'CUSTOMER_ACCEPTED' : 'WAITING_FINANCE_APPROVAL',
      };

      const quoteRes = await axios.post(
        `${BILLING_SERVICE_URL}${BILLING_ENDPOINTS.SERVICE_QUOTATION}`,
        billingPayload,
      );
      const quotation = quoteRes.data.data;

      // Update ServiceTicket depending on context
      if (isFreeContext) {
        ticket.status = ServiceTicketStatus.CUSTOMER_APPROVED;
      } else {
        ticket.status = ServiceTicketStatus.WAITING_FINANCE_APPROVAL;
      }

      ticket.serviceQuotationId = quotation.id;
      await ticketRepo.save(ticket);

      // Notify Finance (if chargeable) or Help Desk (if free)
      if (!isFreeContext) {
        // Query Finance job role users from employee service
        try {
          const empRes = await axios.get(`${EMPLOYEE_SERVICE_URL}/employee?job=FINANCE`); // assuming endpoint exists
          const financeUsers = empRes.data.data || [];
          for (const fUser of financeUsers) {
            await NotificationPublisher.publishInAppRequest({
              recipientId: fUser.id,
              title: 'Finance Approval Required',
              message: `Service Quotation for ticket ${ticket.ticketNumber} is waiting finance approval.`,
              type: 'TASK',
              referenceId: quotation.id,
              referenceType: 'QUOTATION',
            });
          }
        } catch (e) {
          logger.warn('Failed to notify finance users: ', e);
        }
      }

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
   * Callback from billing service when service quotation is created.
   */
  patchQuotationLink = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { serviceQuotationId, status } = req.body;
      const id = req.params.id as string;
      const ticketRepo = Source.getRepository(ServiceTicket);
      const ticket = await ticketRepo.findOne({ where: { id } });
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
   * Help Desk captures customer approval. Triggers CRM lead conversion if needed.
   */
  customerApprove = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const ticketRepo = Source.getRepository(ServiceTicket);
      const ticket = await ticketRepo.findOne({ where: { id } });
      if (!ticket) throw new Error('Ticket not found');

      ticket.status = ServiceTicketStatus.CUSTOMER_APPROVED;

      // Check if ticket is linked to a lead (meaning new customer)
      if (ticket.leadId) {
        try {
          // Trigger convert endpoint on CRM Service
          const convertRes = await axios.post(
            `${CRM_SERVICE_URL}${CRM_ENDPOINTS.LEAD_CONVERT.replace(':id', ticket.leadId)}`,
            {
              location: 'Service Delivery Location',
            },
            {
              headers: {
                // Forward gateway authorization if exists
                Authorization: req.headers.authorization,
              },
            },
          );

          if (convertRes.data && convertRes.data.success) {
            ticket.customerId = convertRes.data.data.customerId;
            ticket.leadId = null; // Unlink lead since they are now a customer
            logger.info(
              `Lead ${ticket.leadId} converted successfully to Customer ${ticket.customerId}`,
            );
          }
        } catch (crmErr) {
          logger.error('Failed to convert CRM lead to customer:', crmErr);
        }
      }

      await ticketRepo.save(ticket);

      // Notify technician
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
   * Help Desk captures customer rejection.
   */
  customerReject = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const ticketRepo = Source.getRepository(ServiceTicket);
      const ticket = await ticketRepo.findOne({ where: { id } });
      if (!ticket) throw new Error('Ticket not found');

      ticket.status = ServiceTicketStatus.CUSTOMER_REJECTED;
      await ticketRepo.save(ticket);

      // Notify Manager
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
   * POST /service/tickets/:id/start
   * Technician starts service job. Handles Lead conversion for Free Services.
   */
  startService = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const ticketRepo = Source.getRepository(ServiceTicket);
      const ticket = await ticketRepo.findOne({ where: { id } });
      if (!ticket) throw new Error('Ticket not found');

      ticket.status = ServiceTicketStatus.IN_PROGRESS;

      // For free service tickets linked to a lead, convert the lead to a customer here!
      if (ticket.leadId) {
        const freeContexts = [
          ServiceContext.RENT,
          ServiceContext.LEASE_UNDER_WARRANTY,
          ServiceContext.FSMA,
          ServiceContext.SMA,
          ServiceContext.AMC,
        ];
        if (freeContexts.includes(ticket.serviceContext)) {
          try {
            const convertRes = await axios.post(
              `${CRM_SERVICE_URL}${CRM_ENDPOINTS.LEAD_CONVERT.replace(':id', ticket.leadId)}`,
              {
                location: 'Service Site',
              },
              {
                headers: {
                  Authorization: req.headers.authorization,
                },
              },
            );

            if (convertRes.data && convertRes.data.success) {
              ticket.customerId = convertRes.data.data.customerId;
              ticket.leadId = null;
              logger.info(
                `Free ticket lead converted successfully. Customer: ${ticket.customerId}`,
              );
            }
          } catch (crmErr) {
            logger.error('Failed to convert CRM lead for free ticket:', crmErr);
          }
        }
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
   * POST /service/tickets/:id/complete
   * Technician completes service. Reduces inventory stock.
   */
  completeService = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { completionNotes } = req.body;
      const id = req.params.id as string;
      const ticketRepo = Source.getRepository(ServiceTicket);
      const ticket = await ticketRepo.findOne({
        where: { id },
        relations: ['items'],
      });
      if (!ticket) throw new Error('Ticket not found');

      ticket.status = ServiceTicketStatus.COMPLETED;
      ticket.completedAt = new Date();
      ticket.completionNotes = completionNotes;

      // Reduce spare parts inventory stock
      const sparePartRepo = Source.getRepository(SparePart);
      for (const item of ticket.items) {
        if (item.itemSource === ServiceItemSource.SPARE_PART && item.sparePartId) {
          const part = await sparePartRepo.findOne({ where: { id: item.sparePartId } });
          if (part) {
            part.quantity = Math.max(0, part.quantity - (item.quantity || 1));
            await sparePartRepo.save(part);
            logger.info(
              `Stock reduced for spare part ${part.part_name}. New quantity: ${part.quantity}`,
            );
          }
        }
      }

      await ticketRepo.save(ticket);

      // Notify Branch Manager & Help Desk
      const managerIds = await this.getBranchManagerAndAdmins(ticket.branchId);
      for (const mId of managerIds) {
        await NotificationPublisher.publishInAppRequest({
          recipientId: mId,
          title: 'Service Ticket Completed',
          message: `Ticket ${ticket.ticketNumber} has been successfully completed by technician.`,
          type: 'INFO',
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
   * POST /service/tickets/:id/cancel
   * Manager or Admin cancels ticket.
   */
  cancelTicket = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const ticketRepo = Source.getRepository(ServiceTicket);
      const ticket = await ticketRepo.findOne({ where: { id } });
      if (!ticket) throw new Error('Ticket not found');

      ticket.status = ServiceTicketStatus.CANCELLED;
      await ticketRepo.save(ticket);

      // Notify Technician if assigned
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

      res.status(200).json({
        success: true,
        data: ticket,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /service/tickets
   * Fetch all tickets (branch scoped for non-admins).
   */
  getTickets = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new Error('User not identified');

      const ticketRepo = Source.getRepository(ServiceTicket);
      let query = ticketRepo
        .createQueryBuilder('ticket')
        .leftJoinAndSelect('ticket.items', 'items');

      // Scoping: branch-bound unless ADMIN
      if (req.user.role !== 'ADMIN' && req.user.branchId) {
        query = query.where('ticket.branchId = :branchId', { branchId: req.user.branchId });
      }

      // If technician, they only see their assigned tickets
      if (req.user.employeeJob === 'SERVICE_TECHNICIAN') {
        query = query.andWhere('ticket.assignedTechnicianId = :techId', {
          techId: req.user.userId,
        });
      }

      const tickets = await query.orderBy('ticket.created_at', 'DESC').getMany();

      res.status(200).json({
        success: true,
        data: tickets,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /service/tickets/:id
   * Fetch single ticket details.
   */
  getTicketById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const ticketRepo = Source.getRepository(ServiceTicket);
      const ticket = await ticketRepo.findOne({
        where: { id },
        relations: ['items'],
      });
      if (!ticket) throw new Error('Ticket not found');

      res.status(200).json({
        success: true,
        data: ticket,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /service/technicians
   * Lists all employees with job role SERVICE_TECHNICIAN.
   */
  getTechnicians = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Fetch list of technicians from employee service
      const empRes = await axios.get(`${EMPLOYEE_SERVICE_URL}/employee?job=SERVICE_TECHNICIAN`, {
        headers: {
          Authorization: req.headers.authorization,
        },
      });

      const responseData = empRes.data.data;
      const techniciansList = Array.isArray(responseData)
        ? responseData
        : responseData?.employees || [];

      res.status(200).json({
        success: true,
        data: techniciansList,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /service/customers/:customerId/history
   * Customer intelligence view fetching local service tickets and external invoice/contract history.
   */
  getCustomerHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customerId = req.params.customerId as string;
      const ticketRepo = Source.getRepository(ServiceTicket);

      // 1. Fetch local tickets
      const tickets = await ticketRepo.find({
        where: { customerId },
        relations: ['items'],
        order: { created_at: 'DESC' },
      });

      // 2. Fetch contract & invoice history from billing service
      let billingHistory = null;
      try {
        const billingRes = await axios.get(
          `${BILLING_SERVICE_URL}${BILLING_ENDPOINTS.CUSTOMER_HISTORY.replace(':customerId', customerId)}`,
          {
            headers: {
              Authorization: req.headers.authorization,
            },
          },
        );
        if (billingRes.data && billingRes.data.success) {
          billingHistory = billingRes.data.data;
        }
      } catch (err) {
        logger.error('Failed to fetch billing history for customer history:', err);
      }

      res.status(200).json({
        success: true,
        data: {
          tickets,
          billingHistory,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
