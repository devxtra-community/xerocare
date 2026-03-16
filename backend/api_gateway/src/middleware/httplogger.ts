import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

/**
 * Enhanced HTTP request/response logger middleware.
 * Logs incoming requests with their bodies (masked) and outgoing responses.
 */
export const httpLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();

  // Mask sensitive information (like passwords) before logging
  const maskedBody = { ...req.body };
  const sensitiveFields = ['password', 'otp', 'token', 'newPassword', 'currentPassword'];
  sensitiveFields.forEach((field) => {
    if (maskedBody[field]) maskedBody[field] = '********';
  });

  // Log incoming request with details
  logger.info(`→ [REQUEST] ${req.method} ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    body: Object.keys(maskedBody).length > 0 ? maskedBody : undefined,
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
  });

  // Capture response body for logging
  const oldSend = res.send;
  let responseBody: unknown;

  res.send = function (body: unknown): Response {
    responseBody = body;
    return oldSend.call(res, body);
  } as typeof res.send;

  // Intercept response finish
  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    let parsedResponseBody;
    try {
      parsedResponseBody =
        typeof responseBody === 'string' ? JSON.parse(responseBody) : responseBody;
    } catch {
      parsedResponseBody = responseBody;
    }

    logger[level](
      `← [RESPONSE] ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`,
      {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        response: parsedResponseBody,
      },
    );
  });

  next();
};
