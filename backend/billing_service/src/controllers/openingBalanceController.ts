import { Request, Response, NextFunction } from 'express';
import { OpeningBalanceService } from '../services/openingBalanceService';
import { AppError } from '../errors/appError';
import { BalanceType } from '../entities/openingBalanceEntryEntity';

const service = new OpeningBalanceService();

export const createEntry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || !req.user.userId) {
      throw new AppError('User context missing', 401);
    }
    const entry = await service.createEntry(req.body, {
      userId: req.user.userId,
      role: req.user.role,
      branchId: req.user.branchId,
    });
    res.status(201).json({
      success: true,
      message: 'Opening balance entry registered successfully',
      data: entry,
    });
  } catch (error) {
    next(error);
  }
};

export const getEntries = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('User context missing', 401);
    }
    const { page, limit, customerId, balanceType, isFullySettled } = req.query;
    const result = await service.getEntries(
      {
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        customerId: customerId ? String(customerId) : undefined,
        balanceType: balanceType ? (balanceType as string as BalanceType) : undefined,
        isFullySettled: isFullySettled !== undefined ? isFullySettled === 'true' : undefined,
      },
      {
        role: req.user.role,
        branchId: req.user.branchId,
      },
    );
    res.status(200).json({
      success: true,
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  } catch (error) {
    next(error);
  }
};

export const getEntry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('User context missing', 401);
    }
    const entry = await service.getEntryById(req.params.id as string, {
      role: req.user.role,
      branchId: req.user.branchId,
    });
    res.status(200).json({
      success: true,
      data: entry,
    });
  } catch (error) {
    next(error);
  }
};

export const getCustomerEntries = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('User context missing', 401);
    }
    const entries = await service.getCustomerEntries(req.params.customerId as string, {
      role: req.user.role,
      branchId: req.user.branchId,
    });
    res.status(200).json({
      success: true,
      data: entries,
    });
  } catch (error) {
    next(error);
  }
};

export const updateEntry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || !req.user.userId) {
      throw new AppError('User context missing', 401);
    }
    const entry = await service.updateEntry(req.params.id as string, req.body, {
      userId: req.user.userId,
      role: req.user.role,
      branchId: req.user.branchId,
    });
    res.status(200).json({
      success: true,
      message: 'Opening balance entry updated successfully',
      data: entry,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteEntry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || !req.user.userId) {
      throw new AppError('User context missing', 401);
    }
    await service.deleteEntry(req.params.id as string, {
      userId: req.user.userId,
      role: req.user.role,
      branchId: req.user.branchId,
    });
    res.status(200).json({
      success: true,
      message: 'Opening balance entry and linked invoice records soft-deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
