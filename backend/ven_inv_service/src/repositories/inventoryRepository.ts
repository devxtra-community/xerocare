import { Product } from '../entities/productEntity';
import { Vendor } from '../entities/vendorEntity';
import { Source } from '../config/db';

export class InventoryRepository {
  private repo = Source.getRepository(Product);

  // ADMIN — GLOBAL INVENTORY
  async getGlobalInventory() {
    return this.repo
      .createQueryBuilder('product')
      .innerJoin('product.model', 'model')
      .select([
        'model.id AS model_id',
        'model.model_name AS model_name',
        'model.brand AS brand',
        'COUNT(product.id)::int AS total_qty',
        `SUM(CASE WHEN product.product_status = 'AVAILABLE' THEN 1 ELSE 0 END)::int AS available_qty`,
        `SUM(CASE WHEN product.product_status = 'RENTED' THEN 1 ELSE 0 END)::int AS rented_qty`,
        `SUM(CASE WHEN product.product_status = 'DAMAGED' THEN 1 ELSE 0 END)::int AS damaged_qty`,
        `SUM(CASE WHEN product.product_status = 'SOLD' THEN 1 ELSE 0 END)::int AS sold_qty`,
      ])
      .groupBy('model.id')
      .addGroupBy('model.model_name')
      .addGroupBy('model.brand')
      .getRawMany();
  }

  // MANAGER — BRANCH INVENTORY
  async getBranchInventory(branchId: string) {
    console.log('Fetching inventory for branch:', branchId);
    const result = await this.repo
      .createQueryBuilder('product')
      .leftJoin('product.model', 'model')
      .innerJoin('product.warehouse', 'warehouse')
      .leftJoin(Vendor, 'vendor', 'product.vendor_id = vendor.id')
      .select([
        'warehouse.id AS warehouse_id',
        'warehouse.warehouseName AS warehouse_name',
        'model.id AS model_id',
        'model.model_name AS model_name',
        'model.brand AS brand',
        'product.vendor_id AS vendor_id',
        'vendor.name AS vendor_name',
        'COUNT(product.id)::int AS total_qty',
        `SUM(CASE WHEN product.product_status = 'AVAILABLE' THEN 1 ELSE 0 END)::int AS available_qty`,
        `SUM(CASE WHEN product.product_status = 'RENTED' THEN 1 ELSE 0 END)::int AS rented_qty`,
        `SUM(CASE WHEN product.product_status = 'DAMAGED' THEN 1 ELSE 0 END)::int AS damaged_qty`,
        `SUM(CASE WHEN product.product_status = 'SOLD' THEN 1 ELSE 0 END)::int AS sold_qty`,
      ])
      .where('warehouse.branchId = :branchId', { branchId })
      .groupBy('warehouse.id')
      .addGroupBy('warehouse.warehouseName')
      .addGroupBy('model.id')
      .addGroupBy('model.model_name')
      .addGroupBy('model.brand')
      .addGroupBy('product.vendor_id')
      .addGroupBy('vendor.name')
      .getRawMany();

    console.log('Inventory query result count:', result.length);
    if (result.length > 0) {
      console.log('Inventory query result sample:', result[0]);
    } else {
      console.log('Inventory query returned NO data for branchId:', branchId);
    }
    return result;
  }

  // WAREHOUSE INVENTORY
  async getWarehouseInventory(warehouseId: string) {
    return this.repo
      .createQueryBuilder('product')
      .innerJoin('product.model', 'model')
      .select([
        'model.id AS model_id',
        'model.model_name AS model_name',
        'model.brand AS brand',
        'COUNT(product.id)::int AS total_qty',
        `SUM(CASE WHEN product.product_status = 'AVAILABLE' THEN 1 ELSE 0 END)::int AS available_qty`,
        `SUM(CASE WHEN product.product_status = 'RENTED' THEN 1 ELSE 0 END)::int AS rented_qty`,
        `SUM(CASE WHEN product.product_status = 'DAMAGED' THEN 1 ELSE 0 END)::int AS damaged_qty`,
        `SUM(CASE WHEN product.product_status = 'SOLD' THEN 1 ELSE 0 END)::int AS sold_qty`,
      ])
      .where('product.warehouse_id = :warehouseId', { warehouseId })
      .groupBy('model.id')
      .addGroupBy('model.model_name')
      .addGroupBy('model.brand')
      .getRawMany();
  }

  // DASHBOARD STATS
  // DASHBOARD STATS
  async getInventoryStats(branchId?: string) {
    const query = this.repo.createQueryBuilder('product');

    if (branchId) {
      query
        .innerJoin('product.warehouse', 'warehouse')
        .where('warehouse.branchId = :branchId', { branchId });
    }

    // Metrics:
    // 1. Total Products: All items currently in possession (Available, Rented, Damaged, Lease). Excluding SOLD.
    // 2. Total Stock Units: Items strictly AVAILABLE for use.
    // 3. Total Value: Value of all items in possession.
    // 4. Damaged: Items needing inspection.

    const stats = await query
      .select([
        `COUNT(product.id) FILTER (WHERE product.product_status != 'SOLD')::int AS "totalProducts"`,
        `COUNT(product.id) FILTER (WHERE product.product_status = 'AVAILABLE')::int AS "totalStockUnits"`,
        `SUM(product.sale_price) FILTER (WHERE product.product_status != 'SOLD' AND product.sale_price IS NOT NULL)::int AS "totalValue"`,
        `COUNT(product.id) FILTER (WHERE product.product_status = 'DAMAGED')::int AS "damagedStock"`,
      ])
      .getRawOne();

    return {
      totalProducts: Number(stats.totalProducts || 0),
      totalStockUnits: Number(stats.totalStockUnits || 0),
      totalValue: Number(stats.totalValue || 0),
      damagedStock: Number(stats.damagedStock || 0),
    };
  }
}
