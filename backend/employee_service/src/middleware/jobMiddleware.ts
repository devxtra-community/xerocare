import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/appError';
import { EmployeeJob } from '../constants/employeeJob';
import { logger } from '../config/logger';

export const requireJob = (...allowedJobs: EmployeeJob[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    // Non-employees (ADMIN, MANAGER, HR, FINANCE) bypass job checks
    if (req.user.role !== 'EMPLOYEE') {
      return next();
    }

    // Employees must have a job assigned
    if (!req.user.employeeJob) {
      logger.warn('Employee without job attempted access', {
        userId: req.user.userId,
        path: req.path,
      });
      return next(new AppError('Employee job not defined', 403));
    }

    // Check if employee's job is in allowed list
    if (
      req.user.employeeJob !== EmployeeJob.EMPLOYEE_MANAGER &&
      !allowedJobs.includes(req.user.employeeJob as EmployeeJob)
    ) {
      // Log security event for audit trail
      logger.warn('Unauthorized job access attempt', {
        userId: req.user.userId,
        employeeJob: req.user.employeeJob,
        requiredJobs: allowedJobs,
        path: req.path,
        method: req.method,
      });
      return next(new AppError('Access denied: job not authorized for this resource', 403));
    }

    next();
  };
};
