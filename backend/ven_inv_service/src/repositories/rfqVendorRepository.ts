import { Repository, DataSource } from 'typeorm';
import { RfqVendor } from '../entities/rfqVendorEntity';

export class RfqVendorRepository extends Repository<RfqVendor> {
  constructor(dataSource: DataSource) {
    super(RfqVendor, dataSource.createEntityManager());
  }
}
