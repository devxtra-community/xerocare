import { Request, Response, NextFunction } from 'express';
import { LeaveApplicationService } from '../services/leaveApplicationService';
import { AppError } from '../errors/appError';
import { LeaveStatus } from '../constants/leaveStatus';
import { LeaveType } from '../constants/leaveType';
import { EmployeeRole } from '../constants/employeeRole';

const service = new LeaveApplicationService();

export const submitLeaveApplication = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employeeId = req.user?.userId;

    if (!employeeId) {
      throw new AppError('User not authenticated', 401);
    }

    const { start_date, end_date, leave_type, reason } = req.body;

    if (!start_date || !end_date || !leave_type || !reason) {
      throw new AppError('All fields are required', 400);
    }

    if (!Object.values(LeaveType).includes(leave_type)) {
      throw new AppError('Invalid leave type', 400);
    }

    const leaveApplication = await service.submitLeaveApplication(employeeId, {
      start_date,
      end_date,
      leave_type,
      reason,
    });

    res.status(201).json({
      success: true,
      message: 'Leave application submitted successfully',
      data: leaveApplication,
    });
  } catch (err: unknown) {
    const error = err as { message: string; statusCode?: number };
    next(new AppError(error.message, error.statusCode || 400));
  }
};

export const getMyLeaveApplications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employeeId = req.user?.userId;

    if (!employeeId) {
      throw new AppError('User not authenticated', 401);
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const result = await service.getEmployeeLeaveApplications(employeeId, page, limit);

    res.json({
      success: true,
      message: 'Leave applications fetched successfully',
      data: result,
    });
  } catch (err: unknown) {
    const error = err as { message: string; statusCode?: number };
    next(new AppError(error.message, error.statusCode || 500));
  }
};

export const getBranchLeaveApplications = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const status = req.query.status as LeaveStatus | undefined;

    if (status && !Object.values(LeaveStatus).includes(status)) {
      throw new AppError('Invalid status filter', 400);
    }

    const branchId = req.user?.role === EmployeeRole.ADMIN ? undefined : req.user?.branchId;

    if (!branchId && req.user?.role !== EmployeeRole.ADMIN) {
      throw new AppError('User must be assigned to a branch', 400);
    }

    const result = await service.getBranchLeaveApplications(branchId || '', page, limit, status);

    res.json({
      success: true,
      message: 'Leave applications fetched successfully',
      data: result,
    });
  } catch (err: unknown) {
    const error = err as { message: string; statusCode?: number };
    next(new AppError(error.message, error.statusCode || 500));
  }
};

export const getLeaveApplicationById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const leaveApplication = await service.getLeaveApplicationById(id);

    const isOwner = leaveApplication.employee_id === req.user?.userId;
    const isHROrAdmin = [EmployeeRole.HR, EmployeeRole.ADMIN].includes(
      req.user?.role as EmployeeRole,
    );
    const isSameBranch = leaveApplication.branch_id === req.user?.branchId;

    if (!isOwner && !(isHROrAdmin && (isSameBranch || req.user?.role === EmployeeRole.ADMIN))) {
      throw new AppError('You do not have permission to view this leave application', 403);
    }

    res.json({
      success: true,
      message: 'Leave application fetched successfully',
      data: leaveApplication,
    });
  } catch (err: unknown) {
    const error = err as { message: string; statusCode?: number };
    next(new AppError(error.message, error.statusCode || 404));
  }
};

export const approveLeaveApplication = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const reviewerId = req.user?.userId;

    if (!reviewerId) {
      throw new AppError('User not authenticated', 401);
    }

    const leaveApplication = await service.getLeaveApplicationById(id);
    if (
      req.user?.role !== EmployeeRole.ADMIN &&
      leaveApplication.branch_id !== req.user?.branchId
    ) {
      throw new AppError('You can only approve leave applications from your branch', 403);
    }

    const updatedLeave = await service.approveLeaveApplication(id, reviewerId);

    res.json({
      success: true,
      message: 'Leave application approved successfully',
      data: updatedLeave,
    });
  } catch (err: unknown) {
    const error = err as { message: string; statusCode?: number };
    next(new AppError(error.message, error.statusCode || 400));
  }
};

export const rejectLeaveApplication = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const reason = req.body.reason as string;
    const reviewerId = req.user?.userId;

    if (!reviewerId) {
      throw new AppError('User not authenticated', 401);
    }

    if (!reason) {
      throw new AppError('Rejection reason is required', 400);
    }

    const leaveApplication = await service.getLeaveApplicationById(id);
    if (
      req.user?.role !== EmployeeRole.ADMIN &&
      leaveApplication.branch_id !== req.user?.branchId
    ) {
      throw new AppError('You can only reject leave applications from your branch', 403);
    }

    const updatedLeave = await service.rejectLeaveApplication(id, reviewerId, reason);

    res.json({
      success: true,
      message: 'Leave application rejected successfully',
      data: updatedLeave,
    });
  } catch (err: unknown) {
    const error = err as { message: string; statusCode?: number };
    next(new AppError(error.message, error.statusCode || 400));
  }
};

export const cancelLeaveApplication = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const employeeId = req.user?.userId;

    if (!employeeId) {
      throw new AppError('User not authenticated', 401);
    }

    const updatedLeave = await service.cancelLeaveApplication(id, employeeId);

    res.json({
      success: true,
      message: 'Leave application cancelled successfully',
      data: updatedLeave,
    });
  } catch (err: unknown) {
    const error = err as { message: string; statusCode?: number };
    next(new AppError(error.message, error.statusCode || 400));
  }
};

export const getLeaveStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchId = req.user?.role === EmployeeRole.ADMIN ? undefined : req.user?.branchId;

    const stats = await service.getLeaveStats(branchId);

    res.json({
      success: true,
      message: 'Leave statistics fetched successfully',
      data: stats,
    });
  } catch (err: unknown) {
    const error = err as { message: string; statusCode?: number };
    next(new AppError(error.message, error.statusCode || 500));
  }
};
