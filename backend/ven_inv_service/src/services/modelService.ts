import { Model } from '../entities/modelEntity';
import { AppError } from '../errors/appError';
import { ModelRepository } from '../repositories/modelRepository';
import { BrandRepository } from '../repositories/brandRepository';
import { Source } from '../config/db';

export class ModelService {
  private modelRepository = new ModelRepository();
  private brandRepository = new BrandRepository(Source);

  async createModel(data: Partial<Model>) {
    if (!data.brand_id) {
      throw new AppError('Brand is required', 400);
    }
    const brand = await this.brandRepository.findOne({ where: { id: data.brand_id } });
    if (!brand) {
      throw new AppError('Invalid brand selected', 400);
    }
    const newmodel = this.modelRepository.addModel(data);
    if (!newmodel) {
      throw new AppError('Model creation failed', 404);
    }
    return newmodel;
  }

  async fetchAllModels() {
    return this.modelRepository.getAllModels();
  }

  async modifyModel(id: string, data: Partial<Model>) {
    return this.modelRepository.updateModel(id, data);
  }

  async removeModel(id: string) {
    const model = await this.modelRepository.findbyid(id);
    if (!model) {
      throw new AppError('Model not found', 404);
    }
    return this.modelRepository.deleteModel(id);
  }

  async syncQuantities() {
    const models = await this.modelRepository.getAllModels();
    for (const model of models) {
      // Assuming product repository can count products by model_id
      // Since we don't have direct access to product repo here, we might need to inject it or use a query builder in model repo
      // For now, let's assume we can fetch products via relation if loaded, but getAllModels doesn't load products.
      // Better approach: Use a raw query or add a method in ModelRepository to count products.
      // Let's modify ModelRepository to handle this more efficiently.

      // Actually, let's execute a raw query to update all model quantities at once or iterate.
      // Iterating is safer for now.
      // We need a way to count products for a model.
      // Let's add calculateModelQuantity to ModelRepository.
      const count = await this.modelRepository.countProductsForModel(model.id);
      if (model.quantity !== count) {
        await this.modelRepository.updateModel(model.id, { quantity: count });
      }

      // Restore missing brand association if possible
      if (!model.brand_id && !model.brandRelation) {
        const product = await this.modelRepository.findFirstProductForModel(model.id);
        if (product && product.brand) {
          const brand = await this.brandRepository.findOne({ where: { name: product.brand } });
          if (brand) {
            await this.modelRepository.updateModel(model.id, { brand_id: brand.id });
          }
        }
      }
    }
    return { success: true };
  }
}
