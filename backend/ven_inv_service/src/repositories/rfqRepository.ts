import { Repository, DataSource } from 'typeorm';
import { Rfq } from '../entities/rfqEntity';

export class RfqRepository extends Repository<Rfq> {
  constructor(dataSource: DataSource) {
    super(Rfq, dataSource.createEntityManager());
  }

  async findWithDetails(id: string): Promise<Rfq | null> {
    return this.findOne({
      where: { id },
      relations: ['items', 'vendors', 'vendors.vendor', 'vendors.items', 'branch', 'creator'],
    });
  }
}
