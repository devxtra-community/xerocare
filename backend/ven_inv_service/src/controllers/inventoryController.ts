import { Request, Response, NextFunction } from 'express';
import { InventoryService } from '../services/inventoryService';
import { AppError } from '../errors/appError';

const service = new InventoryService();

/**
 * Retrieves global inventory across all warehouses.
 */
export const getGlobalInventory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { product, warehouse, branch, year } = req.query as {
      product?: string;
      warehouse?: string;
      branch?: string;
      year?: string;
    };
    const data = await service.getGlobalInventory({
      product,
      warehouse,
      branch,
      year: year ? parseInt(year) : undefined,
    });
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
    const { year } = req.query as { year?: string };
    const data = await service.getBranchInventory(branchId, year ? parseInt(year) : undefined);
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
    const { warehouseId, year } = req.query as { warehouseId: string; year?: string };
    const data = await service.getWarehouseInventory(
      warehouseId,
      year ? parseInt(year) : undefined,
    );
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
    const { year } = req.query as { year?: string };
    const stats = await service.getInventoryStats(branchId, year ? parseInt(year) : undefined);
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
};
