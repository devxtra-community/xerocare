import { Source } from '../config/db';
import { Model } from '../entities/modelEntity';

export class ModelRepository {
  private get repo() {
    return Source.getRepository(Model);
  }

  async addModel(data: Partial<Model>) {
    const model = this.repo.create(data);
    await this.repo.save(model);
    return this.repo.findOne({
      where: { id: model.id },
      relations: ['brandRelation'],
    });
  }

  async getAllModels() {
    return this.repo.find({
      relations: ['brandRelation'],
      order: {
        model_name: 'ASC',
      },
    });
  }

  async updateModel(id: string, data: Partial<Model>) {
    await this.repo.update(id, data);
    return this.repo.findOne({
      where: { id },
      relations: ['brandRelation'],
    });
  }

  async deleteModel(id: string) {
    return this.repo.delete(id);
  }

  async findbyid(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  async countProductsForModel(modelId: string): Promise<number> {
    const result = await Source.query(
      `SELECT COUNT(*) as count FROM "products" WHERE "model_id" = $1`,
      [modelId],
    );
    // Ensure result is valid
    if (!result || result.length === 0) {
      return 0;
    }
    // PostgreSQL COUNT returns a string, convert to number explicitly
    return Number(result[0].count);
  }

  async findFirstProductForModel(modelId: string) {
    const result = await Source.query(
      `SELECT brand FROM "products" WHERE "model_id" = $1 LIMIT 1`,
      [modelId],
    );
    if (!result || result.length === 0) {
      return null;
    }
    return result[0] as { brand: string };
  }
}
