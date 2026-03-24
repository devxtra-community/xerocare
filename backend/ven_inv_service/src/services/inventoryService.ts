import { InventoryRepository } from '../repositories/inventoryRepository';
import { logger } from '../config/logger';

export class InventoryService {
  private repo = new InventoryRepository();

  /**
   * Retrieves global inventory with optional filters.
   */
  async getGlobalInventory(filters?: {
    product?: string;
    warehouse?: string;
    branch?: string;
    year?: number;
  }) {
    const result = await this.repo.getGlobalInventory(filters);
    logger.info('Fetched global inventory', { filters, recordCount: result.length });
    return result;
  }

  /**
   * Retrieves inventory for a specific branch.
   */
  async getBranchInventory(branchId: string, year?: number) {
    const result = await this.repo.getBranchInventory(branchId, year);
    logger.info('Fetched branch inventory', { branchId, recordCount: result.length });
    return result;
  }

  /**
   * Retrieves inventory for a specific warehouse.
   */
  getWarehouseInventory(warehouseId: string, year?: number) {
    return this.repo.getWarehouseInventory(warehouseId, year);
  }

  /**
   * Retrieves inventory statistics for a branch.
   */
  getInventoryStats(branchId?: string, year?: number) {
    return this.repo.getInventoryStats(branchId, year);
  }
}
