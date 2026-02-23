import { Branch, BranchStatus } from '../entities/branchEntity';
import { DataSource } from 'typeorm';

export class BranchRepository {
  constructor(private readonly db: DataSource) {}

  /**
   * Creates a new branch.
   */
  create(payload: Partial<Branch>) {
    return this.db.getRepository(Branch).save(payload);
  }

  /**
   * Finds all active and inactive branches.
   */
  findAll() {
    return this.db.getRepository(Branch).find({
      where: [{ status: BranchStatus.ACTIVE }, { status: BranchStatus.INACTIVE }],
    });
  }

  /**
   * Finds a branch by ID.
   */
  findById(id: string) {
    return this.db.getRepository(Branch).findOne({
      where: { id },
    });
  }

  /**
   * Updates a branch.
   */
  update(id: string, payload: Partial<Branch>) {
    return this.db.getRepository(Branch).update({ id }, payload);
  }

  /**
   * Soft deletes a branch.
   */
  softDelete(id: string) {
    return this.db.getRepository(Branch).update({ id }, { status: BranchStatus.DELETED });
  }
}
