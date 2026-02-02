import { Request, Response, NextFunction } from 'express';
import { MulterS3File } from '../types/multer-s3-file';
import { UsageService } from '../services/usageService';
import { AppError } from '../errors/appError';

const usageService = new UsageService();

export const createUsageRecord = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { branchId, employeeId, createdByVerified, ...payload } = req.body;

    const {
      contractId,
      billingPeriodStart,
      billingPeriodEnd,
      bwA4Count,
      bwA3Count,
      colorA4Count,
      colorA3Count,
      reportedBy,
      remarks,
    } = payload;

    const file = req.file as MulterS3File | undefined;
    const meterImageUrl = file?.location; // Public URL from MulterS3/R2

    if (!contractId || !billingPeriodStart || !billingPeriodEnd || !reportedBy) {
      throw new AppError('Missing required fields', 400);
    }

    // Safety: Ensure counts are numbers (default 0 handled in service/repo if undefined, but explicit is better)
    const usage = await usageService.createUsageRecord({
      contractId,
      billingPeriodStart,
      billingPeriodEnd,
      bwA4Count: Number(bwA4Count) || 0,
      bwA3Count: Number(bwA3Count) || 0,
      colorA4Count: Number(colorA4Count) || 0,
      colorA3Count: Number(colorA3Count) || 0,
      reportedBy,
      recordedByEmployeeId: req.user?.userId,
      remarks,
      meterImageUrl,
    });

    return res.status(201).json({
      success: true,
      data: usage,
      message: 'Usage record created successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const updateUsageRecord = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const payload = req.body;

    const usage = await usageService.updateUsageRecord(id, {
      bwA4Count: payload.bwA4Count !== undefined ? Number(payload.bwA4Count) : undefined,
      bwA3Count: payload.bwA3Count !== undefined ? Number(payload.bwA3Count) : undefined,
      colorA4Count: payload.colorA4Count !== undefined ? Number(payload.colorA4Count) : undefined,
      colorA3Count: payload.colorA3Count !== undefined ? Number(payload.colorA3Count) : undefined,
      remarks: payload.remarks,
    });

    return res.status(200).json({
      success: true,
      data: usage,
      message: 'Usage record updated',
    });
  } catch (error) {
    next(error);
  }
};

export const getUsageHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contractId = req.params.contractId as string;
    const history = await usageService.getUsageHistory(contractId);
    return res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    next(error);
  }
};
