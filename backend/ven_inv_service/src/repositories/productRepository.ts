import { Source } from '../config/db';
import { Product } from '../entities/productEntity';

export class ProductRepository {
  private repo = Source.getRepository(Product);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async addProduct(data: any) {
    if (data.model_id) {
      data.model = { id: data.model_id };
      delete data.model_id;
    }
    const product = this.repo.create(data);
    return this.repo.save(product);
  }

  async getAllProducts() {
    return this.repo.find({
      relations: {
        model: true,
      },
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async updateProduct(id: string, data: any) {
    if (data.model_id) {
      data.model = { id: data.model_id };
      delete data.model_id;
    }
    await this.repo.update(id, data);
    return this.repo.findOne({
      where: { id },
      relations: {
        model: true,
      },
    });
  }

  async deleteProduct(id: string) {
    return this.repo.delete(id);
  }

  async findOne(id: string) {
    return this.repo.findOne({
      where: { id },
      relations: {
        model: true,
      },
    });
  }
}
