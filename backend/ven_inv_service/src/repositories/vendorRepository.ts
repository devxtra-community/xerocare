import { DataSource, Repository } from 'typeorm';
import { Vendor, VendorStatus } from '../entities/vendorEntity';

export class VendorRepository extends Repository<Vendor> {
  constructor(dataSource: DataSource) {
    super(Vendor, dataSource.manager);
  }

  findByEmail(email: string) {
    return this.findOne({ where: { email } });
  }

  findById(id: string) {
    return this.findOne({ where: { id } });
  }

  findByName(name: string) {
    return this.findOne({ where: { name } });
  }

  findActive() {
    return this.find({
      where: { status: VendorStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });
  }

  findByIdActive(id: string) {
    return this.findOne({
      where: { id, status: VendorStatus.ACTIVE },
    });
  }
}
