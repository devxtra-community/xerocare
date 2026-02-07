import { Source } from '../config/db';
import { Product, ProductStatus } from '../entities/productEntity';
import { IsNull } from 'typeorm';

export class ProductRepository {
  private repo = Source.getRepository(Product);

  async addProduct(entity: Partial<Product>) {
    return this.repo.save(entity);
  }

  async getAllProducts() {
    return this.repo.find({
      relations: { model: true, warehouse: true },
      where: { spare_part_id: IsNull() },
    });
  }

  async updateProduct(id: string, data: Partial<Product>) {
    await this.repo.update(id, data);
    return this.repo.findOne({
      where: { id },
      relations: { model: true, warehouse: true },
    });
  }

  async deleteProduct(id: string) {
    return this.repo.delete(id);
  }

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
}
