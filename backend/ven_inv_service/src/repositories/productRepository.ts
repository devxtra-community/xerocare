import { Source } from '../config/db';
import { Product, ProductStatus } from '../entities/productEntity';
import { IsNull, FindOptionsWhere, ILike } from 'typeorm';

export class ProductRepository {
  private repo = Source.getRepository(Product);

  /**
   * Adds a new product.
   */
  async addProduct(entity: Partial<Product>) {
    return this.repo.save(entity);
  }

  /**
   * Retrieves all products, optionally filtered by branch, model, and status.
   * Supports pagination and search.
   */
  async getAllProducts(
    branchId?: string,
    modelId?: string,
    status?: ProductStatus,
    page: number = 1,
    limit: number = 10,
    search?: string,
  ) {
    const where: FindOptionsWhere<Product>[] = [];

    const baseWhere: FindOptionsWhere<Product> = { spare_part_id: IsNull() };
    if (branchId && branchId !== 'All') {
      baseWhere.warehouse = { branchId };
    }
    if (modelId) {
      baseWhere.model_id = modelId;
    }
    if (status) {
      baseWhere.product_status = status;
    }

    if (search) {
      const searchTerms = [
        { ...baseWhere, name: ILike(`%${search}%`) },
        { ...baseWhere, brand: ILike(`%${search}%`) },
        { ...baseWhere, serial_no: ILike(`%${search}%`) },
      ];
      where.push(...searchTerms);
    } else {
      where.push(baseWhere);
    }

    const [data, total] = await this.repo.findAndCount({
      where,
      relations: { model: true, warehouse: true, lot: true },
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
    });

    return { data, total };
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
