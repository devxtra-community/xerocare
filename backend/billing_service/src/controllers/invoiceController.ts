import { Request, Response, NextFunction } from 'express';
import { BillingService } from '../services/billingService';
import { AppError } from '../errors/appError';

const billingService = new BillingService();

export const createInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { branchId, items, saleType, startDate, endDate, billingCycleInDays } = req.body;

    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const createdBy = req.user.userId;

    if (!branchId || !items || !Array.isArray(items) || !saleType) {
      throw new AppError('Invalid request payload', 400);
    }

    const invoice = await billingService.createInvoice({
      branchId,
      createdBy,
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
