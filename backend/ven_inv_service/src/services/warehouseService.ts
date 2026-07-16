import { WarehouseRepository } from '../repositories/warehouseRepository';
import { Warehouse, WarehouseStatus } from '../entities/warehouseEntity';
import { AppError } from '../errors/appError';

export class WarehouseService {
  private repo = new WarehouseRepository();

  /**
   * Creates a new warehouse.
   */
  async createWarehouse(payload: Partial<Warehouse>) {
    if (!payload.warehouseName || !payload.warehouseCode) {
      throw new AppError('Warehouse name and code are required', 400);
    }
    if (!payload.branchId) delete payload.branchId;
    try {
      return await this.repo.create(payload);
    } catch (err: unknown) {
      const dbErr = err as { code?: string };
      if (dbErr.code === '23505') {
        throw new AppError('A warehouse with this code already exists', 409);
      }
      throw err;
    }
  }

  /**
   * Retrieves all warehouses.
   */
  async getWarehouses() {
    return this.repo.findAll();
  }

  /**
   * Retrieves a warehouse by ID.
   */
  async getWarehouseById(id: string) {
    const warehouse = await this.repo.findById(id);
    if (!warehouse || warehouse.status === WarehouseStatus.DELETED) {
      throw new AppError('Warehouse not found', 404);
    }
    return warehouse;
  }

  /**
   * Updates a warehouse.
   */
  async updateWarehouse(id: string, payload: Partial<Warehouse>) {
    const warehouse = await this.getWarehouseById(id);
    if (!warehouse) {
      throw new AppError('Warehouse not found', 404);
    }
    if (!payload.branchId) delete payload.branchId;
    try {
      return await this.repo.update(id, payload);
    } catch (err: unknown) {
      const dbErr = err as { code?: string };
      if (dbErr.code === '23505') {
        throw new AppError('A warehouse with this code already exists', 409);
      }
      throw err;
    }
  }

  /**
   * Soft deletes a warehouse.
   */
  async deleteWarehouse(id: string) {
    const warehouse = await this.getWarehouseById(id);
    if (!warehouse) {
      throw new AppError('Warehouse not found', 404);
    }
    await this.repo.softDelete(id);
    return true;
  }

  /**
   * Retrieves warehouses for a specific branch.
   */
  async getWarehousesByBranch(branchId: string) {
    if (!branchId) {
      throw new AppError('Branch ID is required', 400);
    }
    return this.repo.findByBranchId(branchId);
  }
}
