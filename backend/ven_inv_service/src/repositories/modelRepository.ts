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
    const rawAndEntities = await this.repo
      .createQueryBuilder('model')
      .leftJoinAndSelect('model.brandRelation', 'brandRelation')
      .addSelect((subQuery) => {
        return subQuery
          .select('p.name')
          .from('products', 'p')
          .where('p.model_id = model.id')
          .limit(1);
      }, 'product_name')
      .addSelect((subQuery) => {
        return subQuery
          .select('p.print_colour')
          .from('products', 'p')
          .where('p.model_id = model.id')
          .limit(1);
      }, 'print_colour')
      .orderBy('model.model_name', 'ASC')
      .getRawAndEntities();

    return rawAndEntities.entities.map((entity, index) => {
      // @ts-expect-error - injecting dynamic property
      entity.product_name = rawAndEntities.raw[index].product_name;
      // @ts-expect-error - injecting dynamic property
      entity.print_colour = rawAndEntities.raw[index].print_colour;
      return entity;
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

  async countAvailableProducts(modelId: string): Promise<number> {
    const result = await Source.query(
      `SELECT COUNT(*) as count FROM "products" WHERE "model_id" = $1 AND "product_status" = 'AVAILABLE'`,
      [modelId],
    );
    if (!result || result.length === 0) {
      return 0;
    }
    return parseInt(result[0].count, 10) || 0;
  }
}
