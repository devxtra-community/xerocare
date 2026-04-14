import { Source } from '../config/db';
import { SparePart } from '../entities/sparePartEntity';

import { Product } from '../entities/productEntity';
import { Lot } from '../entities/lotEntity';
import { Vendor } from '../entities/vendorEntity';
import { Warehouse } from '../entities/warehouseEntity';
import { LotItem } from '../entities/lotItemEntity';

export class SparePartRepository {
  // Lazy Load Repositories
  private get masterRepo() {
    return Source.getRepository(SparePart);
  }

  private get productRepo() {
    return Source.getRepository(Product);
  }

  // --- Master Data Operations ---

  /**
   * Finds spare part master data by SKU and lot ID.
   */
  async findMasterBySkuAndLot(sku: string, lotId: string) {
    return this.masterRepo.findOne({ where: { sku, lot_id: lotId } });
  }

  /**
   * Creates new spare part master data.
   */
  async createMaster(data: Partial<SparePart>) {
    const part = this.masterRepo.create(data);
    return this.masterRepo.save(part);
  }

  /**
   * Updates spare part master data.
   */
  async updateMaster(id: string, data: Partial<SparePart>) {
    const part = await this.masterRepo.findOne({ where: { id }, relations: ['models'] });
    if (!part) throw new Error('Spare part not found');

    // Explicitly update properties to avoid reference issues
    if (data.part_name !== undefined) part.part_name = data.part_name;
    if (data.brand !== undefined) part.brand = data.brand;
    if (data.model_id !== undefined) part.model_id = data.model_id;
    if (data.base_price !== undefined) part.base_price = data.base_price;
    if (data.purchase_price !== undefined) part.purchase_price = data.purchase_price;
    if (data.wholesale_price !== undefined) part.wholesale_price = data.wholesale_price;
    if (data.models !== undefined) part.models = data.models;
    if (data.sku !== undefined) part.sku = data.sku;
    if (data.mpn !== undefined) part.mpn = data.mpn;
    if (data.description !== undefined) part.description = data.description;
    if (data.warehouse_id !== undefined) part.warehouse_id = data.warehouse_id;
    if (data.vendor_id !== undefined) part.vendor_id = data.vendor_id;

    return this.masterRepo.save(part);
  }

  /**
   * Deletes spare part master data.
   */
  async deleteMaster(id: string) {
    return this.masterRepo.delete(id);
  }

  /**
   * Checks if a spare part is referenced in any lot items.
   */
  async hasLotReferences(sparePartId: string): Promise<boolean> {
    const lotItem = await Source.getRepository(LotItem).findOne({
      where: { sparePartId: sparePartId },
    });
    return !!lotItem;
  }

  /**
   * --- Inventory Operations ---
   */

  /**
   * Updates stock quantity for a spare part.
   */
  async updateStock(sparePartId: string, quantityToAdd: number) {
    const part = await this.masterRepo.findOneBy({ id: sparePartId });
    if (!part) throw new Error('Spare Part not found');

    part.quantity += quantityToAdd;
    return this.masterRepo.save(part);
  }

  async getInventory(branchId?: string, search?: string, year?: number) {
    const qb = this.masterRepo
      .createQueryBuilder('sp')
      .leftJoin('sp.model', 'model')
      .leftJoin('sp.branch', 'branch')
      .leftJoin(Lot, 'lot', 'lot.id::text = sp.lot_id::text')
      .leftJoin(
        Vendor,
        'vendor',
        'vendor.id::text = COALESCE(sp.vendor_id::text, lot.vendor_id::text)',
      )
      .leftJoin(
        Warehouse,
        'warehouse',
        'warehouse.id::text = COALESCE(sp.warehouse_id::text, lot.warehouse_id::text)',
      )
      .select([
        'sp.id AS id',
        'sp.sku AS sku',
        'sp.mpn AS mpn',
        'lot.lotNumber AS lot_number',
        'sp.part_name AS part_name',
        'sp.brand AS brand',
        'warehouse.warehouseName AS warehouse_name',
        'branch.name AS branch_name',
        'vendor.name AS vendor_name',
        'sp.model_id AS model_id',
        'sp.quantity AS quantity',
        'sp.base_price AS price',
        'sp.purchase_price AS purchase_price',
        'sp.wholesale_price AS wholesale_price',
        'sp.image_url AS image_url',
        'sp.warehouse_id AS warehouse_id',
        'sp.vendor_id AS vendor_id',
      ])
      .addSelect(
        `COALESCE((
        SELECT STRING_AGG(m.model_name, ', ')
        FROM spare_parts_models spm
        JOIN model m ON m.id = spm.model_id
        WHERE spm.spare_part_id = sp.id
      ), model.model_name)`,
        'compatible_model',
      )
      .addSelect(
        `COALESCE((
        SELECT STRING_AGG(m.id::text, ',')
        FROM spare_parts_models spm
        JOIN model m ON m.id = spm.model_id
        WHERE spm.spare_part_id = sp.id
      ), sp.model_id::text)`,
        'model_ids',
      );

    if (year) {
      qb.andWhere('EXTRACT(YEAR FROM sp.created_at) = :year', { year });
    }

    if (branchId && branchId !== 'all') {
      qb.andWhere('sp.branch_id = :branchId', { branchId });
    }

    if (search) {
      qb.andWhere(
        '(sp.part_name ILIKE :search OR sp.sku ILIKE :search OR sp.mpn ILIKE :search OR sp.brand ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    return qb.orderBy('sp.created_at', 'DESC').getRawMany();
  }

  /**
   * Finds an existing spare part by partName, modelId/modelIds, vendorId, and warehouseId
   */
  async findExistingSparePart(
    partName: string,
    modelId: string | undefined, // Keeping for backward compatibility signature
    warehouseId: string | undefined,
    vendorId: string | undefined,
    modelIds?: string[], // New optional argument to check multiple models or universal
  ) {
    const qb = this.masterRepo
      .createQueryBuilder('sp')
      .leftJoin(Lot, 'lot', 'lot.id::text = sp.lot_id::text')
      .where('LOWER(sp.part_name) = LOWER(:partName)', { partName });

    // For determining existing part, if we receive modelIds we should check them.
    // However, exact array matching in ManyToMany is complex in QueryBuilder.
    // simpler approach: if it has the same name and brand in the same warehouse and vendor, it's the same part.
    // If you need exact model matching, we can match the primary model_id OR check if models are empty.
    if (modelIds && modelIds.length > 0) {
      // We can just rely on the fallback model_id for existing check,
      // or skip precise model array matching assuming unique part_name per vendor.
      // Let's keep using the primary model_id for backwards compatibility.
      const primaryModel = modelIds.includes('universal') ? null : modelIds[0];
      if (primaryModel) {
        qb.andWhere('sp.model_id = :primaryModel', { primaryModel });
      } else {
        qb.andWhere('sp.model_id IS NULL');
      }
    } else {
      // Backwards compatibility branch
      if (modelId && modelId !== 'universal') {
        qb.andWhere('sp.model_id = :modelId', { modelId });
      } else {
        qb.andWhere('sp.model_id IS NULL');
      }
    }

    if (warehouseId) {
      qb.andWhere('lot.warehouse_id = :warehouseId', { warehouseId });
    }

    if (vendorId) {
      qb.andWhere('lot.vendor_id = :vendorId', { vendorId });
    }

    return qb.getOne();
  }

  /**
   * Finds a spare part by ID.
   */
  async findById(id: string): Promise<SparePart | null> {
    return this.masterRepo.findOne({
      where: { id },
      relations: { model: true, models: true },
    });
  }
}
