import { Source } from '../config/db';
import { SparePart } from '../entities/sparePartEntity';

import { Product } from '../entities/productEntity';
import { Lot } from '../entities/lotEntity';
import { Vendor } from '../entities/vendorEntity';
import { Warehouse } from '../entities/warehouseEntity';

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
   * Finds spare part master data by item code.
   */
  async findMasterByItemCode(itemCode: string) {
    return this.masterRepo.find({ where: { item_code: itemCode } });
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
    if (data.models !== undefined) part.models = data.models;

    return this.masterRepo.save(part);
  }

  /**
   * Deletes spare part master data.
   */
  async deleteMaster(id: string) {
    return this.masterRepo.delete(id);
  }

  /**
   * Checks if a spare part has inventory.
   */
  async hasInventory(sparePartId: string): Promise<boolean> {
    const part = await this.masterRepo.findOne({
      where: { id: sparePartId },
      select: ['quantity'],
    });
    return (part?.quantity || 0) > 0;
  }

  // --- Inventory Operations ---

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
      .leftJoin(Vendor, 'vendor', 'vendor.id::text = lot.vendor_id::text')
      .leftJoin(Warehouse, 'warehouse', 'warehouse.id::text = lot.warehouse_id::text')
      .select([
        'sp.id AS id',
        'sp.item_code AS item_code',
        'lot.lotNumber AS lot_number',
        'sp.part_name AS part_name',
        'sp.brand AS brand',
        'warehouse.warehouseName AS warehouse_name',
        'branch.name AS branch_name',
        'vendor.name AS vendor_name',
        'sp.quantity AS quantity',
        'sp.base_price AS price',
        'sp.image_url AS image_url',
      ])
      .addSelect(
        `COALESCE((
        SELECT STRING_AGG(m.model_name, ', ')
        FROM spare_parts_models spm
        JOIN model m ON m.id = spm.model_id
        WHERE spm.spare_part_id = sp.id
      ), model.model_name)`,
        'compatible_model',
      );

    if (year) {
      qb.andWhere('EXTRACT(YEAR FROM sp.created_at) = :year', { year });
    }

    if (branchId && branchId !== 'all') {
      qb.andWhere('sp.branch_id = :branchId', { branchId });
    }

    if (search) {
      qb.andWhere(
        '(LOWER(sp.part_name) LIKE LOWER(:search) OR LOWER(sp.item_code) LIKE LOWER(:search))',
        {
          search: `%${search}%`,
        },
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
      relations: { model: true },
    });
  }
}
