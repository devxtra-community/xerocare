import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/appError';
import { logger } from '../config/logger';

/**
 * Global error handling middleware.
 * Logs errors with full context including masked request details.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
  const statusCode = err instanceof AppError ? err.statusCode : 500;

  // Mask sensitive information in the body before logging
  const maskedBody = { ...req.body };
  const sensitiveFields = ['password', 'otp', 'token', 'newPassword', 'currentPassword'];
  sensitiveFields.forEach((field) => {
    if (maskedBody[field]) maskedBody[field] = '********';
  });

  logger.error(`✗ [ERROR] ${req.method} ${req.originalUrl} → ${statusCode} ${err.message}`, {
    method: req.method,
    url: req.originalUrl,
    statusCode,
    message: err.message,
    stack: err.stack,
    body: Object.keys(maskedBody).length > 0 ? maskedBody : undefined,
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
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
