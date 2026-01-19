import { Source } from '../config/db';
import { Product } from '../entities/productEntity';

export class ProductRepository {
  private repo = Source.getRepository(Product);

  async addProduct(data: Partial<Product>) {
    const product = this.repo.create(data);
    return this.repo.save(product);
  }

  async getAllProducts() {
    return this.repo.find();
  }

  async updateProduct(id: string, data: Partial<Product>) {
    await this.repo.update(id, data);
    return this.repo.findOne({ where: { id } });
  }

  async deleteProduct(id: string) {
    return this.repo.delete(id);
  }
  async findOne(id: string) {
    return this.repo.findOne({ where: { id } });
  }
}
