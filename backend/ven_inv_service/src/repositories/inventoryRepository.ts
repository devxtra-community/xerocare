import { Model } from '../entities/modelEntity';
import { Product } from '../entities/productEntity';
import { SparePart } from '../entities/sparePartEntity';
import { Source } from '../config/db';

export class InventoryRepository {
  private modelRepo = Source.getRepository(Model);
  private productRepo = Source.getRepository(Product);

  /**
   * Retrieves global inventory with optional filtering.
   */
  async getGlobalInventory(filters?: {
    product?: string;
    warehouse?: string;
    branch?: string;
    year?: number;
  }) {
    const query = this.modelRepo
      .createQueryBuilder('model')
      .leftJoin('model.products', 'product')
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

    if (filters?.year) {
      query.andWhere('EXTRACT(YEAR FROM product.created_at) = :year', { year: filters.year });
    }

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
      .addSelect('COUNT(product.id)', 'total_qty')
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
      total_qty: Number(item.total_qty),
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
  async getBranchInventory(branchId: string, year?: number) {
    const query = this.productRepo
      .createQueryBuilder('product')
      .leftJoin('product.model', 'model')
      .leftJoin('model.brandRelation', 'brandRelation')
      .leftJoin('product.vendor', 'vendorRelation')
      .leftJoin('product.spare_part', 'spare_part')
      .innerJoin('product.warehouse', 'warehouse')
      .innerJoin('warehouse.branch', 'branch')
      .select([
        'model.id AS model_id',
        'model.model_no AS model_no',
        'model.model_name AS model_name',
        'spare_part.part_name AS spare_name',
        'spare_part.item_code AS part_code',
        'product.name AS product_name',
        'product.imageUrl AS image_url',
        'brandRelation.name AS brand',
        'vendorRelation.name AS vendor_name',
        'product.vendor_id AS vendor_id',
        'warehouse.id AS warehouse_id',
        'warehouse.warehouseName AS warehouse_name',
        'COUNT(product.id)::int AS total_qty',
        `SUM(CASE WHEN product.product_status = 'AVAILABLE' THEN 1 ELSE 0 END)::int AS available_qty`,
        `SUM(CASE WHEN product.product_status = 'RENTED' THEN 1 ELSE 0 END)::int AS rented_qty`,
        `SUM(CASE WHEN product.product_status = 'LEASE' THEN 1 ELSE 0 END)::int AS lease_qty`,
        `SUM(CASE WHEN product.product_status = 'DAMAGED' THEN 1 ELSE 0 END)::int AS damaged_qty`,
        `SUM(CASE WHEN product.product_status = 'SOLD' THEN 1 ELSE 0 END)::int AS sold_qty`,
        'AVG(product.sale_price) AS product_cost',
      ])
      .where('warehouse.branchId = :branchId', { branchId });

    if (year) {
      query.andWhere('EXTRACT(YEAR FROM product.created_at) = :year', { year });
    }

    const result = await query
      .groupBy('model.id')
      .addGroupBy('model.model_no')
      .addGroupBy('model.model_name')
      .addGroupBy('spare_part.part_name')
      .addGroupBy('spare_part.item_code')
      .addGroupBy('product.name')
      .addGroupBy('product.imageUrl')
      .addGroupBy('product.vendor_id')
      .addGroupBy('brandRelation.name')
      .addGroupBy('brandRelation.id')
      .addGroupBy('vendorRelation.name')
      .addGroupBy('warehouse.id')
      .addGroupBy('warehouse.warehouseName')
      .orderBy('model.model_name', 'ASC')
      .getRawMany();

    return result.map((row) => ({
      model_id: row.model_id,
      model_no: row.part_code || row.model_no,
      model_name: row.model_name,
      product_name: row.spare_name || row.product_name,
      image_url: row.image_url,
      brand: row.brand,
      vendor_name: row.vendor_name,
      vendor_id: row.vendor_id,
      warehouse_id: row.warehouse_id,
      warehouse_name: row.warehouse_name,
      total_qty: Number(row.total_qty),
      available_qty: Number(row.available_qty),
      rented_qty: Number(row.rented_qty),
      lease_qty: Number(row.lease_qty),
      damaged_qty: Number(row.damaged_qty),
      sold_qty: Number(row.sold_qty),
      product_cost: Number(row.product_cost || 0),
    }));
  }

  /**
   * Retrieves inventory for a specific warehouse.
   */
  async getWarehouseInventory(warehouseId: string, year?: number) {
    const query = this.productRepo
      .createQueryBuilder('product')
      .leftJoin('product.model', 'model')
      .leftJoin('model.brandRelation', 'brandRelation')
      .select([
        'model.id AS model_id',
        'model.model_no AS model_no',
        'model.model_name AS model_name',
        'product.name AS product_name',
        'brandRelation.name AS brand',
        'COUNT(product.id)::int AS total_qty',
        `SUM(CASE WHEN product.product_status = 'AVAILABLE' THEN 1 ELSE 0 END)::int AS available_qty`,
        `SUM(CASE WHEN product.product_status = 'RENTED' THEN 1 ELSE 0 END)::int AS rented_qty`,
        `SUM(CASE WHEN product.product_status = 'LEASE' THEN 1 ELSE 0 END)::int AS lease_qty`,
        `SUM(CASE WHEN product.product_status = 'DAMAGED' THEN 1 ELSE 0 END)::int AS damaged_qty`,
        `SUM(CASE WHEN product.product_status = 'SOLD' THEN 1 ELSE 0 END)::int AS sold_qty`,
        'AVG(product.sale_price) AS product_cost',
      ])
      .where('product.warehouse_id = :warehouseId', { warehouseId });

    if (year) {
      query.andWhere('EXTRACT(YEAR FROM product.created_at) = :year', { year });
    }

    const result = await query
      .groupBy('model.id')
      .addGroupBy('model.model_no')
      .addGroupBy('model.model_name')
      .addGroupBy('product.name')
      .addGroupBy('brandRelation.name')
      .addGroupBy('brandRelation.id')
      .orderBy('model.model_name', 'ASC')
      .getRawMany();

    return result.map((row) => ({
      model_id: row.model_id,
      model_no: row.model_no,
      model_name: row.model_name,
      product_name: row.product_name,
      brand: row.brand,
      total_qty: Number(row.total_qty),
      available_qty: Number(row.available_qty),
      rented_qty: Number(row.rented_qty),
      lease_qty: Number(row.lease_qty),
      damaged_qty: Number(row.damaged_qty),
      sold_qty: Number(row.sold_qty),
      product_cost: Number(row.product_cost || 0),
    }));
  }

  /**
   * Calculates inventory statistics.
   */
  async getInventoryStats(branchId?: string, year?: number) {
    const productQuery = this.productRepo
      .createQueryBuilder('product')
      .select([
        `COUNT(product.id) FILTER (WHERE product.product_status != 'SOLD')::int AS "totalStock"`,
        `SUM(product.sale_price) FILTER (WHERE product.product_status != 'SOLD' AND product.sale_price IS NOT NULL)::int AS "totalValue"`,
      ]);

    if (branchId) {
      productQuery
        .innerJoin('product.warehouse', 'warehouse')
        .andWhere('warehouse.branchId = :branchId', { branchId });
    }

    if (year) {
      productQuery.andWhere('EXTRACT(YEAR FROM product.created_at) = :year', { year });
    }

    const sparePartRepo = Source.getRepository(SparePart);
    const sparePartQuery = sparePartRepo
      .createQueryBuilder('sp')
      .select([
        `SUM(sp.quantity)::int AS "spareStock"`,
        `SUM(sp.quantity * sp.base_price)::int AS "spareValue"`,
      ]);

    if (branchId) {
      sparePartQuery.andWhere('sp.branch_id = :branchId', { branchId });
    }

    if (year) {
      sparePartQuery.andWhere('EXTRACT(YEAR FROM sp.created_at) = :year', { year });
    }

    const [productStats, spareStats] = await Promise.all([
      productQuery.getRawOne(),
      sparePartQuery.getRawOne(),
    ]);

    return {
      productStock: Number(productStats?.totalStock || 0),
      productValue: Number(productStats?.totalValue || 0),
      spareStock: Number(spareStats?.spareStock || 0),
      spareValue: Number(spareStats?.spareValue || 0),
    };
  }
}
