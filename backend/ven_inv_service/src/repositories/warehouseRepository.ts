import { Warehouse, WarehouseStatus } from '../entities/warehouseEntity';
import { Source } from '../config/db';

export class WarehouseRepository {
  private get repo() {
    return Source.getRepository(Warehouse);
  }

  /**
   * Creates a new warehouse.
   */
  async create(payload: Partial<Warehouse>) {
    const warehouse = this.repo.create(payload);
    return this.repo.save(warehouse);
  }

  /**
   * Finds all available warehouses.
   */
  async findAll() {
    return this.repo.find({
      where: [{ status: WarehouseStatus.ACTIVE }, { status: WarehouseStatus.INACTIVE }],
      relations: ['branch'],
    });
  }

  /**
   * Finds a warehouse by ID.
   */
  async findById(id: string) {
    return this.repo.findOne({
      where: { id },
      relations: ['branch'],
    });
  }

  /**
   * Updates a warehouse.
   */
  async update(id: string, payload: Partial<Warehouse>) {
    await this.repo.update(id, payload);
    return this.findById(id);
  }

  /**
   * Soft deletes a warehouse.
   */
  async softDelete(id: string) {
    return this.repo.update(id, { status: WarehouseStatus.DELETED });
  }

  /**
   * Finds warehouses by branch ID.
   */
  async findByBranchId(branchId: string) {
    return this.repo.find({
      where: [
        { branchId, status: WarehouseStatus.ACTIVE },
        { branchId, status: WarehouseStatus.INACTIVE },
      ],
      relations: ['branch'],
    });
  }
}
