import { Request, Response, NextFunction } from 'express';
import { InventoryService } from '../services/inventoryService';
import { AppError } from '../errors/appError';

const service = new InventoryService();

/**
 * Retrieves global inventory across all warehouses.
 */
export const getGlobalInventory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { product, warehouse, branch } = req.query as {
      product?: string;
      warehouse?: string;
      branch?: string;
    };
    const data = await service.getGlobalInventory({ product, warehouse, branch });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/**
 * Retrieves inventory specific to a branch.
 */
export const getBranchInventory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchId = req.user?.branchId as string;
    if (!branchId) {
      throw new AppError('Branch ID missing from user token', 400);
    }
    const data = await service.getBranchInventory(branchId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/**
 * Retrieves inventory for a specific warehouse.
 */
export const getWarehouseInventory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { warehouseId } = req.query as { warehouseId: string };
    const data = await service.getWarehouseInventory(warehouseId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/**
 * Retrieves inventory statistics.
 */
export const getInventoryStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchId = req.user?.branchId;
    const stats = await service.getInventoryStats(branchId);
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
};
