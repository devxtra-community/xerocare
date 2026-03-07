import { Repository, DataSource } from 'typeorm';
import { RfqItem } from '../entities/rfqItemEntity';

export class RfqItemRepository extends Repository<RfqItem> {
  constructor(dataSource: DataSource) {
    super(RfqItem, dataSource.createEntityManager());
  }
}
