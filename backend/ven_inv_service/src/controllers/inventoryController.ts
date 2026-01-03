import { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/appError';

export const inventoryStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    return res.json({
      status: 'Inventory service is running',
      success: true,
    });
  } catch (err: any) {
    next(new AppError(err.message, err.statusCode || 500));
  }
};
