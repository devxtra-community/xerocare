import { Request, Response, NextFunction } from 'express';
import { LeadService } from '../services/leadService';

export class LeadController {
  private leadService: LeadService;

  constructor() {
    this.leadService = new LeadService();
  }

  /**
   * Creates a new lead.
   */
  createLead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }
      const data = { ...req.body };
      if (req.user.role !== 'ADMIN') {
        data.branch_id = req.user.branchId;
      }
      const lead = await this.leadService.createLead(data, req.user.userId);
      res.status(201).json({
        success: true,
        data: lead,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Retrieves all leads, optionally filtering by branch or deletion status.
   */
  getAllLeads = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }
      const includeDeleted = req.query.includeDeleted === 'true';
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

  /**
   * Retrieves a single lead by ID.
   */
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

      // Branch isolation check
      if (req.user.role !== 'ADMIN' && lead.branch_id !== req.user.branchId) {
        throw new Error('Access denied: Lead belongs to another branch');
      }

      res.status(200).json({
        success: true,
        data: lead,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Converts a lead into a customer.
   */
  convertLead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }
      const lead = await this.leadService.getLeadById(
        req.params.id as string,
        req.user.userId,
        req.user.role,
      );

      // Branch isolation check
      if (req.user.role !== 'ADMIN' && lead.branch_id !== req.user.branchId) {
        throw new Error('Access denied: Cannot convert lead from another branch');
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

  /**
   * Updates an existing lead.
   */
  updateLead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }
      const lead = await this.leadService.getLeadById(
        req.params.id as string,
        req.user.userId,
        req.user.role,
      );

      // Branch isolation check
      if (req.user.role !== 'ADMIN' && lead.branch_id !== req.user.branchId) {
        throw new Error('Access denied: Cannot update lead from another branch');
      }

      const updatedLead = await this.leadService.updateLead(
        req.params.id as string,
        req.body,
        req.user.userId,
        req.user.role,
      );
      res.status(200).json({
        success: true,
        data: updatedLead,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Deletes a lead.
   */
  deleteLead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }
      const lead = await this.leadService.getLeadById(
        req.params.id as string,
        req.user.userId,
        req.user.role,
      );

      // Branch isolation check
      if (req.user.role !== 'ADMIN' && lead.branch_id !== req.user.branchId) {
        throw new Error('Access denied: Cannot delete lead from another branch');
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
