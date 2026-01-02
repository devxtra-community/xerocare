import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/appError';
import { EmployeeService } from '../services/employeeService';
import { MulterS3File } from '../types/multer-s3-file';

const service = new EmployeeService();

export const addEmployee = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { first_name, last_name, email, role, expireDate, salary } = req.body;

    const files = req.files as {
      profile_image?: MulterS3File[];
      id_proof?: MulterS3File[];
    };

    const profileImageKey = files?.profile_image?.[0]?.key ?? null;

    const profileImageUrl = profileImageKey
      ? `${process.env.R2_PUBLIC_URL}/${process.env.R2_BUCKET}/${profileImageKey}`
      : null;

    const idProofKey = files?.id_proof?.[0]?.key ?? null;

    const employee = await service.addEmployee({
      first_name,
      last_name,
      email,
      role,
      expireDate,
      salary: salary ? Number(salary) : null,
      profile_image_url: profileImageUrl,
      id_proof_key: idProofKey,
    });

    res.status(201).json({
      message: 'Employee created successfully',
      data: employee,
      success: true,
    });
  } catch (err: any) {
    next(new AppError(err.message, err.statusCode || 400));
  }
};

export const getEmployeeIdProof = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employeeId = req.params.id;

    const result = await service.getEmployeeIdProof(employeeId);

    return res.json({ success: true, data: result });
  } catch (err: any) {
    next(new AppError(err.message, err.statusCode || 404));
  }
};

export const getAllEmployees = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const result = await service.getAllEmployees(page, limit);

    return res.json({
      success: true,
      data: result,
      message: 'Employees fetched successfully',
    });
  } catch (err: any) {
    next(new AppError(err.message, err.statusCode || 500));
  }
};

export const getEmployeeById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employee = await service.getEmployeeById(req.params.id);

    return res.json({
      success: true,
      data: employee,
      message: 'Employee fetched successfully',
    });
  } catch (err: any) {
    next(new AppError(err.message, err.statusCode || 404));
  }
};

export const deleteEmployee = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employee = await service.getEmployeeById(req.params.id);

    return res.json({
      success: true,
      data: employee,
      message: 'Employee deleted successfully',
    });
  } catch (err: any) {
    next(new AppError(err.message, err.statusCode || 500));
  }
};
