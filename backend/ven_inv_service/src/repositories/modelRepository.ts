import { Source } from '../config/db';
import { Model } from '../entities/modelEntity';

export class ModelRepository {
  private get repo() {
    return Source.getRepository(Model);
  }

  async addModel(data: Partial<Model>) {
    const model = this.repo.create(data);
    return this.repo.save(model);
  }

  async getAllModels() {
    return (
      this.repo
        .createQueryBuilder('model')
        .leftJoin('model.products', 'product')
        .loadRelationCountAndMap('model.quantity', 'model.products')
        .select([
          'model.id',
          'model.model_no',
          'model.model_name',
          'model.brand',
          'model.description',
        ])
        // If the user wants the quantity to be available in the entity result, `loadRelationCountAndMap` is the cleanest way.
        // It maps the count to the `quantity` property of the entity.
        .getMany()
    );
  }

  async updateModel(id: string, data: Partial<Model>) {
    await this.repo.update(id, data);
    return this.repo.findOne({ where: { id } });
  }

  async deleteModel(id: string) {
    return this.repo.delete(id);
  }

  async findbyid(id: string) {
    return this.repo.findOne({ where: { id } });
  }
}
