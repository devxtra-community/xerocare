import { InventoryRepository } from '../repositories/inventoryRepository';

export class InventoryService {
  private repo = new InventoryRepository();

  /**
   * Retrieves global inventory with optional filters.
   */
  getGlobalInventory(filters?: { product?: string; warehouse?: string; branch?: string }) {
    return this.repo.getGlobalInventory(filters);
  }

  /**
   * Retrieves inventory for a specific branch.
   */
  getBranchInventory(branchId: string) {
    return this.repo.getBranchInventory(branchId);
  }

  /**
   * Retrieves inventory for a specific warehouse.
   */
  getWarehouseInventory(warehouseId: string) {
    return this.repo.getWarehouseInventory(warehouseId);
  }

  /**
   * Retrieves inventory statistics for a branch.
   */
  getInventoryStats(branchId?: string) {
    return this.repo.getInventoryStats(branchId);
  }
}
