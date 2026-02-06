import { Source } from '../config/db';
import { SparePart } from '../entities/sparePartEntity';
import { SparePartInventory } from '../entities/sparePartInventoryEntity';
import { Product } from '../entities/productEntity';

export class SparePartRepository {
  // Lazy Load Repositories
  private get masterRepo() {
    return Source.getRepository(SparePart);
  }
  private get inventoryRepo() {
    return Source.getRepository(SparePartInventory);
  }
  private get productRepo() {
    return Source.getRepository(Product);
  }

  // --- Master Data Operations ---

  async findMasterByLotNumber(lotNumber: string) {
    return this.masterRepo.find({ where: { lot_number: lotNumber } });
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
    const count = await this.inventoryRepo.count({
      where: { spare_part_id: sparePartId },
    });
    return count > 0;
  }

  // --- Inventory Operations ---

  async updateStock(
    sparePartId: string,
    warehouseId: string,
    quantityToAdd: number,
    vendorId?: string,
  ) {
    const existing = await this.inventoryRepo.findOne({
      where: { spare_part_id: sparePartId, warehouse_id: warehouseId },
    });

    if (existing) {
      existing.quantity += quantityToAdd;
      // Optionally update vendor if provided? Or keep original? master doesn't specify.
      // We'll keep it simple: just add quantity.
      return this.inventoryRepo.save(existing);
    } else {
      const newStock = this.inventoryRepo.create({
        spare_part_id: sparePartId,
        warehouse_id: warehouseId,
        vendor_id: vendorId,
        quantity: quantityToAdd,
      });
      return this.inventoryRepo.save(newStock);
    }
  }

  // Listing for Manager
  async getInventoryByBranch(branchId: string) {
    return (
      this.masterRepo
        .createQueryBuilder('sp')
        .leftJoin('sp.model', 'model')
        // Join with Inventory Table
        .leftJoin('sp.inventory', 'inv')
        .leftJoin('inv.warehouse', 'wh')
        .leftJoin('inv.vendor', 'v')
        .select([
          'sp.id AS id',
          'sp.lot_number AS item_code', // Alias as item_code for frontend compatibility or rename frontend
          'sp.lot_number AS lot_number',
          'sp.part_name AS part_name',
          'sp.brand AS brand',
          'model.model_name AS compatible_model',
          'wh.warehouseName AS warehouse_name',
          'v.name AS vendor_name',
          'COALESCE(SUM(inv.quantity), 0)::int AS quantity',
          'sp.base_price AS price',
        ])
        .where('sp.branch_id = :branchId', { branchId })
        .groupBy('sp.id')
        .addGroupBy('sp.lot_number')
        .addGroupBy('sp.part_name')
        .addGroupBy('sp.brand')
        .addGroupBy('sp.base_price')
        .addGroupBy('model.model_name')
        .addGroupBy('wh.warehouseName')
        .addGroupBy('v.name')
        .addGroupBy('wh.id')
        .addGroupBy('v.id')
        .addGroupBy('model.id')
        .orderBy('sp.created_at', 'DESC')
        .getRawMany()
    );
  }
}
