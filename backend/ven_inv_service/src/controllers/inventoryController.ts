import { Request, Response, NextFunction } from 'express';
import { InventoryService } from '../services/inventoryService';

const service = new InventoryService();
// ADMIN
export const getGlobalInventory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await service.getGlobalInventory();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// MANAGER — uses token branchId
export const getBranchInventory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchId = req.user?.branchId as string;
    const data = await service.getBranchInventory(branchId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// WAREHOUSE STAFF
export const getWarehouseInventory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { warehouseId } = req.query as { warehouseId: string };
    const data = await service.getWarehouseInventory(warehouseId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// DASHBOARD STATS
export const getInventoryStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchId = req.user?.branchId;
    const stats = await service.getInventoryStats(branchId);
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
};
