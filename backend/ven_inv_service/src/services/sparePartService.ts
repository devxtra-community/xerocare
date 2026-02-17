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
  model_id?: string; // Optional if universal
  base_price: number;
  quantity?: number;
  lot_id?: string;
  vendor_id?: string;
  warehouse_id?: string;
}

export class SparePartService {
  private repo = new SparePartRepository();
  private modelRepo = new ModelRepository();
  private lotService = new LotService();

  async bulkUpload(rows: BulkUploadRow[], branchId: string) {
    // Partial Success Strategy: Each row is isolated.
    const results = { success: 0, failed: 0, errors: [] as { item_code: string; error: string }[] };

    for (const row of rows) {
      try {
        await this.addSingleSparePart(row, branchId); // Reusing logic
        results.success++;
      } catch (error: unknown) {
        results.failed++;
        const message = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push({ item_code: row.item_code, error: message });
      }
    }

    return results;
  }

  async addSingleSparePart(data: BulkUploadRow, branchId: string) {
    // 1. Validate Inputs
    const itemCode = data.item_code?.trim().toUpperCase();
    if (!itemCode) throw new Error('Item Code is required');

    // 2. Validate/Fetch Model (Optional)
    const modelId = data.model_id;
    if (modelId) {
      const model = await this.modelRepo.findbyid(modelId);
      if (!model) throw new Error(`Model not found: ${modelId}`);
    }

    // 3. Create Master Record (SparePart) with Quantity
    // User Requirement change: "i dont want to merge the spare parts having the same item code"
    // Always create a new entry for every upload.
    const quantity = data.quantity || 0;

    // Check Lot Usage if lot_id provided
    if (data.lot_id) {
      await this.lotService.validateAndTrackUsage(
        data.lot_id,
        LotItemType.SPARE_PART,
        itemCode, // Passing itemCode for validation
        quantity,
      );
    }

    const sparePart = await this.repo.createMaster({
      item_code: itemCode,
      part_name: data.part_name,
      brand: data.brand,
      model_id: modelId || undefined,
      base_price: data.base_price,
      branch_id: branchId,
      quantity: quantity,
      lot_id: data.lot_id,
      vendor_id: data.vendor_id,
      warehouse_id: data.warehouse_id,
    });

    // Pre-warm cache for newly created spare part
    await setCached(`sparepart:${sparePart.id}`, sparePart, 3600);

    return { success: true, message: 'Spare part and stock processed' };
  }

  async updateSparePart(id: string, data: Partial<SparePart>) {
    // Only allow updating Master Data fields
    const updateData: Partial<SparePart> = {
      part_name: data.part_name,
      brand: data.brand,
      model_id: data.model_id,
      base_price: data.base_price,
    };
    // Remove undefined
    Object.keys(updateData).forEach(
      (key) =>
        (updateData as Record<string, unknown>)[key] === undefined &&
        delete (updateData as Record<string, unknown>)[key],
    );

    await this.repo.updateMaster(id, updateData);

    // Invalidate cache after update
    await deleteCached(`sparepart:${id}`);

    return { success: true, message: 'Spare part updated' };
  }

  async deleteSparePart(id: string) {
    const hasInventory = await this.repo.hasInventory(id);
    if (hasInventory) {
      throw new Error('Cannot delete spare part with existing quantity > 0.');
    }
    await this.repo.deleteMaster(id);

    // Invalidate cache
    await deleteCached(`sparepart:${id}`);

    return { success: true, message: 'Spare part deleted' };
  }

  async getInventoryByBranch(branchId: string) {
    return this.repo.getInventoryByBranch(branchId);
  }

  /**
   * Get spare part by ID with caching
   */
  async findById(id: string): Promise<SparePart | null> {
    // Try cache first (cache-aside pattern)
    const cacheKey = `sparepart:${id}`;
    const cached = await getCached<SparePart>(cacheKey);

    if (cached) {
      logger.debug(`Cache HIT for spare part: ${id}`);
      return cached;
    }

    // Cache miss - fetch from database
    logger.debug(`Cache MISS for spare part: ${id}`);
    const sparePart = await this.repo.findById(id);

    if (sparePart) {
      // Store in cache for future requests
      await setCached(cacheKey, sparePart, 3600); // 1 hour TTL
    }

    return sparePart;
  }
}
