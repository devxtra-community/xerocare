import { Repository, DataSource } from 'typeorm';
import { RfqVendorItem } from '../entities/rfqVendorItemEntity';

export class RfqVendorItemRepository extends Repository<RfqVendorItem> {
  constructor(dataSource: DataSource) {
    super(RfqVendorItem, dataSource.createEntityManager());
  }
}
