import { Model } from '../entities/modelEntity';
import { Product } from '../entities/productEntity';
import { Source } from '../config/db';

export class InventoryRepository {
  private modelRepo = Source.getRepository(Model);
  private productRepo = Source.getRepository(Product);

  /**
   * Retrieves global inventory with optional filtering.
   */
  async getGlobalInventory(filters?: { product?: string; warehouse?: string; branch?: string }) {
    const query = this.modelRepo
      .createQueryBuilder('model')
      .leftJoin('model.products', 'product', 'product.spare_part_id IS NULL')
      .leftJoin('product.warehouse', 'warehouse')
      .leftJoin('warehouse.branch', 'branch')
      .select([
        'model.id AS id',
        'model.model_no AS model_no',
        'model.model_name AS model_name',
        'product.name AS product_name',
        'brandRelation.name AS brand',
        'model.description AS description',
        'warehouse.warehouseName AS warehouse_name',
        'branch.name AS branch_name',
      ])
      .leftJoin('model.brandRelation', 'brandRelation');

    if (filters?.product) {
      query.andWhere(
        '(LOWER(model.model_name) LIKE :product OR LOWER(model.model_no) LIKE :product OR LOWER(product.name) LIKE :product)',
        { product: `%${filters.product.toLowerCase()}%` },
      );
    }

    if (filters?.warehouse) {
      query.andWhere('LOWER(warehouse.warehouseName) LIKE :warehouse', {
        warehouse: `%${filters.warehouse.toLowerCase()}%`,
      });
    }

    if (filters?.branch) {
      query.andWhere('LOWER(branch.name) LIKE :branch', {
        branch: `%${filters.branch.toLowerCase()}%`,
      });
    }

    const rawData = await query
      .addSelect('COUNT(product.id)', 'total_quantity')
      .addSelect(
        "COUNT(CASE WHEN product.product_status = 'AVAILABLE' THEN 1 END)",
        'available_qty',
      )
      .addSelect("COUNT(CASE WHEN product.product_status = 'RENTED' THEN 1 END)", 'rented_qty')
      .addSelect("COUNT(CASE WHEN product.product_status = 'LEASE' THEN 1 END)", 'lease_qty')
      .addSelect("COUNT(CASE WHEN product.product_status = 'SOLD' THEN 1 END)", 'sold_qty')
      .addSelect("COUNT(CASE WHEN product.product_status = 'DAMAGED' THEN 1 END)", 'damaged_qty')
      .addSelect('AVG(product.sale_price)', 'product_cost')
      .groupBy('model.id')
      .addGroupBy('brandRelation.id')
      .addGroupBy('brandRelation.name')
      .addGroupBy('product.id')
      .addGroupBy('product.name')
      .addGroupBy('warehouse.id')
      .addGroupBy('warehouse.warehouseName')
      .addGroupBy('branch.id')
      .addGroupBy('branch.name')
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
      product_cost: Number(item.product_cost || 0),
    }));
  }

  /**
   * Retrieves inventory for a specific branch.
   */
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

  /**
   * Retrieves inventory for a specific warehouse.
   */
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

  /**
   * Calculates inventory statistics.
   */
  async getInventoryStats(branchId?: string) {
    const query = this.productRepo
      .createQueryBuilder('product')
      .select([
        `COUNT(product.id) FILTER (WHERE product.product_status != 'SOLD')::int AS "totalStock"`,
        `COUNT(DISTINCT product.model_id) FILTER (WHERE product.product_status != 'SOLD')::int AS "productModels"`,
        `SUM(product.sale_price) FILTER (WHERE product.product_status != 'SOLD' AND product.sale_price IS NOT NULL)::int AS "totalValue"`,
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
      totalStock: Number(stats?.totalStock || 0),
      productModels: Number(stats?.productModels || 0),
      totalValue: Number(stats?.totalValue || 0),
      damagedStock: 0,
    };
  }
}
