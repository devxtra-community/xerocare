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
}
