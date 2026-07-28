import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/appError';

// Branch managers inherit the branch-scoped authority of these roles.
// ADMIN-only routes remain closed to managers.
const MANAGER_INHERITED_ROLES = ['MANAGER', 'HR', 'FINANCE', 'EMPLOYEE'];

export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    const userRole = req.user.role;

    // ADMIN is the organisation-wide superuser: it outranks every other role,
    // so it passes any role gate without having to be listed on each route.
    if (userRole === 'ADMIN') {
      return next();
    }

    if (
      userRole === 'MANAGER' &&
      allowedRoles.some((role) => MANAGER_INHERITED_ROLES.includes(role))
    ) {
      return next();
    }

    if (!allowedRoles.includes(userRole)) {
      return next(new AppError('Access denied: insufficient permissions', 403));
    }

    next();
  };
};
