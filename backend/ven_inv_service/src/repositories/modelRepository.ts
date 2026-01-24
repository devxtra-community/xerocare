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
    return this.repo.find();
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
