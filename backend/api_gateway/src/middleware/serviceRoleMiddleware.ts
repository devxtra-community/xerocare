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

    // ADMIN and MANAGER always have full access by default
    if (allowManagerAdmin && (role === 'ADMIN' || role === 'MANAGER')) {
      return next();
    }

    // Check if employee has one of the allowed jobs
    if (role === 'EMPLOYEE' && employeeJob && allowedJobs.includes(employeeJob)) {
      return next();
    }

    return next(new AppError('Access denied: insufficient permissions', 403));
  };
};
