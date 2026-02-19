import { Source } from '../config/db';
import { SparePart } from '../entities/sparePartEntity';

import { Product } from '../entities/productEntity';

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
    return this.masterRepo.update(id, data);
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

  // Listing for Manager
  /**
   * Retrieves spare part inventory for a branch.
   */
  async getInventoryByBranch(branchId: string) {
    return this.masterRepo
      .createQueryBuilder('sp')
      .leftJoin('sp.model', 'model')
      .select([
        'sp.id AS id',
        'sp.item_code AS item_code',
        'sp.item_code AS lot_number',
        'sp.part_name AS part_name',
        'sp.brand AS brand',
        'model.model_name AS compatible_model',
        'sp.quantity AS quantity',
        'sp.base_price AS price',
      ])
      .where('sp.branch_id = :branchId', { branchId })
      .orderBy('sp.created_at', 'DESC')
      .getRawMany();
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
