import { Repository, FindOptionsWhere, DeepPartial, ObjectLiteral } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

export class BaseRepository<T extends ObjectLiteral> {
  constructor(private repository: Repository<T>) {}

  /**
   * Retrieves all entities.
   */
  async findAll(): Promise<T[]> {
    return this.repository.find();
  }

  /**
   * Finds an entity by ID.
   */
  async findById(id: string): Promise<T | null> {
    return this.repository.findOne({
      where: { id } as unknown as FindOptionsWhere<T>,
    });
  }

  /**
   * Creates and saves a new entity.
   */
  async create(data: DeepPartial<T>): Promise<T> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  /**
   * Updates an entity by ID.
   */
  async update(id: string, data: DeepPartial<T>): Promise<T | null> {
    await this.repository.update(id, data as unknown as QueryDeepPartialEntity<T>);
    return this.findById(id);
  }

  /**
   * Deletes an entity by ID.
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
