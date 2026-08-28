import { Request, Response, NextFunction } from 'express';
import { TargetService, RequestUser } from '../services/targetService';
import { AppError } from '../errors/appError';

const targetService = new TargetService();

function requireUser(req: Request): RequestUser {
  if (!req.user) throw new AppError('Not authenticated', 401);
  return { userId: req.user.userId, role: req.user.role, branchId: req.user.branchId };
}

export const createTarget = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = requireUser(req);
    const { employeeId, targetMonth, targetAmount, tiers } = req.body;
    const target = await targetService.createTarget(user, {
      employeeId,
      targetMonth,
      targetAmount,
      tiers,
    });
    res.status(201).json({ success: true, message: 'Target created successfully', data: target });
  } catch (error) {
    next(error);
  }
};

export const listTargets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = requireUser(req);
    const { month, employeeId, branchId } = req.query;
    const targets = await targetService.listTargets(user, {
      month: month as string | undefined,
      employeeId: employeeId as string | undefined,
      branchId: branchId as string | undefined,
    });
    res.status(200).json({ success: true, data: targets });
  } catch (error) {
    next(error);
  }
};

export const getTargetById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = requireUser(req);
    const result = await targetService.getTargetById(user, req.params.id as string);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const updateTarget = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = requireUser(req);
    const { targetAmount, tiers } = req.body;
    const target = await targetService.updateTarget(user, req.params.id as string, {
      targetAmount,
      tiers,
    });
    res.status(200).json({ success: true, message: 'Target updated successfully', data: target });
  } catch (error) {
    next(error);
  }
};

export const cancelTarget = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = requireUser(req);
    const target = await targetService.cancelTarget(user, req.params.id as string);
    res.status(200).json({ success: true, message: 'Target cancelled successfully', data: target });
  } catch (error) {
    next(error);
  }
};

export const listByEmployee = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = requireUser(req);
    const targets = await targetService.listByEmployee(user, req.params.employeeId as string);
    res.status(200).json({ success: true, data: targets });
  } catch (error) {
    next(error);
  }
};

export const monthlyAchievement = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = requireUser(req);
    const { month, search } = req.query;
    const rows = await targetService.monthlyAchievement(
      user,
      month as string,
      req.branchFilter ?? [],
      search as string | undefined,
    );
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

export const myTargets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = requireUser(req);
    const rows = await targetService.myTargets(user);
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

export const myTargetMonth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = requireUser(req);
    const result = await targetService.myTargetMonth(user, req.params.month as string);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const leaderboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = requireUser(req);
    const { month, search } = req.query;
    const rows = await targetService.leaderboard(
      user,
      month as string,
      req.branchFilter ?? [],
      search as string | undefined,
    );
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

export const branchMonthlyActivity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { month } = req.query;
    const rows = await targetService.branchMonthlyActivity(req.branchFilter ?? [], month as string);
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

export const adminOverview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = requireUser(req);
    const { branchId, month, targetType } = req.query;
    const rows = await targetService.adminOverview(user, {
      branchId: branchId as string | undefined,
      month: month as string | undefined,
      targetType: targetType as string | undefined,
    });
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};
