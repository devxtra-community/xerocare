import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/appError';

export const roleMiddleware = (allowedRoles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    const { role } = req.user;

    if (!role || !allowedRoles.includes(role)) {
      return next(new AppError('Access denied: insufficient permissions', 403));
    }

    next();
  };
};
