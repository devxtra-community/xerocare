import { Request, Response, NextFunction } from 'express';
import { InventoryReturnService } from '../services/inventoryReturnService';
import { AppError } from '../errors/appError';
import { Source } from '../config/db';
import { SparePart } from '../entities/sparePartEntity';
import { deleteCached } from '../utils/cacheUtil';

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

// Decrement spare part available quantity when it's allocated as a replacement unit
export const allocateSparePart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const quantity: number = Number(req.body.quantity) || 1;

    if (quantity < 1) throw new AppError('quantity must be at least 1', 400);

    const repo = Source.getRepository(SparePart);
    const part = await repo.findOne({ where: { id: id as string } });
    if (!part) throw new AppError('Spare part not found', 404);
    if (part.quantity < quantity) throw new AppError('Insufficient available stock', 400);

    part.quantity -= quantity;
    await repo.save(part);
    await deleteCached(`sparepart:${id}`);

    res.json({
      success: true,
      message: 'Spare part allocated successfully',
      remaining: part.quantity,
    });
  } catch (err) {
    next(err);
  }
};
