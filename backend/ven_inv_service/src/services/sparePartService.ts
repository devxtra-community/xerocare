import { SparePartRepository } from '../repositories/sparePartRepository';
import { ModelRepository } from '../repositories/modelRepository';
import { SparePart } from '../entities/sparePartEntity';
import { LotService } from './lotService';
import { LotItemType } from '../entities/lotItemEntity';
import { getCached, setCached, deleteCached } from '../utils/cacheUtil';
import { logger } from '../config/logger';

interface BulkUploadRow {
  item_code: string;
  part_name: string;
  brand: string;
  model_id?: string;
  base_price: number;
  quantity?: number;
  lot_id?: string;
  lot_number?: string;
  vendor_id?: string;
  warehouse_id?: string;
}

export class SparePartService {
  private repo = new SparePartRepository();
  private modelRepo = new ModelRepository();
  private lotService = new LotService();

  /**
   * Processes bulk upload of spare parts.
   */
  async bulkUpload(rows: BulkUploadRow[], branchId: string) {
    const results = { success: 0, failed: 0, errors: [] as { item_code: string; error: string }[] };

    for (const row of rows) {
      try {
        await this.addSingleSparePart(row, branchId);
        results.success++;
      } catch (error: unknown) {
        results.failed++;
        const message = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push({ item_code: row.item_code, error: message });
      }
    }

    return results;
  }

  /**
   * Adds a single spare part, validating model and tracking lot usage.
   */
  async addSingleSparePart(data: BulkUploadRow, branchId: string) {
    const itemCode = data.item_code?.trim().toUpperCase();
    // In bulk upload, item_code might be missing as it's generated
    // if (!itemCode) throw new Error('Item Code is required');

    const modelId = data.model_id;
    if (modelId) {
      const model = await this.modelRepo.findbyid(modelId);
      if (!model) throw new Error(`Model not found: ${modelId}`);
    }

    const quantity = data.quantity || 0;
    let lotId = data.lot_id;
    let vendorId = data.vendor_id;

    // If lot_id is missing but lot_number is provided, lookup the lot
    if (!lotId && data.lot_number) {
      const lot = await this.lotService.getLotByNumber(data.lot_number);
      if (lot) {
        lotId = lot.id;
        // If vendor_id is missing, use the one from the lot
        if (!vendorId) {
          vendorId = lot.vendorId;
        }
      }
    }

    if (lotId) {
      // If we don't have an itemCode yet (new part being added),
      // we might need to be careful with validateAndTrackUsage
      // however, the lot tracking currently uses item_code.
      if (itemCode) {
        await this.lotService.validateAndTrackUsage(
          lotId,
          LotItemType.SPARE_PART,
          itemCode,
          quantity,
        );
      }
    }

    const sparePart = await this.repo.createMaster({
      item_code: itemCode,
      part_name: data.part_name,
      brand: data.brand,
      model_id: modelId || undefined,
      base_price: data.base_price,
      branch_id: branchId,
      quantity: quantity,
      lot_id: lotId,
      vendor_id: vendorId,
      warehouse_id: data.warehouse_id,
    });

    await setCached(`sparepart:${sparePart.id}`, sparePart, 3600);

    return { success: true, message: 'Spare part and stock processed' };
  }

  /**
   * Updates a spare part's details.
   */
  async updateSparePart(id: string, data: Partial<SparePart>) {
    const updateData: Partial<SparePart> = {
      part_name: data.part_name,
      brand: data.brand,
      model_id: data.model_id,
      base_price: data.base_price,
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
    const hasInventory = await this.repo.hasInventory(id);
    if (hasInventory) {
      throw new Error('Cannot delete spare part with existing quantity > 0.');
    }
    await this.repo.deleteMaster(id);

    await deleteCached(`sparepart:${id}`);

    return { success: true, message: 'Spare part deleted' };
  }

  /**
   * Retrieves spare parts inventory for a branch.
   */
  async getInventoryByBranch(branchId: string) {
    return this.repo.getInventoryByBranch(branchId);
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
