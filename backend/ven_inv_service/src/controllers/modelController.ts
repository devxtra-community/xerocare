import { Request, Response } from 'express';
import { AppError } from '../errors/appError';
import { ModelService } from '../services/modelService';
import { logger } from '../config/logger';

const service = new ModelService();
export const getallModels = async (req: Request, res: Response) => {
  try {
    logger.info('Fetching all models');
    const models = await service.fetchAllModels();
    if (models.length === 0) {
      return res.status(200).json({ message: 'No models found', data: models, success: true });
    }
    return res
      .status(200)
      .json({ message: 'Fetched all models successfully', data: models, success: true });
  } catch {
    throw new AppError('Error fetching models', 500);
  }
};

export const addModel = async (req: Request, res: Response) => {
  try {
    const modelData = req.body;
    const newModel = await service.createModel(modelData);
    res.status(200).json({ message: 'Model added successfully', data: newModel, success: true });
  } catch {
    throw new AppError('Failed to add model', 500);
  }
};

export const editModel = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const modelData = req.body;
    const updated = await service.modifyModel(id, modelData);
    if (!updated) {
      throw new AppError('Model not found', 404);
    }
    res.status(200).json({ message: 'Model updated successfully', success: true });
  } catch {
    throw new AppError('Failed to update model', 500);
  }
};

export const deleteModel = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const deleted = await service.removeModel(id);
    if (!deleted) {
      throw new AppError('Model not found', 404);
    }
    return res.status(200).json({ message: 'Model deleted successfully', success: true });
  } catch {
    throw new AppError('Failed to delete model', 500);
  }
};
