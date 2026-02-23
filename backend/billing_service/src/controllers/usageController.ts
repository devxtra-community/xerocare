import { Request, Response, NextFunction } from 'express';
import { MulterS3File } from '../types/multer-s3-file';
import { UsageService } from '../services/usageService';
import { AppError } from '../errors/appError';

const usageService = new UsageService();

/**
 * Creates a new usage record for a contract (e.g., meter readings).
 * Handles file upload for meter image evidence.
 */
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
    const meterImageUrl = file?.key; // Store the KEY (path/filename), not the full URL.

    if (!contractId || !billingPeriodStart || !billingPeriodEnd) {
      throw new AppError('Missing required fields', 400);
    }

    // Safety: Ensure counts are numbers (default 0 handled in service/repo if undefined, but explicit is better)
    const result = await usageService.recordUsage({
      contractId,
      billingPeriodStart,
      billingPeriodEnd,
      bwA4Count: Number(bwA4Count) || 0,
      bwA3Count: Number(bwA3Count) || 0,
      colorA4Count: Number(colorA4Count) || 0,
      colorA3Count: Number(colorA3Count) || 0,
      meterImageUrl,
      reportedBy: reportedBy || 'EMPLOYEE', // Default if missing
      remarks,
    });

    return res.status(201).json({
      success: true,
      data: result,
      message: 'Usage record created successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const updateUsageRecord = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { bwA4Count, bwA3Count, colorA4Count, colorA3Count, billingPeriodEnd } = req.body;

    const result = await usageService.updateUsageRecord(id, {
      bwA4Count: Number(bwA4Count) || 0,
      bwA3Count: Number(bwA3Count) || 0,
      colorA4Count: Number(colorA4Count) || 0,
      colorA3Count: Number(colorA3Count) || 0,
      billingPeriodEnd,
    });

    return res.status(200).json({
      success: true,
      data: result,
      message: 'Usage record updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves the usage history for a specific contract.
 */
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

/**
 * Manually accepts usage triggering the sending of monthly invoice.
 */
export const sendMonthlyInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const result = await usageService.sendMonthlyInvoice(id);
    return res.status(200).json({
      success: true,
      data: result,
      message: 'Monthly invoice sent successfully',
    });
  } catch (error) {
    next(error);
  }
};
