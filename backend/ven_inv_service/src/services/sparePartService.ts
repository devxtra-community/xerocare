import { SparePartRepository } from '../repositories/sparePartRepository';
import { ModelRepository } from '../repositories/modelRepository';
import { WarehouseRepository } from '../repositories/warehouseRepository';
import { SparePart } from '../entities/sparePartEntity';
import { ProductStatus } from '../entities/productEntity';

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

    // 4. Create Stock (Product Entities)
    const quantity = (data as BulkUploadRow & { quantity?: number }).quantity;
    const warehouseId = (data as BulkUploadRow & { warehouse_id?: string }).warehouse_id;
    const vendorId = (data as BulkUploadRow & { vendor_id?: string }).vendor_id;

    if (quantity && quantity > 0) {
      if (!warehouseId || !vendorId) {
        throw new Error('Warehouse and Vendor are required when adding stock.');
      }

      const productsToCreate = [];
      for (let i = 0; i < quantity; i++) {
        // Generate pseudo-unique serial for bulk add
        // In production, user might scan barcodes. Here we auto-generate.
        const serialNo = `SP-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

        productsToCreate.push({
          spare_part_id: master.id,
          warehouse: { id: warehouseId }, // Relation
          vendor_id: vendorId, // Column
          serial_no: serialNo,
          name: master.part_name,
          brand: master.brand,
          base_price: master.base_price,
          sale_price: master.base_price, // Default sale price = base price
          product_status: ProductStatus.AVAILABLE,
          MFD: new Date(), // Default to today
          tax_rate: 0, // Default tax rate
        });
      }

      // We need a way to save these products. Repository doesn't expose ProductRepo directly.
      // We can add a method in SparePartRepository or use ProductRepository directly if we inject it.
      // For now, let's assume SparePartRepository can handle it or we use Source directly?
      // Better: Add `createProducts` to SparePartRepository.
      await this.repo.createProducts(productsToCreate);
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
