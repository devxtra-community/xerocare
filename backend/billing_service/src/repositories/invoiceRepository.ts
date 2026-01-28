import { Repository, Between } from 'typeorm';
import { Invoice } from '../entities/invoiceEntity';
import { InvoiceStatus } from '../entities/enums/invoiceStatus';
import { InvoiceType } from '../entities/enums/invoiceType';
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

  save(invoice: Invoice) {
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
      relations: ['items'],
    });
  }

  findByCreatorId(createdBy: string) {
    return this.repo.find({
      where: { createdBy },
      order: {
        createdAt: 'DESC',
      },
      relations: ['items'],
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

  async getStats(
    filter: { createdBy?: string; branchId?: string } = {},
  ): Promise<{ saleType: string; count: number }[]> {
    const query = this.repo
      .createQueryBuilder('invoice')
      .select('invoice.saleType', 'saleType')
      .addSelect('COUNT(*)', 'count');

    if (filter.createdBy) {
      query.andWhere('invoice.createdBy = :createdBy', { createdBy: filter.createdBy });
    }
    if (filter.branchId) {
      query.andWhere('invoice.branchId = :branchId', { branchId: filter.branchId });
    }

    const results = await query.groupBy('invoice.saleType').getRawMany();
    return results.map((r) => ({
      saleType: r.saleType,
      count: parseInt(r.count, 10),
    }));
  }

  async getBranchSalesTrend(
    branchId: string,
    startDate: Date,
  ): Promise<{ date: string; totalSales: number }[]> {
    const query = this.repo
      .createQueryBuilder('invoice')
      .select("TO_CHAR(invoice.createdAt, 'YYYY-MM-DD')", 'date')
      .addSelect('SUM(invoice.totalAmount)', 'totalSales')
      .where('invoice.branchId = :branchId', { branchId })
      .andWhere('invoice.createdAt >= :startDate', { startDate })
      .andWhere('invoice.status IN (:...statuses)', {
        statuses: [InvoiceStatus.PAID, InvoiceStatus.ISSUED],
      })
      .andWhere('invoice.type != :type', { type: InvoiceType.PROFORMA })
      .groupBy("TO_CHAR(invoice.createdAt, 'YYYY-MM-DD')")
      .orderBy('date', 'ASC');

    const results = await query.getRawMany();
    return results.map((r) => ({
      date: r.date,
      totalSales: parseFloat(r.totalSales) || 0,
    }));
  }
}
