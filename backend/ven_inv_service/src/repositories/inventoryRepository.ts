import { Product } from '../entities/productEntity';
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
        'COUNT(product.id)::int AS total_qty',
        `SUM(CASE WHEN product.product_status = 'AVAILABLE' THEN 1 ELSE 0 END)::int AS available_qty`,
        `SUM(CASE WHEN product.product_status = 'DAMAGED' THEN 1 ELSE 0 END)::int AS damaged_qty`,
        `SUM(CASE WHEN product.product_status = 'SOLD' THEN 1 ELSE 0 END)::int AS sold_qty`,
      ])
      .groupBy('model.id')
      .addGroupBy('model.model_name')
      .getRawMany();
  }

  // MANAGER — BRANCH INVENTORY
  async getBranchInventory(branchId: string) {
    return this.repo
      .createQueryBuilder('product')
      .innerJoin('product.model', 'model')
      .innerJoin('product.warehouse', 'warehouse')
      .select([
        'warehouse.id AS warehouse_id',
        'warehouse.warehouseName AS warehouse_name',
        'model.id AS model_id',
        'model.model_name AS model_name',
        'COUNT(product.id)::int AS total_qty',
        `SUM(CASE WHEN product.product_status = 'AVAILABLE' THEN 1 ELSE 0 END)::int AS available_qty`,
        `SUM(CASE WHEN product.product_status = 'DAMAGED' THEN 1 ELSE 0 END)::int AS damaged_qty`,
      ])
      .where('warehouse.branch_id = :branchId', { branchId })
      .groupBy('warehouse.id')
      .addGroupBy('warehouse.warehouseName')
      .addGroupBy('model.id')
      .addGroupBy('model.model_name')
      .getRawMany();
  }

  // WAREHOUSE INVENTORY
  async getWarehouseInventory(warehouseId: string) {
    return this.repo
      .createQueryBuilder('product')
      .innerJoin('product.model', 'model')
      .select([
        'model.id AS model_id',
        'model.model_name AS model_name',
        'COUNT(product.id)::int AS total_qty',
        `SUM(CASE WHEN product.product_status = 'AVAILABLE' THEN 1 ELSE 0 END)::int AS available_qty`,
        `SUM(CASE WHEN product.product_status = 'DAMAGED' THEN 1 ELSE 0 END)::int AS damaged_qty`,
      ])
      .where('product.warehouse_id = :warehouseId', { warehouseId })
      .groupBy('model.id')
      .addGroupBy('model.model_name')
      .getRawMany();
  }

  // DASHBOARD STATS
  async getInventoryStats() {
    const totalProducts = await this.repo.count();

    const totalModels = await this.repo
      .createQueryBuilder('product')
      .select('COUNT(DISTINCT product.model_id)', 'count')
      .getRawOne();

    return {
      totalProducts,
      totalModels: Number(totalModels.count),
    };
  }
}
