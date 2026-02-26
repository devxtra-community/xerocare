import { Request, Response, NextFunction } from 'express';
import { CustomerService } from '../services/customerService';
import { AppError } from '../errors/appError';

export class CustomerController {
  private customerService: CustomerService;

  constructor() {
    this.customerService = new CustomerService();
  }

  /**
   * Creates a new customer.
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
   * Retrieves all customers.
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
   * Retrieves a single customer by ID.
   */
  getCustomerById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      if (typeof id !== 'string') {
        throw new AppError('Invalid ID', 400);
      }
      const customer = await this.customerService.getCustomerById(id);

      // Branch isolation check
      if (req.user?.role !== 'ADMIN' && customer.branch_id !== req.user?.branchId) {
        throw new AppError('Access denied: Customer belongs to another branch', 403);
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
   * Updates an existing customer.
   */
  updateCustomer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      if (typeof id !== 'string') {
        throw new AppError('Invalid ID', 400);
      }

      const customer = await this.customerService.getCustomerById(id);
      // Branch isolation check
      if (req.user?.role !== 'ADMIN' && customer.branch_id !== req.user?.branchId) {
        throw new AppError('Access denied: Cannot update customer from another branch', 403);
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
   * Soft deletes a customer.
   */
  deleteCustomer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      if (typeof id !== 'string') {
        throw new AppError('Invalid ID', 400);
      }

      const customer = await this.customerService.getCustomerById(id);
      // Branch isolation check
      if (req.user?.role !== 'ADMIN' && customer.branch_id !== req.user?.branchId) {
        throw new AppError('Access denied: Cannot delete customer from another branch', 403);
      }

      await this.customerService.deleteCustomer(id);
      res.status(200).json({
        success: true,
        message: 'Customer soft deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}
