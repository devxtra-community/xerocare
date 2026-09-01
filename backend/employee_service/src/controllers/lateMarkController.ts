import { Request, Response, NextFunction } from 'express';
import { LateMarkService } from '../services/lateMarkService';
import { EmployeeRepository } from '../repositories/employeeRepository';
import { AppError } from '../errors/appError';
import { EmployeeRole } from '../constants/employeeRole';

const service = new LateMarkService();
const employeeRepo = new EmployeeRepository();

export const markLate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const markedBy = req.user?.userId;
    if (!markedBy) {
      throw new AppError('User not authenticated', 401);
    }

    const { employee_id, date, note } = req.body;
    if (!employee_id || !date) {
      throw new AppError('employee_id and date are required', 400);
    }

    if (req.user?.role !== EmployeeRole.ADMIN) {
      const targetEmployee = await employeeRepo.findById(employee_id);
      if (!targetEmployee || targetEmployee.branch_id !== req.user?.branchId) {
        throw new AppError('You can only mark employees from your branch as late', 403);
      }
    }

    const lateMark = await service.markLate(markedBy, { employee_id, date, note });

    res.status(201).json({
      success: true,
      message: 'Employee marked late successfully',
      data: lateMark,
    });
  } catch (err: unknown) {
    const error = err as { message: string; statusCode?: number };
    next(new AppError(error.message, error.statusCode || 400));
  }
};

export const getEmployeeLateCount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employeeId = req.params.employeeId as string;

    const isSelf = employeeId === req.user?.userId;
    const isHROrAdminOrManager = [
      EmployeeRole.HR,
      EmployeeRole.ADMIN,
      EmployeeRole.MANAGER,
    ].includes(req.user?.role as EmployeeRole);

    if (!isSelf && !isHROrAdminOrManager) {
      throw new AppError('You do not have permission to view this record', 403);
    }

    if (!isSelf && req.user?.role !== EmployeeRole.ADMIN) {
      const targetEmployee = await employeeRepo.findById(employeeId);
      if (!targetEmployee || targetEmployee.branch_id !== req.user?.branchId) {
        throw new AppError('You do not have permission to view this record', 403);
      }
    }

    const count = await service.getEmployeeLateCountThisYear(employeeId);

    res.json({
      success: true,
      message: 'Late count fetched successfully',
      data: { count },
    });
  } catch (err: unknown) {
    const error = err as { message: string; statusCode?: number };
    next(new AppError(error.message, error.statusCode || 500));
  }
};
