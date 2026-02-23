import { Request, Response } from 'express';
import { AppError } from '../errors/appError';
import { ModelService } from '../services/modelService';
import { logger } from '../config/logger';

const service = new ModelService();
/**
 * Retrieves all models, optionally filtered by branch.
 */
export const getallModels = async (req: Request, res: Response) => {
  try {
    const branchId = req.user?.branchId;
    const isAdmin = req.user?.role === 'ADMIN';
    const filteredBranchId = isAdmin ? undefined : branchId;

    logger.info(`Fetching models for branch: ${filteredBranchId || 'All'}`);
    const models = await service.fetchAllModels(filteredBranchId);

    if (!models || models.length === 0) {
      return res.status(200).json({ message: 'No models found', data: [], success: true });
    }

    return res
      .status(200)
      .json({ message: 'Fetched all models successfully', data: models, success: true });
  } catch (error) {
    logger.error('Error in getallModels:', error);
    throw new AppError('Error fetching models', 500);
  }
};

/**
 * Adds a new model.
 */
export const addModel = async (req: Request, res: Response) => {
  try {
    const branchId = req.user?.branchId;
    const modelData = req.body;
    const newModel = await service.createModel(modelData, branchId);
    res.status(200).json({ message: 'Model added successfully', data: newModel, success: true });
  } catch {
    throw new AppError('Failed to add model', 500);
  }
};

/**
 * Edits an existing model.
 */
export const editModel = async (req: Request, res: Response) => {
  try {
    const branchId = req.user?.branchId;
    const isAdmin = req.user?.role === 'ADMIN';
    const filteredBranchId = isAdmin ? undefined : branchId;

    const id = req.params.id as string;
    const modelData = req.body;
    const updated = await service.modifyModel(id, modelData, filteredBranchId);
    if (!updated) {
      throw new AppError('Model not found', 404);
    }
    res.status(200).json({ message: 'Model updated successfully', success: true });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to update model', 500);
  }
};

/**
 * Deletes a model, ensuring no foreign key constraints.
 */
export const deleteModel = async (req: Request, res: Response) => {
  try {
    const branchId = req.user?.branchId;
    const isAdmin = req.user?.role === 'ADMIN';
    const filteredBranchId = isAdmin ? undefined : branchId;

    const id = req.params.id as string;
    const deleted = await service.removeModel(id, filteredBranchId);
    if (!deleted) {
      throw new AppError('Model not found', 404);
    }
    return res.status(200).json({ message: 'Model deleted successfully', success: true });
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    const err = error as { code?: string; message?: string };
    if (err.code == '23503' || (err.message && err.message.includes('foreign key constraint'))) {
      throw new AppError(
        'this model contains products. first delete all associated products to delete model',
        409,
      );
    }
    throw new AppError('Failed to delete model', 500);
  }
};

/**
 * Syncs model quantities with product counts.
 */
export const syncQuantities = async (req: Request, res: Response) => {
  try {
    await service.syncQuantities();
    res.status(200).json({ message: 'Model quantities synced successfully', success: true });
  } catch (error) {
    logger.error('Error syncing quantities:', error);
    throw new AppError('Failed to sync quantities', 500);
  }
};
