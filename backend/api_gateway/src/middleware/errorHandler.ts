import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/appError';
import { logger } from '../config/logger';

/**
 * Global error handling middleware.
 * Logs errors and sends standardized JSON responses.
 */
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  void next;
  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
  });

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
    });
  }

  return res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
};
