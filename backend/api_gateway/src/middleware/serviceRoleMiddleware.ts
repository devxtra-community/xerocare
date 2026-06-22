import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/appError';

/**
 * Middleware to restrict access based on employeeJob or user role.
 * ADMIN and MANAGER always have full access.
 */
export const requireServiceRole = (allowedJobs: string[], allowManagerAdmin = true) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    const { role, employeeJob } = req.user;

    // ADMIN and MANAGER always have full access by default. Also allow employee managers.
    if (
      allowManagerAdmin &&
      (role === 'ADMIN' || role === 'MANAGER' || employeeJob === 'MANAGER')
    ) {
      return next();
    }

    // Check if employee has one of the allowed jobs or if user is FINANCE and FINANCE is allowed
    if (
      (role === 'EMPLOYEE' && employeeJob && allowedJobs.includes(employeeJob)) ||
      (role === 'FINANCE' && allowedJobs.includes('FINANCE'))
    ) {
      return next();
    }

    return next(new AppError('Access denied: insufficient permissions', 403));
  };
};
