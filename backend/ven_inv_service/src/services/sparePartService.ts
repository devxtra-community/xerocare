import { SparePartRepository } from '../repositories/sparePartRepository';
import { ModelRepository } from '../repositories/modelRepository';
import { WarehouseRepository } from '../repositories/warehouseRepository';

interface BulkUploadRow {
  item_code: string;
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

    // 3. Find or Create Master Record (SparePart)
    // Strictly scoped by Branch? Or global item code but authorized by branch?
    // User Requirement: "Manager can add spare parts only to their branch... Manager from another branch sees nothing"
    // Implication: Item Code "HP-01" in Branch A is DIFFERENT from "HP-01" in Branch B?
    // "item_code (UNIQUE)" in db schema usually means global unique.
    // If unique, then Branch B cannot create "HP-01" if Branch A already did.
    // BUT "Manager from another branch sees nothing".
    // If I findMasterByItemCode, and it belongs to Branch A, should Branch B error?
    // "Duplicate detected by item_code" -> This implies global uniqueness or per-branch?
    // Given "SparePart = Master Data", usually one dictionary.
    // BUT "Manager... sees only spare parts belonging to their branch".
    // This strongly implies SparePart table has `branch_id` and Unique is `(item_code, branch_id)`.
    // However, the requested schema said "item_code: string (UNIQUE)".
    // If Item Code is globally unique, then valid "HP-01" can only exist in one branch.
    // This matches "Manager can add spare parts only to their branch".
    // So if Branch A adds it, Branch A owns it. Branch B cannot see or add it.

    let master = await this.repo.findMasterByItemCode(itemCode);
    if (master) {
      if (master.branch_id !== branchId) {
        throw new Error(`Item code ${itemCode} already exists in another branch.`);
      }
      // If exists in same branch, we just return success (idempotent)
    } else {
      master = await this.repo.createMaster({
        item_code: itemCode,
        part_name: data.part_name,
        brand: data.brand,
        model_id: modelId || undefined,
        base_price: data.base_price,
        branch_id: branchId, // Assigned to creating branch
      });
    }

    // 4. No Stock Update (Derived Architecture)
    return { success: true, message: 'Spare part master data processed' };
  }

  async getInventoryByBranch(branchId: string) {
    return this.repo.getInventoryByBranch(branchId);
  }
}
