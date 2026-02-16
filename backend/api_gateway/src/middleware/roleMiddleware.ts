import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/appError';

/**
 * Middleware factory to restrict access to specific user roles.
 * @param allowedRoles - List of roles permitted to access the route.
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      return next(new AppError('Access denied: insufficient permissions', 403));
    }

    next();
  };
};
