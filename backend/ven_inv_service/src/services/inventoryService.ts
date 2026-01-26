import { InventoryRepository } from '../repositories/inventoryRepository';

export class InventoryService {
  private repo = new InventoryRepository();

  getGlobalInventory() {
    return this.repo.getGlobalInventory();
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
