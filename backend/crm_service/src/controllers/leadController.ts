import { Request, Response, NextFunction } from 'express';
import { LeadService } from '../services/leadService';

export class LeadController {
  private leadService: LeadService;

  constructor() {
    this.leadService = new LeadService();
  }

  createLead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }
      const lead = await this.leadService.createLead(req.body, req.user.userId);
      res.status(201).json({
        success: true,
        data: lead,
      });
    } catch (error) {
      next(error);
    }
  };

  getAllLeads = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }
      const includeDeleted = req.query.includeDeleted === 'true';

      // Branch filtering: Admin sees all leads, others see only their branch
      const branchId = req.user.role === 'ADMIN' ? undefined : req.user.branchId;

      const leads = await this.leadService.getAllLeads(
        req.user.userId,
        req.user.role,
        includeDeleted,
        branchId,
      );
      res.status(200).json({
        success: true,
        data: leads,
      });
    } catch (error) {
      next(error);
    }
  };

  getLeadById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }
      const lead = await this.leadService.getLeadById(
        req.params.id as string,
        req.user.userId,
        req.user.role,
      );
      res.status(200).json({
        success: true,
        data: lead,
      });
    } catch (error) {
      next(error);
    }
  };

  convertLead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }
      const customerId = await this.leadService.convertLeadToCustomer(
        req.params.id as string,
        req.user.userId,
        req.user.role,
        req.body,
      );
      res.status(200).json({
        success: true,
        data: { customerId },
      });
    } catch (error) {
      next(error);
    }
  };

  updateLead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }
      const lead = await this.leadService.updateLead(
        req.params.id as string,
        req.body,
        req.user.userId,
        req.user.role,
      );
      res.status(200).json({
        success: true,
        data: lead,
      });
    } catch (error) {
      next(error);
    }
  };

  deleteLead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }
      await this.leadService.deleteLead(req.params.id as string, req.user.userId, req.user.role);
      res.status(200).json({
        success: true,
        message: 'Lead deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}
