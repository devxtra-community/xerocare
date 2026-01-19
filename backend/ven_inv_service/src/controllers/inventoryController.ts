import { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/appError';

export const inventoryStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    return res.json({
      status: 'Inventory service is running',
      success: true,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    next(new AppError(error.message, 500));
  }
};
