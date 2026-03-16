import { Request, Response, NextFunction } from 'express';
import { CustomerService } from '../services/customerService';
import { AppError } from '../errors/appError';

export class CustomerController {
  private customerService: CustomerService;

  constructor() {
    this.customerService = new CustomerService();
  }

  /**
   * Add a new official customer to our company database.
   *
   * If the person adding the customer is a regular employee, the customer
   * is automatically assigned to that employee's specific branch office.
   */
  createCustomer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = { ...req.body };
      if (req.user?.role !== 'ADMIN') {
        data.branch_id = req.user?.branchId;
      }
      const customer = await this.customerService.createCustomer(data);
      res.status(201).json({
        success: true,
        data: customer,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * List every customer we have on record.
   *
   * - Administrators can see everyone across all offices.
   * - Branch staff only see the customers belonging to their own local office.
   */
  getAllCustomers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const branchId = req.user?.role === 'ADMIN' ? undefined : req.user?.branchId;
      const customers = await this.customerService.getAllCustomers(branchId);
      res.status(200).json({
        success: true,
        data: customers,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get the full details for one specific customer using their ID number.
   *
   * We double-check to make sure the staff member has permission to see
   * this customer (i.e., they both belong to the same office).
   */
  getCustomerById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      if (typeof id !== 'string') {
        throw new AppError('Invalid ID provided', 400);
      }
      const customer = await this.customerService.getCustomerById(id);

      // Security check: Make sure the staff member is allowed to see this specific customer.
      if (req.user?.role !== 'ADMIN' && customer.branch_id !== req.user?.branchId) {
        throw new AppError('Access denied: This customer belongs to another office', 403);
      }

      res.status(200).json({
        success: true,
        data: customer,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update a customer's information (like their name or phone number).
   *
   * Just like when viewing, we check to ensure the staff member isn't
   * accidentally changing a customer from a different office.
   */
  updateCustomer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      if (typeof id !== 'string') {
        throw new AppError('Invalid ID provided', 400);
      }

      const customer = await this.customerService.getCustomerById(id);
      // Security check: Only allow updates if the staff member belongs to the same office.
      if (req.user?.role !== 'ADMIN' && customer.branch_id !== req.user?.branchId) {
        throw new AppError('Access denied: You cannot update a customer from another office', 403);
      }

      const updatedCustomer = await this.customerService.updateCustomer(id, req.body);
      res.status(200).json({
        success: true,
        data: updatedCustomer,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Remove a customer from our active list.
   *
   * This is a "Soft Delete"—the information isn't permanently erased,
   * but the customer will no longer show up in our main lists.
   */
  deleteCustomer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      if (typeof id !== 'string') {
        throw new AppError('Invalid ID provided', 400);
      }

      const customer = await this.customerService.getCustomerById(id);
      // Security check: Only allow removal if the staff member belongs to the same office.
      if (req.user?.role !== 'ADMIN' && customer.branch_id !== req.user?.branchId) {
        throw new AppError('Access denied: You cannot remove a customer from another office', 403);
      }

      await this.customerService.deleteCustomer(id);
      res.status(200).json({
        success: true,
        message: 'Customer has been moved to the archive (removed from active list)',
      });
    } catch (error) {
      next(error);
    }
  };
}
