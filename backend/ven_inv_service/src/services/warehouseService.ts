import { WarehouseRepository } from '../repositories/warehouseRepository';
import { Warehouse, WarehouseStatus } from '../entities/warehouseEntity';
import { AppError } from '../errors/appError';

export class WarehouseService {
  constructor(private readonly repo: WarehouseRepository) {}

  async createWarehouse(payload: Partial<Warehouse>) {
    if (!payload.warehouseName || !payload.warehouseCode) {
      throw new AppError('Warehouse name and code are required', 400);
    }
    return this.repo.create(payload);
  }

  async getWarehouses() {
    return this.repo.findAll();
  }

  async getWarehouseById(id: string) {
    const warehouse = await this.repo.findById(id);
    if (!warehouse || warehouse.status === WarehouseStatus.DELETED) {
      throw new AppError('Warehouse not found', 404);
    }
    return warehouse;
  }

  async updateWarehouse(id: string, payload: Partial<Warehouse>) {
    const warehouse = await this.getWarehouseById(id);
    if (!warehouse) {
      throw new AppError('Warehouse not found', 404);
    }
    return this.repo.update(id, payload);
  }

  async deleteWarehouse(id: string) {
    const warehouse = await this.getWarehouseById(id);
    if (!warehouse) {
      throw new AppError('Warehouse not found', 404);
    }
    await this.repo.softDelete(id);
    return true;
  }
}
