import { Source } from "../config/dataSource";
import { MagicLink } from "../entities/magicLinkEntity";

export class MagicLinkRepository {
  private repo = Source.getRepository(MagicLink);

  async create(data: Partial<MagicLink>) {
    const link = this.repo.create(data);
    return this.repo.save(link);
  }

  async findValidByEmail(email: string) {
    return this.repo.findOne({
      where: { email, is_used: false },
      order: { createdAt: "DESC" },
    });
  }

  async markUsed(id: string) {
    return this.repo.update(id, { is_used: true });
  }
}
