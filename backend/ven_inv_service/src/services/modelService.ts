import { Model } from '../entities/modelEntity';
import { AppError } from '../errors/appError';
import { ModelRepository } from '../repositories/modelRepository';
import { BrandRepository } from '../repositories/brandRepository';
import { Source } from '../config/db';
import { redisClient } from '../config/redis';
import { logger } from '../config/logger';

export class ModelService {
  private modelRepository = new ModelRepository();
  private brandRepository = new BrandRepository(Source);

  /**
   * Creates a new model.
   */
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

  /**
   * Retrieves all models.
   */
  async fetchAllModels() {
    return this.modelRepository.getAllModels();
  }

  /**
   * Modifies an existing model.
   */
  async modifyModel(id: string, data: Partial<Model>) {
    return this.modelRepository.updateModel(id, data);
  }

  /**
   * Removes a model.
   */
  async removeModel(id: string) {
    const model = await this.modelRepository.findbyid(id);
    if (!model) {
      throw new AppError('Model not found', 404);
    }
    return this.modelRepository.deleteModel(id);
  }

  /**
   * Syncs model quantities and brands based on products.
   */
  async syncQuantities() {
    const models = await this.modelRepository.getAllModels();
    for (const model of models) {
      const count = await this.modelRepository.countProductsForModel(model.id);

      if (model.quantity !== count) {
        await this.modelRepository.updateModel(model.id, { quantity: count });
      }

      if (!model.brand_id && !model.brandRelation) {
        const product = await this.modelRepository.findFirstProductForModel(model.id);
        if (product && product.brand) {
          const brand = await this.brandRepository.findOne({ where: { name: product.brand } });
          if (brand) {
            await this.modelRepository.updateModel(model.id, { brand_id: brand.id });
          }
        }
      }

      await this.syncToRedis(model.id);
    }
    return { success: true };
  }

  /**
   * Syncs model availability to Redis.
   */
  async syncToRedis(modelId: string) {
    try {
      const model = await this.modelRepository.findbyid(modelId);
      if (!model) return;

      const available = await this.modelRepository.countAvailableProducts(modelId);
      const total = model.quantity;

      const payload = {
        modelId: model.id,
        name: model.model_name,
        available,
        total,
        updatedAt: new Date().toISOString(),
      };

      const redis = await redisClient.connect();
      if (redis) {
        await redis.hSet('inventory:models', model.id, JSON.stringify(payload));
      }
    } catch (error) {
      logger.error(`Failed to sync model ${modelId} to Redis`, error);
    }
  }
}
