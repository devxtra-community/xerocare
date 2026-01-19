import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/appError';
import { verifyAccessToken } from '../utils/jwt';

export const authMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Access token missing', 401));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyAccessToken(token);

    if (!decoded || !decoded.userId || !decoded.role) {
      return next(new AppError('Invalid access token', 401));
    }

    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      email: decoded.email,
    };

    next();
  } catch {
    return next(new AppError('Invalid or expired access token', 401));
  }
};
