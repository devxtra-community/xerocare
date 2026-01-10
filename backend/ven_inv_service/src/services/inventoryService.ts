import { DataSource } from 'typeorm';
import { InventoryRepository } from '../repositories/inventoryRepository';
import { InventoryMovementRepository } from '../repositories/inventoryMovementRepository';
import { StockMovementType } from '../entities/inventoryMovementEntity';
import { AppError } from '../errors/appError';

export class InventoryService {
  constructor(private ds: DataSource) {}

  async addStock(productId: string, warehouseId: string, qty: number, ref?: string) {
    if (qty <= 0) throw new AppError('Invalid quantity', 400);

    await this.ds.transaction(async (manager) => {
      const invRepo = new InventoryRepository(manager.connection);
      const movRepo = new InventoryMovementRepository(manager.connection);

      const inv = await invRepo.findByProductWarehouse(productId, warehouseId);
      if (!inv) throw new AppError('Inventory not found', 404);

      inv.total_qty += qty;
      inv.available_qty += qty;

      await invRepo.save(inv);

      await movRepo.create({
        inventory: inv,
        quantity: qty,
        type: StockMovementType.IN,
        reference: ref,
      });
    });
  }

  async markDamaged(productId: string, warehouseId: string, qty: number) {
    if (qty <= 0) throw new AppError('Invalid quantity', 400);

    await this.ds.transaction(async (manager) => {
      const invRepo = new InventoryRepository(manager.connection);
      const movRepo = new InventoryMovementRepository(manager.connection);

      const inv = await invRepo.findByProductWarehouse(productId, warehouseId);
      if (!inv) throw new AppError('Inventory not found', 404);
      if (inv.available_qty < qty) throw new AppError('Not enough stock', 400);

      inv.available_qty -= qty;
      inv.damaged_qty += qty;

      await invRepo.save(inv);

      await movRepo.create({
        inventory: inv,
        quantity: qty,
        type: StockMovementType.DAMAGE,
      });
    });
  }

  getAllStock() {
    const repo = new InventoryRepository(this.ds);
    return repo.getAll();
  }

  getWarehouseStock(warehouseId: string) {
    const repo = new InventoryRepository(this.ds);
    return repo.getByWarehouse(warehouseId);
  }

  getBranchStock(branchId: string) {
    const repo = new InventoryRepository(this.ds);
    return repo.getByBranch(branchId);
  }
}
