import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/appError';
import { EmployeeService } from '../services/employeeService';
import { MulterS3File } from '../types/multer-s3-file';
import { logger } from '../config/logger';
import { EmployeeRole } from '../constants/employeeRole';

const service = new EmployeeService();

/**
 * Adds a new employee.
 */
export const addEmployee = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      first_name,
      last_name,
      email,
      role,
      employee_job,
      finance_job,
      expireDate,
      salary,
      branchId,
    } = req.body;

    const files = req.files as {
      profile_image?: MulterS3File[];
      id_proof?: MulterS3File[];
    };

    const profileImageKey = files?.profile_image?.[0]?.key ?? null;

    const profileImageUrl = profileImageKey
      ? `${process.env.R2_PUBLIC_URL}/${profileImageKey}`
      : null;

    const idProofKey = files?.id_proof?.[0]?.key ?? null;

    const employee = await service.addEmployee({
      first_name,
      last_name,
      email,
      role,
      employee_job,
      finance_job,
      expireDate,
      salary: salary ? Number(salary) : null,
      profile_image_url: profileImageUrl,
      id_proof_key: idProofKey,
      branchId,
    });

    res.status(201).json({
      message: 'Employee created successfully',
      data: employee,
      success: true,
    });
  } catch (err: unknown) {
    const error = err as { message: string; statusCode?: number };
    next(new AppError(error.message, error.statusCode || 400));
  }
};

/**
 * Retrieves a signed URL for viewing an employee's ID proof.
 */
export const getEmployeeIdProof = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employeeId = req.params.id as string;

    const result = await service.getEmployeeIdProof(employeeId);

    return res.json({ success: true, data: result });
  } catch (err: unknown) {
    const error = err as { message: string; statusCode?: number };
    next(new AppError(error.message, error.statusCode || 404));
  }
};

/**
 * Retrieves all employees with pagination and filtering.
 */
export const getAllEmployees = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const role = req.query.role as EmployeeRole | undefined;

    // Branch filtering: Admin and HR see all employees, others (MANAGERS) see only their branch
    const branchId =
      req.user?.role === EmployeeRole.ADMIN || req.user?.role === EmployeeRole.HR
        ? undefined
        : req.user?.branchId;

    const result = await service.getAllEmployees(page, limit, role, branchId);
    logger.debug('Fetched employees', {
      count: result.employees.length,
      page,
      limit,
      role,
      branchId,
    });
    return res.json({
      success: true,
      data: result,
      message: 'Employees fetched successfully',
    });
  } catch (err: unknown) {
    const error = err as { message: string; statusCode?: number };
    next(new AppError(error.message, error.statusCode || 500));
  }
};

/**
 * Retrieves a single employee by ID.
 */
export const getEmployeeById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employee = await service.getEmployeeById(req.params.id as string);

    // Security check for managers: can only see employees in their branch
    if (req.user?.role === EmployeeRole.MANAGER && employee.branch_id !== req.user.branchId) {
      throw new AppError('Access denied: employee belongs to another branch', 403);
    }

    return res.json({
      success: true,
      data: employee,
      message: 'Employee fetched successfully',
    });
  } catch (err: unknown) {
    const error = err as { message: string; statusCode?: number };
    next(new AppError(error.message, error.statusCode || 404));
  }
};

/**
 * Retrieves a public profile for an employee (limited data).
 */
export const getPublicEmployeeProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employee = await service.getPublicEmployeeProfile(req.params.id as string);

    return res.json({
      success: true,
      data: employee,
      message: 'Employee profile fetched successfully',
    });
  } catch (err: unknown) {
    const error = err as { message: string; statusCode?: number };
    next(new AppError(error.message, error.statusCode || 404));
  }
};

/**
 * Updates an employee's details.
 */
export const updateEmployee = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const files = req.files as {
      profile_image?: MulterS3File[];
      id_proof?: MulterS3File[];
    };

    const profileImageKey = files?.profile_image?.[0]?.key ?? null;
    const profileImageUrl = profileImageKey
      ? `${process.env.R2_PUBLIC_URL}/${process.env.R2_BUCKET}/${profileImageKey}`
      : null;

    const idProofKey = files?.id_proof?.[0]?.key ?? null;

    const payload = {
      ...req.body,
      salary: req.body.salary ? Number(req.body.salary) : undefined,
      profile_image_url: profileImageUrl || undefined,
      id_proof_key: idProofKey || undefined,
      branchId: req.body.branchId || undefined,
    };

    const employee = await service.getEmployeeById(req.params.id as string);

    // Security check for managers: can only update employees in their branch
    if (req.user?.role === EmployeeRole.MANAGER && employee.branch_id !== req.user.branchId) {
      throw new AppError('Access denied: employee belongs to another branch', 403);
    }

    const updatedEmployee = await service.updateEmployee(req.params.id as string, payload);

    return res.json({
      success: true,
      message: 'Employee updated successfully',
      data: updatedEmployee,
    });
  } catch (err: unknown) {
    const error = err as { message: string; statusCode?: number };
    next(new AppError(error.message, error.statusCode || 400));
  }
};

/**
 * Soft deletes an employee (marks as INACTIVE).
 */
export const deleteEmployee = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.deleteEmployee(req.params.id as string);

    return res.json({
      success: true,
      message: 'Employee deleted successfully',
    });
  } catch (err: unknown) {
    const error = err as { message: string; statusCode?: number };
    next(new AppError(error.message, error.statusCode || 500));
  }
};

/**
 * Retrieves HR statistics (counts, growth, job types).
 */
export const getHRStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Branch filtering: Admin and HR see all stats, others (MANAGERS) see only their branch
    const branchId =
      req.user?.role === EmployeeRole.ADMIN || req.user?.role === EmployeeRole.HR
        ? undefined
        : req.user?.branchId;

    const stats = await service.getHRStats(branchId);
    logger.info('HR Stats fetched', { keys: Object.keys(stats) });
    return res.json({
      success: true,
      data: stats,
      message: 'HR stats fetched successfully',
    });
  } catch (err: unknown) {
    const error = err as { message: string; statusCode?: number };
    next(new AppError(error.message, error.statusCode || 500));
  }
};
