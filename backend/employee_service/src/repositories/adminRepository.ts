import { Source } from '../config/dataSource';
import { Admin } from '../entities/adminEntities';

export class AdminRepository {
  private repo = Source.getRepository(Admin);

  async findByEmail(email: string) {
    return this.repo.findOne({ where: { email } });
  }
}
