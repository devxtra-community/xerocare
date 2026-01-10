import { Repository, DataSource } from 'typeorm';
import { Inventory } from '../entities/inventoryEntity';

export class InventoryRepository {
  private repo: Repository<Inventory>;

  constructor(ds: DataSource) {
    this.repo = ds.getRepository(Inventory);
  }

  findByProductWarehouse(productId: string, warehouseId: string) {
    return this.repo.findOne({
      where: {
        product: { id: productId },
        warehouse: { id: warehouseId },
      },
      relations: ['product', 'warehouse'],
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
      relations: ['product', 'warehouse'],
    });
  }

  getByWarehouse(warehouseId: string) {
    return this.repo.find({
      where: { warehouse: { id: warehouseId } },
      relations: ['product'],
    });
  }

  getByBranch(branchId: string) {
    return this.repo
      .createQueryBuilder('i')
      .leftJoinAndSelect('i.product', 'p')
      .leftJoin('i.warehouse', 'w')
      .where('w.branchId = :branchId', { branchId })
      .getMany();
  }
}
