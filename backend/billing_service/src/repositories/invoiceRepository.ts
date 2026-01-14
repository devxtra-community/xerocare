import { Repository, Between } from 'typeorm';
import { Invoice } from '../entities/invoiceEntity';
import { Source } from '../config/dataSource';

export class InvoiceRepository {
  private repo: Repository<Invoice>;

  constructor() {
    this.repo = Source.getRepository(Invoice);
  }

  createInvoice(data: Partial<Invoice>) {
    const invoice = this.repo.create(data);
    return this.repo.save(invoice);
  }

  findById(id: string) {
    return this.repo.findOne({
      where: { id },
      relations: ['items'],
    });
  }

  findAll() {
    return this.repo.find({
      order: {
        createdAt: 'DESC',
      },
    });
  }

  findByCreatorId(createdBy: string) {
    return this.repo.find({
      where: { createdBy },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  updateStatus(id: string, status: Invoice['status']) {
    return this.repo.update(id, { status });
  }

  async getInvoiceCountForYear(year: number): Promise<number> {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year + 1, 0, 1);

    return await this.repo.count({
      where: {
        createdAt: Between(startDate, endDate),
      },
    });
  }
}
