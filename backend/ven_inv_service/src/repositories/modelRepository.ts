import { Source } from '../config/db';
import { Model } from '../entities/modelEntity';

export class ModelRepository {
  private get repo() {
    return Source.getRepository(Model);
  }

  /**
   * Adds a new model.
   */
  async addModel(data: Partial<Model>) {
    const model = this.repo.create(data);
    await this.repo.save(model);
    return this.repo.findOne({
      where: { id: model.id },
      relations: ['brandRelation'],
    });
  }

  /**
   * Retrieves all models with associated product details.
   */
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

  /**
   * Updates an existing model.
   */
  async updateModel(id: string, data: Partial<Model>) {
    await this.repo.update(id, data);
    return this.repo.findOne({
      where: { id },
      relations: ['brandRelation'],
    });
  }

  /**
   * Deletes a model.
   */
  async deleteModel(id: string) {
    return this.repo.delete(id);
  }

  /**
   * Finds a model by ID.
   */
  async findbyid(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  /**
   * Counts products associated with a model.
   */
  async countProductsForModel(modelId: string): Promise<number> {
    const result = await Source.query(
      `SELECT COUNT(*) as count FROM "products" WHERE "model_id" = $1 AND "product_status" = 'AVAILABLE'`,
      [modelId],
    );
    if (!result || result.length === 0) {
      return 0;
    }
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

  /**
   * Counts available products for a model.
   */
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

  /**
   * Syncs model quantities by aggregating actual product status counts.
   */
  async syncModelQuantities(modelId: string): Promise<void> {
    const result = await Source.query(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN "product_status" = 'AVAILABLE' THEN 1 ELSE 0 END) as available,
         SUM(CASE WHEN "product_status" = 'RENTED' THEN 1 ELSE 0 END) as rented,
         SUM(CASE WHEN "product_status" = 'LEASE' THEN 1 ELSE 0 END) as leased,
         SUM(CASE WHEN "product_status" = 'SOLD' THEN 1 ELSE 0 END) as sold
       FROM "products"
       WHERE "model_id" = $1`,
      [modelId],
    );

    if (result && result.length > 0) {
      const stats = result[0];
      await this.repo.update(modelId, {
        quantity: parseInt(stats.total) || 0,
        available: parseInt(stats.available) || 0,
        rented: parseInt(stats.rented) || 0,
        leased: parseInt(stats.leased) || 0,
        sold: parseInt(stats.sold) || 0,
      });
    } else {
      await this.repo.update(modelId, {
        quantity: 0,
        available: 0,
        rented: 0,
        leased: 0,
        sold: 0,
      });
    }
  }
}
