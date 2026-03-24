import { Request, Response, NextFunction } from 'express';
import { LeadService } from '../services/leadService';

export class LeadController {
  private leadService: LeadService;

  constructor() {
    this.leadService = new LeadService();
  }

  /**
   * Record a new potential customer (Lead) in our system.
   *
   * If the person adding the lead is a regular employee, the lead
   * is automatically linked to their specific office.
   */
  createLead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new Error('User not identified');
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
   * List every potential customer currently in our pipeline.
   *
   * - Administrators can see leads from all offices.
   * - Regular staff only see leads belonging to their own office.
   * - "Closed" or "Lost" leads are hidden by default but can be optionally shown.
   */
  getAllLeads = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new Error('User not identified');
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
   * Get the specific details of one potential customer.
   *
   * We ensure that staff can only see leads from their own office for safety.
   */
  getLeadById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new Error('User not identified');
      }
      const lead = await this.leadService.getLeadById(
        req.params.id as string,
        req.user.userId,
        req.user.role,
      );

      // Security Check: Only allow staff to see leads from their own office.
      if (req.user.role !== 'ADMIN' && lead.branch_id !== req.user.branchId) {
        throw new Error('Access denied: This potential customer belongs to another office');
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
   * The "Success" moment: Turn a potential customer (Lead) into an official
   * Customer in our records.
   *
   * This is used when a deal is finalized and they are no longer just a "prospect".
   */
  convertLead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new Error('User not identified');
      }
      const lead = await this.leadService.getLeadById(
        req.params.id as string,
        req.user.userId,
        req.user.role,
      );

      // Security Check: Only allow staff members from the same office to finalize the deal.
      if (req.user.role !== 'ADMIN' && lead.branch_id !== req.user.branchId) {
        throw new Error('Access denied: You cannot finalized a deal for another office');
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
   * Update the information we have on a potential customer.
   *
   * We check to make sure the staff member is only editing leads
   * belonging to their own office.
   */
  updateLead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new Error('User not identified');
      }
      const lead = await this.leadService.getLeadById(
        req.params.id as string,
        req.user.userId,
        req.user.role,
      );

      // Security Check: Ensure the staff member has permission (same office).
      if (req.user.role !== 'ADMIN' && lead.branch_id !== req.user.branchId) {
        throw new Error('Access denied: You cannot update information for another office');
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
   * Remove a potential customer from our list if they decide not to proceed.
   */
  deleteLead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new Error('User not identified');
      }
      const lead = await this.leadService.getLeadById(
        req.params.id as string,
        req.user.userId,
        req.user.role,
      );

      // Security Check: Only allow removal if the staff member belongs to the same office.
      if (req.user.role !== 'ADMIN' && lead.branch_id !== req.user.branchId) {
        throw new Error(
          'Access denied: You cannot remove a potential customer from another office',
        );
      }

      await this.leadService.deleteLead(req.params.id as string, req.user.userId, req.user.role);
      res.status(200).json({
        success: true,
        message: 'Lead information has been moved to our archives',
      });
    } catch (error) {
      next(error);
    }
  };
}
