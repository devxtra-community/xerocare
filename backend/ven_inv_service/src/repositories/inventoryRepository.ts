import { Repository, DataSource } from 'typeorm';
import { Inventory } from '../entities/inventoryEntity';

export class InventoryRepository {
  private repo: Repository<Inventory>;

  constructor(ds: DataSource) {
    this.repo = ds.getRepository(Inventory);
  }

  findByProductWarehouse(modelId: string, warehouseId: string) {
    return this.repo.findOne({
      where: {
        model: { id: modelId },
        warehouse: { id: warehouseId },
      },
      relations: ['model', 'warehouse'],
    });
  }

  save(inv: Inventory) {
    return this.repo.save(inv);
  }

  create(inv: Partial<Inventory>) {
    return this.repo.save(this.repo.create(inv));
  }

  getAll() {
    return this.repo.find({
      relations: ['model', 'warehouse'],
    });
  }

  getByWarehouse(warehouseId: string) {
    return this.repo.find({
      where: { warehouse: { id: warehouseId } },
      relations: ['model', 'warehouse'],
    });
  }

  getByBranch(branchId: string) {
    return this.repo
      .createQueryBuilder('i')
      .leftJoinAndSelect('i.model', 'm')
      .leftJoin('i.warehouse', 'w')
      .where('w.branchId = :branchId', { branchId })
      .getMany();
  }
}
