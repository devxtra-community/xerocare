import { Repository, DataSource } from 'typeorm';
import { InventoryMovement } from '../entities/inventoryMovementEntity';

export class InventoryMovementRepository {
  private repo: Repository<InventoryMovement>;

  constructor(ds: DataSource) {
    this.repo = ds.getRepository(InventoryMovement);
  }

  create(data: Partial<InventoryMovement>) {
    return this.repo.save(this.repo.create(data));
  }
}
