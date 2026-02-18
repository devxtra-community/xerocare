import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

/**
 * Rich HTTP request/response logger middleware.
 * Logs incoming requests and outgoing responses with timing.
 */
export const httpLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();

  // Log incoming request
  logger.info(`→ ${req.method} ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // Intercept response finish to log response details
  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    logger[level](`← ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`, {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });
  });

  next();
};
