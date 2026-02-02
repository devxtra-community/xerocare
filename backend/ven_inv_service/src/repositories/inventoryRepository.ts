import { Model } from '../entities/modelEntity';
import { Product } from '../entities/productEntity';
import { Source } from '../config/db';

export class InventoryRepository {
  private modelRepo = Source.getRepository(Model);
  private productRepo = Source.getRepository(Product);

  // ADMIN — GLOBAL INVENTORY (Model-based with quantity)
  async getGlobalInventory() {
    // Return all models with their quantities and breakdown by status
    const models = await this.modelRepo
      .createQueryBuilder('model')
      .select([
        'model.id AS id',
        'model.model_no AS model_no',
        'model.model_name AS model_name',
        'model.brand AS brand',
        'model.description AS description',
        'model.quantity AS total_quantity',
      ])
      .where('model.quantity > 0') // Only show models with products
      .orderBy('model.model_name', 'ASC')
      .getRawMany();

    // For each model, get status breakdown
    const enrichedModels = await Promise.all(
      models.map(async (model) => {
        const statusBreakdown = await this.productRepo
          .createQueryBuilder('product')
          .select([
            `SUM(CASE WHEN product.product_status = 'AVAILABLE' THEN 1 ELSE 0 END)::int AS available_qty`,
            `SUM(CASE WHEN product.product_status = 'RENTED' THEN 1 ELSE 0 END)::int AS rented_qty`,
            `SUM(CASE WHEN product.product_status = 'LEASE' THEN 1 ELSE 0 END)::int AS lease_qty`,
            `SUM(CASE WHEN product.product_status = 'DAMAGED' THEN 1 ELSE 0 END)::int AS damaged_qty`,
            `SUM(CASE WHEN product.product_status = 'SOLD' THEN 1 ELSE 0 END)::int AS sold_qty`,
          ])
          .where('product.model_id = :modelId', { modelId: model.id })
          .andWhere('product.spare_part_id IS NULL')
          .getRawOne();

        return {
          ...model,
          available_qty: Number(statusBreakdown?.available_qty || 0),
          rented_qty: Number(statusBreakdown?.rented_qty || 0),
          lease_qty: Number(statusBreakdown?.lease_qty || 0),
          damaged_qty: Number(statusBreakdown?.damaged_qty || 0),
          sold_qty: Number(statusBreakdown?.sold_qty || 0),
        };
      }),
    );

    return enrichedModels;
  }

  // MANAGER — BRANCH INVENTORY (Model-based with warehouse breakdown)
  async getBranchInventory(branchId: string) {
    const result = await this.productRepo
      .createQueryBuilder('product')
      .leftJoin('product.model', 'model')
      .innerJoin('product.warehouse', 'warehouse')
      .innerJoin('warehouse.branch', 'branch')
      .select([
        'model.id AS model_id',
        'model.model_no AS model_no',
        'model.model_name AS model_name',
        'model.brand AS brand',
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
      .addGroupBy('model.brand')
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
      .select([
        'model.id AS model_id',
        'model.model_no AS model_no',
        'model.model_name AS model_name',
        'model.brand AS brand',
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
      .addGroupBy('model.brand')
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
