import { Source } from '../config/db';
import { SparePart } from '../entities/sparePartEntity';
import { Product } from '../entities/productEntity';
import { DeepPartial } from 'typeorm';

export class SparePartRepository {
  // Lazy Load Repositories
  private get masterRepo() {
    return Source.getRepository(SparePart);
  }
  private get productRepo() {
    return Source.getRepository(Product);
  }

  // --- Master Data Operations ---

  async findMasterByItemCode(itemCode: string) {
    return this.masterRepo.findOne({ where: { item_code: itemCode } });
  }

  async createMaster(data: Partial<SparePart>) {
    const part = this.masterRepo.create(data);
    return this.masterRepo.save(part);
  }

  async updateMaster(id: string, data: Partial<SparePart>) {
    return this.masterRepo.update(id, data);
  }

  async deleteMaster(id: string) {
    return this.masterRepo.delete(id);
  }

  async hasInventory(sparePartId: string): Promise<boolean> {
    const count = await this.productRepo.count({
      where: { spare_part_id: sparePartId },
    });
    return count > 0;
  }

  async createProducts(data: DeepPartial<Product>[]) {
    const products = this.productRepo.create(data);
    return this.productRepo.save(products);
  }

  // --- Inventory Operations (Derived via Aggregation) ---

  // Listing for Manager
  // Strict Rule: Manager sees only spare parts defined for their branch.
  // Stock is derived from Product table counts.
  async getInventoryByBranch(branchId: string) {
    return (
      this.masterRepo
        .createQueryBuilder('sp')
        .leftJoin('sp.model', 'model')
        .leftJoin('sp.branch', 'branch') // Optional join if we need branch name, but we filter by ID
        // Derived Inventory: Count products linked to this spare part
        // We join products to count them.
        // Note: Users want to see "Total Quantity".
        // If we want "Quantity per warehouse", the UI needs to support nested rows or we group by warehouse.
        // Based on "Spare Parts Listing" columns: "Warehouse Name", "Quantity".
        // This implies the list is granular per warehouse-part combination.
        // BUT: "SparePart = Master Data". If a spare part exists but has 0 stock, it has NO warehouse.
        // So we must Left Join. Ideally, if 0 stock, Warehouse Name is null or "-".
        // However, if we group by sp.id AND warehouse.id, a part with 0 stock has warehouse_id = null.
        // ONE ROW per part (with null warehouse).
        // If a part has stock in 2 warehouses, we get 2 ROWS.
        .leftJoin('Product', 'p', 'p.spare_part_id = sp.id AND p.product_status = :status', {
          status: 'AVAILABLE',
        })
        .leftJoin('p.warehouse', 'wh')
        .leftJoin('p.vendor', 'v') // Vendor is on Product
        .select([
          'sp.id AS id',
          'sp.item_code AS item_code',
          'sp.part_name AS part_name',
          'sp.brand AS brand',
          'model.model_name AS compatible_model',
          'wh.warehouseName AS warehouse_name',
          'v.name AS vendor_name',
          'COUNT(p.id)::int AS quantity',
          'sp.base_price AS price',
        ])
        .where('sp.branch_id = :branchId', { branchId })
        .groupBy('sp.id')
        .addGroupBy('sp.item_code')
        .addGroupBy('sp.part_name')
        .addGroupBy('sp.brand')
        .addGroupBy('sp.base_price')
        .addGroupBy('model.model_name')
        .addGroupBy('wh.warehouseName')
        .addGroupBy('v.name')
        .addGroupBy('wh.id') // Group by warehouse to show location
        .addGroupBy('v.id') // Group by vendor to show source
        .addGroupBy('model.id')
        .orderBy('sp.created_at', 'DESC')
        .getRawMany()
    );
  }
}
