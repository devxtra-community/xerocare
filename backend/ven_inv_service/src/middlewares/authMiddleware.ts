import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/appError';
import { verifyAccessToken } from '../utils/jwt';
import { logger } from '../config/logger';

interface ErrorWithName {
  name?: string;
  role?: string;
  userId?: string;
  email?: string;
  branchId?: string;
}

export const authMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  logger.info('Auth Middleware invoked');
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Access token missing', 401, 'TOKEN_MISSING'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyAccessToken(token);

    if (!decoded || !decoded.userId || !decoded.role) {
      return next(new AppError('Invalid access token', 401, 'TOKEN_INVALID'));
    }

    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      email: decoded.email,
    };

    next();
  } catch (error: unknown) {
    const err = error as ErrorWithName;
    logger.error('Auth Middleware Error:', err);
    logger.info(`Token received: ${token}`);
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Access token expired', 401, 'TOKEN_EXPIRED'));
    }
    return next(new AppError('Invalid or expired access token', 401, 'TOKEN_INVALID'));
  }
};
