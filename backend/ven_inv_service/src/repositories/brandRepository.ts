import { Repository, DataSource } from 'typeorm';
import { Brand } from '../entities/brandEntity';

export class BrandRepository extends Repository<Brand> {
  constructor(dataSource: DataSource) {
    super(Brand, dataSource.createEntityManager());
  }

  /**
   * Finds a brand by its name.
   */
  async findByName(name: string): Promise<Brand | null> {
    return this.findOne({ where: { name } });
  }
}
