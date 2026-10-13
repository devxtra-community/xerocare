import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

/**
 * Logs request/response metadata without retaining payloads or query values.
 */
export const httpLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  const routeGroup = `/${req.path.split('/').filter(Boolean)[0] || ''}`;
  const bodyFieldCount =
    req.body && typeof req.body === 'object' ? Object.keys(req.body).length : 0;
  const queryFieldCount = Object.keys(req.query).length;

  logger.info(`→ [REQUEST] ${req.method} ${routeGroup}`, {
    method: req.method,
    routeGroup,
    bodyFieldCount,
    queryFieldCount,
  });

  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    const contentLength = res.getHeader('content-length');
    const responseBytes =
      typeof contentLength === 'number'
        ? contentLength
        : typeof contentLength === 'string'
          ? Number(contentLength) || undefined
          : undefined;

    logger[level](`← [RESPONSE] ${req.method} ${routeGroup} ${res.statusCode} (${duration}ms)`, {
      method: req.method,
      routeGroup,
      statusCode: res.statusCode,
      durationMs: duration,
      responseBytes,
      contentType: res.getHeader('content-type'),
    });
  });

  next();
};
