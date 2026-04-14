import { Request, Response, NextFunction } from 'express';
import { InventoryReturnService } from '../services/inventoryReturnService';
import { AppError } from '../errors/appError';

const returnService = new InventoryReturnService();

export const processInventoryReturn = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { itemType, itemId, quantity } = req.body;

    if (!itemType || !itemId) {
      throw new AppError('itemType and itemId are required', 400);
    }

    const result = await returnService.processReturn(itemType, itemId, quantity || 1);
    res.json(result);
  } catch (err) {
    next(err);
  }
};
