import { Branch, BranchStatus } from '../entities/branchEntity';
import { DataSource } from 'typeorm';

export class BranchRepository {
  constructor(private readonly db: DataSource) {}

  create(payload: Partial<Branch>) {
    return this.db.getRepository(Branch).save(payload);
  }

  findAll() {
    return this.db.getRepository(Branch).find({
      where: [{ status: BranchStatus.ACTIVE }, { status: BranchStatus.INACTIVE }],
    });
  }

  findById(id: string) {
    return this.db.getRepository(Branch).findOne({
      where: { id },
    });
  }

  update(id: string, payload: Partial<Branch>) {
    return this.db.getRepository(Branch).update({ id }, payload);
  }

  softDelete(id: string) {
    return this.db.getRepository(Branch).update({ id }, { status: BranchStatus.DELETED });
  }
}
