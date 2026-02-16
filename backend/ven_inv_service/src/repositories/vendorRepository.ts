import { DataSource, Repository } from 'typeorm';
import { Vendor, VendorStatus } from '../entities/vendorEntity';

export class VendorRepository extends Repository<Vendor> {
  constructor(dataSource: DataSource) {
    super(Vendor, dataSource.manager);
  }

  /**
   * Finds a vendor by email.
   */
  findByEmail(email: string) {
    return this.findOne({ where: { email } });
  }

  /**
   * Finds a vendor by ID.
   */
  findById(id: string) {
    return this.findOne({ where: { id } });
  }

  /**
   * Finds a vendor by name.
   */
  findByName(name: string) {
    return this.findOne({ where: { name } });
  }

  /**
   * Finds all active vendors.
   */
  findActive() {
    return this.find({
      where: { status: VendorStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Finds an active vendor by ID.
   */
  findByIdActive(id: string) {
    return this.findOne({
      where: { id, status: VendorStatus.ACTIVE },
    });
  }
}
