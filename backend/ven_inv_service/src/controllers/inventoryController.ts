import { Request, Response, NextFunction } from 'express';
import { InventoryService } from '../services/inventoryService';
import { Source } from '../config/db';

const service = new InventoryService(Source);

export class InventoryController {
  addStock = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { productId, warehouseId, qty } = req.body;
      await service.addStock(productId, warehouseId, qty);
      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  };

  markDamaged = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { productId, warehouseId, qty } = req.body;
      await service.markDamaged(productId, warehouseId, qty);
      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  };

  all = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await service.getAllStock();
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  };

  byWarehouse = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await service.getWarehouseStock(req.params.warehouseId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  };

  byBranch = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await service.getBranchStock(req.params.branchId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  };
}
