import { Model } from '../entities/modelEntity';
import { AppError } from '../errors/appError';
import { ModelRepository } from '../repositories/modelRepository';

export class ModelService {
  private modelRepository = new ModelRepository();

  async createModel(data: Partial<Model>) {
    const product = this.modelRepository.addModel(data);
    if (!product) {
      throw new AppError('Model creation failed', 404);
    }
    return product;
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
