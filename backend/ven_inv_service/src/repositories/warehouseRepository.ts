import { Warehouse, WarehouseStatus } from '../entities/warehouseEntity';
import { Source } from '../config/db';

export class WarehouseRepository {
  private get repo() {
    return Source.getRepository(Warehouse);
  }

  async create(payload: Partial<Warehouse>) {
    const warehouse = this.repo.create(payload);
    return this.repo.save(warehouse);
  }

  async findAll() {
    return this.repo.find({
      where: [{ status: WarehouseStatus.ACTIVE }, { status: WarehouseStatus.INACTIVE }],
      relations: ['branch'],
    });
  }

  async findById(id: string) {
    return this.repo.findOne({
      where: { id },
      relations: ['branch'],
    });
  }

  async update(id: string, payload: Partial<Warehouse>) {
    await this.repo.update(id, payload);
    return this.findById(id);
  }

  async softDelete(id: string) {
    return this.repo.update(id, { status: WarehouseStatus.DELETED });
  }
}
