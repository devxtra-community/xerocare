import { Request, Response, NextFunction } from 'express';
import { BillingService } from '../services/billingService';
import { AppError } from '../errors/appError';

const billingService = new BillingService();

export const createInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { branchId, employeeId, createdBy, ...allowedPayload } = req.body;

    if (branchId || employeeId || createdBy) {
      throw new AppError(
        'Security Violation: branchId, employeeId, and createdBy must not be provided in request body',
        400,
      );
    }

    if (!req.user || !req.user.userId || !req.user.branchId) {
      throw new AppError('User context missing or incomplete', 401);
    }

    const { items, saleType, startDate, endDate, billingCycleInDays } = allowedPayload;

    if (!items || !Array.isArray(items) || !saleType) {
      throw new AppError('Invalid request payload: items and saleType are required', 400);
    }

    const invoice = await billingService.createInvoice({
      branchId: req.user.branchId,
      createdBy: req.user.userId,
      saleType,
      startDate,
      endDate,
      billingCycleInDays,
      items,
    });

    return res.status(201).json({
      success: true,
      data: invoice,
      message: 'Invoice created successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getAllInvoices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoices = await billingService.getAllInvoices();
    return res.status(200).json({
      success: true,
      data: invoices,
    });
  } catch (error) {
    next(error);
  }
};

export const getInvoiceById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const invoice = await billingService.getInvoiceById(id);
    return res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};
