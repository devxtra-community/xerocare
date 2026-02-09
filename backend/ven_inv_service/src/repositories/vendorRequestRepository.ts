import { Repository, DataSource } from 'typeorm';
import { VendorRequest } from '../entities/vendorRequestEntity';

export class VendorRequestRepository extends Repository<VendorRequest> {
  constructor(dataSource: DataSource) {
    super(VendorRequest, dataSource.createEntityManager());
  }

  async createRequest(data: Partial<VendorRequest>): Promise<VendorRequest> {
    const request = this.create(data);
    return this.save(request);
  }
}
