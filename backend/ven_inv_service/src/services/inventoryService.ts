import { InventoryRepository } from '../repositories/inventoryRepository';

export class InventoryService {
  private repo = new InventoryRepository();

  getGlobalInventory(filters?: { product?: string; warehouse?: string; branch?: string }) {
    return this.repo.getGlobalInventory(filters);
  }

  getBranchInventory(branchId: string) {
    return this.repo.getBranchInventory(branchId);
  }

  getWarehouseInventory(warehouseId: string) {
    return this.repo.getWarehouseInventory(warehouseId);
  }

  getInventoryStats(branchId?: string) {
    return this.repo.getInventoryStats(branchId);
  }
}
