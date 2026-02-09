import { Model } from '../entities/modelEntity';
import { Product } from '../entities/productEntity';
import { Source } from '../config/db';

export class InventoryRepository {
  private modelRepo = Source.getRepository(Model);
  private productRepo = Source.getRepository(Product);

  // ADMIN — GLOBAL INVENTORY (Model-based with quantity)
  async getGlobalInventory() {
    const rawData = await this.modelRepo
      .createQueryBuilder('model')
      .leftJoin('model.products', 'product', 'product.spare_part_id IS NULL')
      .select([
        'model.id AS id',
        'model.model_no AS model_no',
        'model.model_name AS model_name',
        'brandRelation.name AS brand',
        'model.description AS description',
      ])
      .leftJoin('model.brandRelation', 'brandRelation')
      .addSelect('COUNT(product.id)', 'total_quantity')
      .addSelect(
        "COUNT(CASE WHEN product.product_status = 'AVAILABLE' THEN 1 END)",
        'available_qty',
      )
      .addSelect("COUNT(CASE WHEN product.product_status = 'RENTED' THEN 1 END)", 'rented_qty')
      .addSelect("COUNT(CASE WHEN product.product_status = 'LEASE' THEN 1 END)", 'lease_qty')
      .addSelect("COUNT(CASE WHEN product.product_status = 'SOLD' THEN 1 END)", 'sold_qty')
      .addSelect("COUNT(CASE WHEN product.product_status = 'DAMAGED' THEN 1 END)", 'damaged_qty')
      // Only include models that have at least one product if desired, OR include all.
      // The previous code filtered 'quantity > 0'.
      // If we want to show only models with inventory, we can use HAVING or INNER JOIN.
      // Given "inventory" context, usually implies things in stock.
      // But user complained about "didn't getting any data". Safe bet is LEFT JOIN to show models even if empty, or filter `total_quantity > 0` in having.
      // Sticking to LEFT JOIN results in all models. I'll add a filter if needed, but showing 0s is better than showing nothing when debuging.
      // However, previous code explicitly had `.where('model.quantity > 0')`.
      // I will filter out models with 0 total products to keep it identical to "inventory with items" logic, but fixing the source of truth.
      .groupBy('model.id')
      .addGroupBy('brandRelation.id')
      .addGroupBy('brandRelation.name')
      .having('COUNT(product.id) > 0')
      .getRawMany();

    return rawData.map((item) => ({
      ...item,
      total_quantity: Number(item.total_quantity),
      available_qty: Number(item.available_qty),
      rented_qty: Number(item.rented_qty),
      lease_qty: Number(item.lease_qty),
      sold_qty: Number(item.sold_qty),
      damaged_qty: Number(item.damaged_qty),
    }));
  }

  // MANAGER — BRANCH INVENTORY (Model-based with warehouse breakdown)
  async getBranchInventory(branchId: string) {
    const result = await this.productRepo
      .createQueryBuilder('product')
      .leftJoin('product.model', 'model')
      .leftJoin('model.brandRelation', 'brandRelation')
      .innerJoin('product.warehouse', 'warehouse')
      .innerJoin('warehouse.branch', 'branch')
      .select([
        'model.id AS model_id',
        'model.model_no AS model_no',
        'model.model_name AS model_name',
        'brandRelation.name AS brand',
        'warehouse.id AS warehouse_id',
        'warehouse.warehouseName AS warehouse_name',
        'COUNT(product.id)::int AS total_qty',
        `SUM(CASE WHEN product.product_status = 'AVAILABLE' THEN 1 ELSE 0 END)::int AS available_qty`,
        `SUM(CASE WHEN product.product_status = 'RENTED' THEN 1 ELSE 0 END)::int AS rented_qty`,
        `SUM(CASE WHEN product.product_status = 'LEASE' THEN 1 ELSE 0 END)::int AS lease_qty`,
        `SUM(CASE WHEN product.product_status = 'DAMAGED' THEN 1 ELSE 0 END)::int AS damaged_qty`,
        `SUM(CASE WHEN product.product_status = 'SOLD' THEN 1 ELSE 0 END)::int AS sold_qty`,
      ])
      .where('branch.id = :branchId', { branchId })
      .andWhere('product.spare_part_id IS NULL')
      .groupBy('model.id')
      .addGroupBy('model.model_no')
      .addGroupBy('model.model_name')
      .addGroupBy('brandRelation.name')
      .addGroupBy('brandRelation.id')
      .addGroupBy('warehouse.id')
      .addGroupBy('warehouse.warehouseName')
      .orderBy('model.model_name', 'ASC')
      .getRawMany();

    return result.map((row) => ({
      model_id: row.model_id,
      model_no: row.model_no,
      model_name: row.model_name,
      brand: row.brand,
      warehouse_id: row.warehouse_id,
      warehouse_name: row.warehouse_name,
      total_qty: Number(row.total_qty),
      available_qty: Number(row.available_qty),
      rented_qty: Number(row.rented_qty),
      lease_qty: Number(row.lease_qty),
      damaged_qty: Number(row.damaged_qty),
      sold_qty: Number(row.sold_qty),
    }));
  }

  // WAREHOUSE STAFF — WAREHOUSE INVENTORY
  async getWarehouseInventory(warehouseId: string) {
    const result = await this.productRepo
      .createQueryBuilder('product')
      .leftJoin('product.model', 'model')
      .leftJoin('model.brandRelation', 'brandRelation')
      .select([
        'model.id AS model_id',
        'model.model_no AS model_no',
        'model.model_name AS model_name',
        'brandRelation.name AS brand',
        'COUNT(product.id)::int AS total_qty',
        `SUM(CASE WHEN product.product_status = 'AVAILABLE' THEN 1 ELSE 0 END)::int AS available_qty`,
        `SUM(CASE WHEN product.product_status = 'RENTED' THEN 1 ELSE 0 END)::int AS rented_qty`,
        `SUM(CASE WHEN product.product_status = 'LEASE' THEN 1 ELSE 0 END)::int AS lease_qty`,
        `SUM(CASE WHEN product.product_status = 'DAMAGED' THEN 1 ELSE 0 END)::int AS damaged_qty`,
        `SUM(CASE WHEN product.product_status = 'SOLD' THEN 1 ELSE 0 END)::int AS sold_qty`,
      ])
      .where('product.warehouse_id = :warehouseId', { warehouseId })
      .andWhere('product.spare_part_id IS NULL')
      .groupBy('model.id')
      .addGroupBy('model.model_no')
      .addGroupBy('model.model_name')
      .addGroupBy('brandRelation.name')
      .addGroupBy('brandRelation.id')
      .orderBy('model.model_name', 'ASC')
      .getRawMany();

    return result.map((row) => ({
      model_id: row.model_id,
      model_no: row.model_no,
      model_name: row.model_name,
      brand: row.brand,
      total_qty: Number(row.total_qty),
      available_qty: Number(row.available_qty),
      rented_qty: Number(row.rented_qty),
      lease_qty: Number(row.lease_qty),
      damaged_qty: Number(row.damaged_qty),
      sold_qty: Number(row.sold_qty),
    }));
  }

  // DASHBOARD STATS
  async getInventoryStats(branchId?: string) {
    const query = this.productRepo
      .createQueryBuilder('product')
      .select([
        `COUNT(product.id) FILTER (WHERE product.product_status != 'SOLD')::int AS "totalProducts"`,
        `COUNT(product.id) FILTER (WHERE product.product_status = 'AVAILABLE')::int AS "totalStockUnits"`,
        `SUM(product.sale_price) FILTER (WHERE product.product_status != 'SOLD' AND product.sale_price IS NOT NULL)::int AS "totalValue"`,
        `COUNT(product.id) FILTER (WHERE product.product_status = 'DAMAGED')::int AS "damagedStock"`,
      ])
      .where('product.spare_part_id IS NULL');

    if (branchId) {
      query
        .innerJoin('product.warehouse', 'warehouse')
        .innerJoin('warehouse.branch', 'branch')
        .andWhere('branch.id = :branchId', { branchId });
    }

    const stats = await query.getRawOne();

    return {
      totalProducts: Number(stats?.totalProducts || 0),
      totalStockUnits: Number(stats?.totalStockUnits || 0),
      totalValue: Number(stats?.totalValue || 0),
      damagedStock: Number(stats?.damagedStock || 0),
    };
  }
}
