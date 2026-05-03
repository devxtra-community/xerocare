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
      relations: ['manager'],
    });
  }

  /**
   * Finds a branch by ID.
   */
  findById(id: string) {
    return this.db.getRepository(Branch).findOne({
      where: { id },
      relations: ['manager'],
    });
  }

  /**
   * Finds a branch by manager ID.
   */
  findByManagerId(managerId: string) {
    return this.db.getRepository(Branch).findOne({
      where: { manager_id: managerId },
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
