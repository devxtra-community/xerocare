import { SparePartRepository } from '../repositories/sparePartRepository';
import { ModelRepository } from '../repositories/modelRepository';
import { WarehouseRepository } from '../repositories/warehouseRepository';
import { SparePart } from '../entities/sparePartEntity';

interface BulkUploadRow {
  lot_number: string;
  part_name: string;
  brand: string;
  model_id?: string; // Optional if universal
  base_price: number;
  vendor_id?: string;
  // Removed warehouse_id and quantity - Master Data Only
}

export class SparePartService {
  private repo = new SparePartRepository();
  private modelRepo = new ModelRepository();
  private warehouseRepo = new WarehouseRepository();

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
        results.errors.push({ item_code: row.lot_number, error: message });
      }
    }

    return results;
  }

  async addSingleSparePart(data: BulkUploadRow, branchId: string) {
    // 1. Validate Inputs
    const lotNumber = data.lot_number?.trim().toUpperCase();
    if (!lotNumber) throw new Error('Lot Number is required');

    // 2. Validate/Fetch Model (Optional)
    const modelId = data.model_id;
    if (modelId) {
      const model = await this.modelRepo.findbyid(modelId);
      if (!model) throw new Error(`Model not found: ${modelId}`);
    }

    // 3. Create Master Record (SparePart)
    // User Requirement change: "i dont want to merge the spare parts having the same item code"
    // Always create a new entry for every upload.
    const master = await this.repo.createMaster({
      lot_number: lotNumber,
      part_name: data.part_name,
      brand: data.brand,
      model_id: modelId || undefined,
      base_price: data.base_price,
      branch_id: branchId,
    });

    // 4. Create Stock (Spare Part Inventory)
    const quantity = (data as BulkUploadRow & { quantity?: number }).quantity;
    const warehouseId = (data as BulkUploadRow & { warehouse_id?: string }).warehouse_id;
    const vendorId = (data as BulkUploadRow & { vendor_id?: string }).vendor_id;
    // lotNumber already extracted above

    if (quantity && quantity > 0) {
      if (!warehouseId) {
        throw new Error('Warehouse is required when adding stock.');
      }
      // Vendor optional but good if provided
      await this.repo.updateStock(master.id, warehouseId, quantity, vendorId);
    }

    return { success: true, message: 'Spare part master data and stock processed' };
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
    return { success: true, message: 'Spare part updated' };
  }

  async deleteSparePart(id: string) {
    const hasInventory = await this.repo.hasInventory(id);
    if (hasInventory) {
      throw new Error('Cannot delete spare part with existing inventory.');
    }
    await this.repo.deleteMaster(id);
    return { success: true, message: 'Spare part deleted' };
  }

  async getInventoryByBranch(branchId: string) {
    return this.repo.getInventoryByBranch(branchId);
  }
}
