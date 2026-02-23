import { Source } from '../config/db';
import { Product, ProductStatus } from '../entities/productEntity';
import { IsNull, FindOptionsWhere } from 'typeorm';

export class ProductRepository {
  private repo = Source.getRepository(Product);

  /**
   * Adds a new product.
   */
  async addProduct(entity: Partial<Product>) {
    return this.repo.save(entity);
  }

  /**
   * Retrieves all products not associated with spare parts, optionally filtered by branch.
   */
  async getAllProducts(branchId?: string) {
    const where: FindOptionsWhere<Product> = { spare_part_id: IsNull() };
    if (branchId && branchId !== 'All') {
      where.warehouse = { branchId };
    }

    return this.repo.find({
      relations: { model: true, warehouse: true, lot: true },
      where,
    });
  }

  /**
   * Updates a product.
   */
  async updateProduct(id: string, data: Partial<Product>) {
    await this.repo.update(id, data);
    return this.repo.findOne({
      where: { id },
      relations: { model: true, warehouse: true },
    });
  }

  /**
   * Deletes a product.
   */
  async deleteProduct(id: string) {
    return this.repo.delete(id);
  }

  /**
   * Finds a product by ID.
   */
  async findOne(id: string) {
    return this.repo.findOne({
      where: { id },
      relations: { model: true, warehouse: true },
    });
  }

  async updateStatusForRentBill(productId: string): Promise<void> {
    const product = await this.repo.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }

    product.product_status = ProductStatus.RENTED;
    await this.repo.save(product);
  }

  async updateStatusForLeaseBill(productId: string): Promise<void> {
    const product = await this.repo.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }

    product.product_status = ProductStatus.LEASE;
    await this.repo.save(product);
  }

  async updateStatusForSaleBill(productId: string): Promise<void> {
    const product = await this.repo.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }

    product.product_status = ProductStatus.SOLD;
    await this.repo.save(product);
  }

  /**
   * Finds multiple products by their IDs.
   */
  async findByIds(ids: string[]): Promise<Product[]> {
    if (ids.length === 0) return [];

    return this.repo.find({
      where: ids.map((id) => ({ id })),
      relations: { model: true, warehouse: true },
    });
  }
}
