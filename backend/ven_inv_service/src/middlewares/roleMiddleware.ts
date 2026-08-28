import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/appError';

// Branch managers inherit the branch-scoped authority of these roles.
// ADMIN-only routes remain closed to managers.
const MANAGER_INHERITED_ROLES = ['MANAGER', 'HR', 'FINANCE', 'EMPLOYEE'];

export const roleMiddleware = (allowedRoles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    const { role } = req.user;

    // ADMIN is the organisation-wide superuser: it outranks every other role,
    // so it passes any role gate without having to be listed on each route.
    if (role === 'ADMIN') {
      return next();
    }

    if (role === 'MANAGER' && allowedRoles.some((r) => MANAGER_INHERITED_ROLES.includes(r))) {
      return next();
    }

    if (!role || !allowedRoles.includes(role)) {
      return next(new AppError('Access denied: insufficient permissions', 403));
    }

    next();
  };
};

/**
 * Middleware to restrict access based on employeeJob or user role.
 * ADMIN and MANAGER always have full access.
 * Mirrors the API Gateway's requireServiceRole behaviour.
 */
export const requireServiceRole = (allowedJobs: string[], allowManagerAdmin = true) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    const { role, employeeJob } = req.user;

    // ADMIN and MANAGER always have full access by default
    if (
      allowManagerAdmin &&
      (role === 'ADMIN' || role === 'MANAGER' || employeeJob === 'MANAGER')
    ) {
      return next();
    }

    // Check if employee has one of the allowed jobs
    if (
      (role === 'EMPLOYEE' && employeeJob && allowedJobs.includes(employeeJob)) ||
      (role === 'FINANCE' && allowedJobs.includes('FINANCE'))
    ) {
      return next();
    }

    return next(new AppError('Access denied: insufficient permissions', 403));
  };
};
