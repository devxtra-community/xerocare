import { SparePartRepository } from '../repositories/sparePartRepository';
import { ModelRepository } from '../repositories/modelRepository';
import { SparePart } from '../entities/sparePartEntity';
import { LotService } from './lotService';
import { LotItemType } from '../entities/lotItemEntity';
import { LotStatus } from '../entities/lotEntity';
import { getCached, setCached, deleteCached } from '../utils/cacheUtil';
import { logger } from '../config/logger';
import { generateSku } from '../utils/skuGenerator';

interface BulkUploadRow {
  sku?: string;
  part_name: string;
  brand: string;
  model_id?: string;
  model_ids?: string[];
  base_price: number;
  purchase_price?: number;
  wholesale_price?: number;
  quantity?: number;
  lot_id?: string;
  lot_number?: string;
  vendor_id?: string;
  warehouse_id?: string;
  mpn?: string;
  description?: string;
}

export class SparePartService {
  private repo = new SparePartRepository();
  private modelRepo = new ModelRepository();
  private lotService = new LotService();

  /**
   * Processes bulk upload of spare parts.
   */
  async bulkUpload(rows: BulkUploadRow[], branchId: string) {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as { identifier: string; error: string }[],
    };

    for (const row of rows) {
      try {
        await this.addSingleSparePart(row, branchId);
        results.success++;
      } catch (error: unknown) {
        results.failed++;
        const message = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push({ identifier: row.sku || row.part_name || 'unknown', error: message });
      }
    }

    return results;
  }

  /**
   * Adds a single spare part, validating model and tracking lot usage.
   */
  async addSingleSparePart(data: BulkUploadRow, branchId: string) {
    // In bulk upload, sku might be missing as it's generated
    const sku = data.sku?.trim().toUpperCase();

    // Handle single model_id or array of model_ids
    let modelIds = data.model_ids || [];
    if (data.model_id && data.model_id !== 'universal' && modelIds.length === 0) {
      modelIds = [data.model_id];
    }

    const models = [];
    if (modelIds.length > 0 && !modelIds.includes('universal')) {
      for (const mId of modelIds) {
        const model = await this.modelRepo.findbyid(mId);
        if (!model) throw new Error(`Model not found: ${mId}`);
        models.push(model);
      }
    }

    // Determine the primary model_id for backwards compatibility
    const primaryModelId = models.length > 0 ? models[0].id : undefined;

    const quantity = data.quantity || 0;
    let lotId = data.lot_id;
    let vendorId = data.vendor_id;
    let warehouseId = data.warehouse_id;

    // If lot_id is missing but lot_number is provided, lookup the lot
    if (!lotId && data.lot_number) {
      const lot = await this.lotService.getLotByNumber(data.lot_number);
      if (lot) {
        lotId = lot.id;
        if (!vendorId) vendorId = lot.vendorId;
        if (!warehouseId) warehouseId = lot.warehouse_id;
      }
    }

    // If lotId is present, ensure we have warehouse/vendor info (often cached/already fetched above)
    if (lotId && (!warehouseId || !vendorId)) {
      const lot = await this.lotService.getLotById(lotId);
      if (lot) {
        if (!warehouseId) warehouseId = lot.warehouse_id;
        if (!vendorId) vendorId = lot.vendorId;
      }
    }

    if (lotId && sku) {
      // Guard: inventory cannot be created before lot is received
      const lot = await this.lotService.getLotById(lotId);
      if (lot.status !== LotStatus.RECEIVED) {
        throw new Error(
          'Inventory cannot be created until the lot is received. Please confirm the lot reception first.',
        );
      }

      // IMPROVED DUPLICATE DETECTION: If it's the same lot and same sku, it's definitely the same part.
      // Prioritize sku over fuzzy name matching.
      const existingByCode = await this.repo.findMasterBySkuAndLot(sku, lotId);
      if (existingByCode) {
        await this.repo.updateStock(existingByCode.id, quantity);
        // Sync models if provided
        if (models.length > 0) {
          const partWithModels = await this.repo.findById(existingByCode.id);
          if (partWithModels && (!partWithModels.models || partWithModels.models.length === 0)) {
            await this.repo.updateMaster(existingByCode.id, { models });
          }
        }
        await deleteCached(`sparepart:${existingByCode.id}`);

        // Track usage on existing lot item
        await this.lotService.validateAndTrackUsage(lotId, LotItemType.SPARE_PART, sku, quantity);
        return { success: true, message: 'Existing spare part updated via SKU' };
      }

      await this.lotService.validateAndTrackUsage(lotId, LotItemType.SPARE_PART, sku, quantity);
    }

    // Fallback fuzzy matching by name/model/etc.
    const existingPart = await this.repo.findExistingSparePart(
      data.part_name?.trim(),
      primaryModelId,
      warehouseId,
      vendorId,
      modelIds.length > 0 ? modelIds : undefined,
    );

    if (existingPart) {
      await this.repo.updateStock(existingPart.id, quantity);

      // Also update models if new ones are provided (optional merging logic)
      if (models.length > 0) {
        const partWithModels = await this.repo.findById(existingPart.id);
        if (partWithModels && (!partWithModels.models || partWithModels.models.length === 0)) {
          await this.repo.updateMaster(existingPart.id, { models });
        }
      }

      await deleteCached(`sparepart:${existingPart.id}`);
      return { success: true, message: 'Existing spare part stock incremented' };
    }

    const sparePart = await this.repo.createMaster({
      part_name: data.part_name,
      brand: data.brand,
      model_id: primaryModelId || undefined,
      models: models.length > 0 ? models : undefined,
      base_price: data.base_price,
      purchase_price: data.purchase_price || 0,
      wholesale_price: data.wholesale_price || 0,
      branch_id: branchId,
      quantity: quantity,
      lot_id: lotId,
      warehouse_id: warehouseId,
      vendor_id: vendorId,
      sku: sku || generateSku(),
      mpn: data.mpn,
      description: data.description,
    });

    await setCached(`sparepart:${sparePart.id}`, sparePart, 3600);

    return { success: true, message: 'Spare part and stock processed' };
  }

  /**
   * Updates a spare part's details.
   */
  async updateSparePart(id: string, data: Partial<SparePart> & { model_ids?: string[] }) {
    let models = undefined;
    if (data.model_ids) {
      models = [];
      if (!data.model_ids.includes('universal')) {
        for (const mId of data.model_ids) {
          const m = await this.modelRepo.findbyid(mId);
          if (m) models.push(m);
        }
      }
    }

    const primaryModelId = models && models.length > 0 ? models[0].id : data.model_id;

    const updateData: Partial<SparePart> = {
      part_name: data.part_name,
      brand: data.brand,
      model_id: primaryModelId,
      base_price: data.base_price,
      purchase_price: data.purchase_price,
      wholesale_price: data.wholesale_price,
      models: models,
      sku: data.sku,
      mpn: data.mpn,
      description: data.description,
      warehouse_id: data.warehouse_id,
      vendor_id: data.vendor_id,
    };
    Object.keys(updateData).forEach(
      (key) =>
        (updateData as Record<string, unknown>)[key] === undefined &&
        delete (updateData as Record<string, unknown>)[key],
    );

    await this.repo.updateMaster(id, updateData);

    await deleteCached(`sparepart:${id}`);

    return { success: true, message: 'Spare part updated' };
  }

  /**
   * Deletes a spare part if it has no inventory.
   */
  async deleteSparePart(id: string) {
    const hasLotReferences = await this.repo.hasLotReferences(id);
    if (hasLotReferences) {
      throw new Error(
        'This spare part cannot be deleted because it is already assigned to a lot. Please remove it from the lot items first if you wish to delete it.',
      );
    }

    await this.repo.deleteMaster(id);
    await deleteCached(`sparepart:${id}`);
    return { success: true, message: 'Spare part deleted' };
  }

  /**
   * Retrieves spare parts inventory, optionally filtered by branch and search.
   */
  async getInventory(branchId?: string, search?: string, year?: number) {
    return this.repo.getInventory(branchId, search, year);
  }

  /**
   * Finds a spare part by ID, using cache.
   */
  async findById(id: string): Promise<SparePart | null> {
    const cacheKey = `sparepart:${id}`;
    const cached = await getCached<SparePart>(cacheKey);

    if (cached) {
      logger.debug(`Cache HIT for spare part: ${id}`);
      return cached;
    }

    logger.debug(`Cache MISS for spare part: ${id}`);
    const sparePart = await this.repo.findById(id);

    if (sparePart) {
      await setCached(cacheKey, sparePart, 3600);
    }

    return sparePart;
  }
}
