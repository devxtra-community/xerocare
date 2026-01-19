import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/appError';

export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    const userRole = req.user.role || 'ADMIN';

    if (!allowedRoles.includes(userRole)) {
      return next(new AppError('Access denied: insufficient permissions', 403));
    }

    next();
  };
};
