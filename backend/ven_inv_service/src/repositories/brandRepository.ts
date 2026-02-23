import { Repository, DataSource, FindOptionsWhere } from 'typeorm';
import { Brand } from '../entities/brandEntity';

export class BrandRepository extends Repository<Brand> {
  constructor(dataSource: DataSource) {
    super(Brand, dataSource.createEntityManager());
  }

  /**
   * Finds a brand by its name and branch.
   */
  async findByName(name: string, branchId?: string): Promise<Brand | null> {
    const where: FindOptionsWhere<Brand> = { name };
    if (branchId) {
      where.branch_id = branchId;
    }
    return this.findOne({ where });
  }

  /**
   * Retrieves all brands, optionally filtered by branch.
   */
  async findAll(branchId?: string): Promise<Brand[]> {
    const where: FindOptionsWhere<Brand> = {};
    if (branchId) {
      where.branch_id = branchId;
    }
    return this.find({
      where,
      order: { created_at: 'DESC' },
    });
  }
}
