import { InventoryRepository } from '../repositories/inventoryRepository';

export class InventoryService {
  private repo = new InventoryRepository();

  /**
   * Retrieves global inventory with optional filters.
   */
  getGlobalInventory(filters?: {
    product?: string;
    warehouse?: string;
    branch?: string;
    year?: number;
  }) {
    return this.repo.getGlobalInventory(filters);
  }

  /**
   * Retrieves inventory for a specific branch.
   */
  getBranchInventory(branchId: string, year?: number) {
    return this.repo.getBranchInventory(branchId, year);
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
