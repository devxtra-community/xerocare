import { Request, Response } from 'express';
import { WarehouseService } from '../services/warehouseService';

export class WarehouseController {
  private service = new WarehouseService();

  /**
   * Creates a new warehouse.
   */
  create = async (req: Request, res: Response) => {
    const warehouse = await this.service.createWarehouse(req.body);
    res.status(201).json({ success: true, data: warehouse });
  };

  /**
   * Lists all warehouses.
   */
  list = async (_req: Request, res: Response) => {
    const warehouses = await this.service.getWarehouses();
    res.json({ success: true, data: warehouses });
  };

  /**
   * Retrieves a warehouse by ID.
   */
  getOne = async (req: Request, res: Response) => {
    const warehouse = await this.service.getWarehouseById(req.params.id as string);
    res.json({ success: true, data: warehouse });
  };

  /**
   * Updates a warehouse.
   */
  update = async (req: Request, res: Response) => {
    const warehouse = await this.service.updateWarehouse(req.params.id as string, req.body);
    res.json({ success: true, data: warehouse });
  };

  /**
   * Soft deletes a warehouse.
   */
  delete = async (req: Request, res: Response) => {
    await this.service.deleteWarehouse(req.params.id as string);
    res.json({ success: true, message: 'Warehouse deleted successfully' });
  };

  /**
   * Retrieves warehouses for the current user's branch.
   */
  getMyBranchWarehouses = async (req: Request, res: Response) => {
    const branchId = req.user?.branchId;
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID not found in token' });
    }
    const warehouses = await this.service.getWarehousesByBranch(branchId);
    res.json({ success: true, data: warehouses });
  };
}
