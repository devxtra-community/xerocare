import { Request, Response, NextFunction } from 'express';
import { CustomerService } from '../services/customerService';
import { AppError } from '../errors/appError';

export class CustomerController {
  private customerService: CustomerService;

  constructor() {
    this.customerService = new CustomerService();
  }

  createCustomer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customer = await this.customerService.createCustomer(req.body);
      res.status(201).json({
        success: true,
        data: customer,
      });
    } catch (error) {
      next(error);
    }
  };

  getAllCustomers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customers = await this.customerService.getAllCustomers();
      res.status(200).json({
        success: true,
        data: customers,
      });
    } catch (error) {
      next(error);
    }
  };

  getCustomerById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      if (typeof id !== 'string') {
        throw new AppError('Invalid ID', 400);
      }
      const customer = await this.customerService.getCustomerById(id);
      res.status(200).json({
        success: true,
        data: customer,
      });
    } catch (error) {
      next(error);
    }
  };

  updateCustomer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      if (typeof id !== 'string') {
        throw new AppError('Invalid ID', 400);
      }
      const customer = await this.customerService.updateCustomer(id, req.body);
      res.status(200).json({
        success: true,
        data: customer,
      });
    } catch (error) {
      next(error);
    }
  };

  deleteCustomer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      if (typeof id !== 'string') {
        throw new AppError('Invalid ID', 400);
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
