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

  async findActive(branchId?: string) {
    const vendors = await this.find({
      where: { status: VendorStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });

    return Promise.all(
      vendors.map(async (vendor) => {
        const stats = await this.getVendorTotals(vendor.id, branchId);
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

    if (!vendor) return vendor;

    const stats = await this.getVendorTotals(vendor.id, branchId);
    return {
      ...vendor,
      totalOrders: stats.totalOrders,
      purchaseValue: stats.purchaseValue,
    };
  }

  /**
   * Calculates statistics for a vendor (global or branch-specific).
   */
  private async getVendorTotals(vendorId: string, branchId?: string) {
    const manager = this.manager;

    // Get total orders (from vendor requests)
    const ordersQuery = manager
      .createQueryBuilder('vendor_requests', 'vr')
      .where('vr.vendor_id = :vendorId', { vendorId });

    if (branchId) {
      ordersQuery.andWhere('vr.branch_id = :branchId', { branchId });
    }

    const requestCount = await ordersQuery.getCount();

    // Get total purchase value (from lots)
    const lotStatsQuery = manager
      .createQueryBuilder('lots', 'l')
      .select('SUM(l.total_amount)', 'total')
      .where('l.vendor_id = :vendorId', { vendorId });

    if (branchId) {
      lotStatsQuery.andWhere('l.branch_id = :branchId', { branchId });
    }

    const lotStats = await lotStatsQuery.getRawOne();

    return {
      totalOrders: requestCount || 0,
      purchaseValue: parseFloat(lotStats?.total) || 0,
    };
  }
}
