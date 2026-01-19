import { Source } from '../config/db';
import { Product } from '../entities/productEntity';

export class ProductRepository {
  private repo = Source.getRepository(Product);

  async addProduct(entity: Partial<Product>) {
    return this.repo.save(entity);
  }

  async getAllProducts() {
    return this.repo.find({
      relations: { model: true, warehouse: true },
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
}
