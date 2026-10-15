import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/appError';
import { logger } from '../config/logger';

/**
 * Global error handling middleware. Keep request data and error payloads out of logs.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
  const statusCode = err instanceof AppError ? err.statusCode : 500;

  const routeGroup = `/${req.path.split('/').filter(Boolean)[0] || ''}`;
  const errorCode = 'code' in err && typeof err.code === 'string' ? err.code : undefined;

  logger.error(`✗ [ERROR] ${req.method} ${routeGroup} → ${statusCode}`, {
    method: req.method,
    routeGroup,
    statusCode,
    errorType: err.name,
    errorCode,
    // Preserve the database/driver reason in server logs while keeping request
    // bodies and internal error details out of the API response.
    errorMessage: err.message,
    stack: err.stack,
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
