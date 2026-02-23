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
   * Finds all active vendors, optionally with branch-specific stats.
   */
  async findActive(branchId?: string) {
    const vendors = await this.find({
      where: { status: VendorStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });

    if (!branchId) return vendors;

    return Promise.all(
      vendors.map(async (vendor) => {
        const stats = await this.getBranchStats(vendor.id, branchId);
        return {
          ...vendor,
          totalOrders: stats.totalOrders,
          purchaseValue: stats.purchaseValue,
        };
      }),
    );
  }

  /**
   * Finds an active vendor by ID, optionally with branch-specific stats.
   */
  async findByIdActive(id: string, branchId?: string) {
    const vendor = await this.findOne({
      where: { id, status: VendorStatus.ACTIVE },
    });

    if (!vendor || !branchId) return vendor;

    const stats = await this.getBranchStats(vendor.id, branchId);
    return {
      ...vendor,
      totalOrders: stats.totalOrders,
      purchaseValue: stats.purchaseValue,
    };
  }

  /**
   * Calculates branch-specific statistics for a vendor.
   */
  private async getBranchStats(vendorId: string, branchId: string) {
    const manager = this.manager;

    // Get total orders (from vendor requests)
    const requestCount = await manager
      .createQueryBuilder('vendor_requests', 'vr')
      .where('vr.vendor_id = :vendorId', { vendorId })
      .andWhere('vr.branch_id = :branchId', { branchId })
      .getCount();

    // Get total purchase value (from lots)
    const lotStats = await manager
      .createQueryBuilder('lots', 'l')
      .select('SUM(l.total_amount)', 'total')
      .where('l.vendor_id = :vendorId', { vendorId })
      .andWhere('l.branch_id = :branchId', { branchId })
      .getRawOne();

    return {
      totalOrders: requestCount || 0,
      purchaseValue: parseFloat(lotStats?.total) || 0,
    };
  }
}
