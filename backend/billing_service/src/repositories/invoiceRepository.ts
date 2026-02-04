import { Repository, Between } from 'typeorm';
import { Invoice } from '../entities/invoiceEntity';
import { InvoiceStatus } from '../entities/enums/invoiceStatus';
import { InvoiceType } from '../entities/enums/invoiceType';
import { SaleType } from '../entities/enums/saleType';
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

  saveInvoice(invoice: Invoice) {
    return this.repo.save(invoice);
  }

  async isFirstFinalInvoice(contractId: string): Promise<boolean> {
    const count = await this.countFinalInvoicesByContractId(contractId);
    return count === 0;
  }

  findById(id: string) {
    return this.repo.findOne({
      where: { id },
      relations: ['items'],
    });
  }

  // RE-IMPLEMENTING findAll and findByBranchId using QueryBuilder to properly exclude FINAL

  async findAll(branchId?: string) {
    const qb = this.repo
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.items', 'items')
      .orderBy('invoice.createdAt', 'DESC');

    if (branchId) {
      qb.andWhere('invoice.branchId = :branchId', { branchId });
    }

    // EXCLUDE FINAL Invoices (Monthly Settlements) from the main list, UNLESS it's a direct SALE
    qb.andWhere('(invoice.type != :finalType OR invoice.saleType = :saleType)', {
      finalType: InvoiceType.FINAL,
      saleType: 'SALE',
    });

    return qb.getMany();
  }

  async findByCreatorId(createdBy: string) {
    return this.repo.find({
      where: { createdBy },
      order: {
        createdAt: 'DESC',
      },
      relations: ['items'],
    });
  }

  async findByBranchId(branchId: string) {
    const qb = this.repo
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.items', 'items')
      .where('invoice.branchId = :branchId', { branchId })
      .orderBy('invoice.createdAt', 'DESC');

    // EXCLUDE FINAL Invoices (Monthly Settlements) from the main list, UNLESS it's a direct SALE which becomes FINAL
    qb.andWhere('(invoice.type != :finalType OR invoice.saleType = :saleType)', {
      finalType: InvoiceType.FINAL,
      saleType: 'SALE',
    });

    return qb.getMany();
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

  async countFinalInvoicesByContractId(contractId: string): Promise<number> {
    return this.repo.count({
      where: {
        referenceContractId: contractId,
        type: InvoiceType.FINAL,
      },
    });
  }

  async getStats(
    filter: {
      createdBy?: string;
      branchId?: string;
      startOfDay?: Date;
      startOfMonth?: Date;
    } = {},
  ): Promise<{ saleType: string; count: number; todayCount: number; monthCount: number }[]> {
    const query = this.repo
      .createQueryBuilder('invoice')
      .select('invoice.saleType', 'saleType')
      .addSelect('COUNT(*)', 'count');

    // Conditional Aggregation for Time-based stats
    if (filter.startOfDay) {
      query.addSelect(
        'SUM(CASE WHEN invoice.createdAt >= :startOfDay THEN 1 ELSE 0 END)',
        'todayCount',
      );
      query.setParameter('startOfDay', filter.startOfDay);
    }
    if (filter.startOfMonth) {
      query.addSelect(
        'SUM(CASE WHEN invoice.createdAt >= :startOfMonth THEN 1 ELSE 0 END)',
        'monthCount',
      );
      query.setParameter('startOfMonth', filter.startOfMonth);
    }

    if (filter.createdBy) {
      query.andWhere('invoice.createdBy = :createdBy', { createdBy: filter.createdBy });
    }
    if (filter.branchId) {
      query.andWhere('invoice.branchId = :branchId', { branchId: filter.branchId });
    }

    const results = await query.groupBy('invoice.saleType').getRawMany();
    // console.log('Invoice Stats Raw Results:', results);

    return results.map((r) => ({
      saleType: r.saleType || r.saletype,
      count: parseInt(r.count, 10),
      todayCount: filter.startOfDay ? parseInt(r.todayCount || r.todaycount || '0', 10) : 0,
      monthCount: filter.startOfMonth ? parseInt(r.monthCount || r.monthcount || '0', 10) : 0,
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
        statuses: [InvoiceStatus.PAID, InvoiceStatus.ISSUED, InvoiceStatus.FINANCE_APPROVED],
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

  async getGlobalSalesTrend(startDate: Date): Promise<{ date: string; totalSales: number }[]> {
    const query = this.repo
      .createQueryBuilder('invoice')
      .select("TO_CHAR(invoice.createdAt, 'YYYY-MM-DD')", 'date')
      .addSelect('SUM(invoice.totalAmount)', 'totalSales')
      .where('invoice.createdAt >= :startDate', { startDate })
      .andWhere('invoice.status IN (:...statuses)', {
        statuses: [InvoiceStatus.PAID, InvoiceStatus.ISSUED, InvoiceStatus.FINANCE_APPROVED],
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

  async getGlobalSalesTotals(): Promise<{
    totalSales: number;
    salesByType: { saleType: string; total: number }[];
    totalInvoices: number;
  }> {
    const totalResult = await this.repo
      .createQueryBuilder('invoice')
      .select('SUM(invoice.totalAmount)', 'totalSales')
      .addSelect('COUNT(*)', 'totalInvoices')
      .where('invoice.status IN (:...statuses)', {
        statuses: [InvoiceStatus.PAID, InvoiceStatus.ISSUED, InvoiceStatus.FINANCE_APPROVED],
      })
      .andWhere('invoice.type != :type', { type: InvoiceType.PROFORMA })
      .getRawOne();

    const totalSales = parseFloat(totalResult?.totalSales) || 0;
    const totalInvoices = parseInt(totalResult?.totalInvoices, 10) || 0;

    const salesByTypeResults = await this.repo
      .createQueryBuilder('invoice')
      .select('invoice.saleType', 'saleType')
      .addSelect('SUM(invoice.totalAmount)', 'total')
      .where('invoice.status IN (:...statuses)', {
        statuses: [InvoiceStatus.PAID, InvoiceStatus.ISSUED, InvoiceStatus.FINANCE_APPROVED],
      })
      .andWhere('invoice.type != :type', { type: InvoiceType.PROFORMA })
      .groupBy('invoice.saleType')
      .getRawMany();

    const salesByType = salesByTypeResults.map((r) => ({
      saleType: r.saleType,
      total: parseFloat(r.total) || 0,
    }));

    return {
      totalSales,
      salesByType,
      totalInvoices,
    };
  }

  async getBranchSalesTotals(branchId: string): Promise<{
    totalSales: number;
    salesByType: { saleType: string; total: number }[];
    totalInvoices: number;
  }> {
    // Get total sales amount for the branch (PAID and ISSUED invoices only, excluding PROFORMA)
    const totalResult = await this.repo
      .createQueryBuilder('invoice')
      .select('SUM(invoice.totalAmount)', 'totalSales')
      .addSelect('COUNT(*)', 'totalInvoices')
      .where('invoice.branchId = :branchId', { branchId })
      .andWhere('invoice.status IN (:...statuses)', {
        statuses: [InvoiceStatus.PAID, InvoiceStatus.ISSUED],
      })
      .andWhere('invoice.type != :type', { type: InvoiceType.PROFORMA })
      .getRawOne();

    const totalSales = parseFloat(totalResult?.totalSales) || 0;
    const totalInvoices = parseInt(totalResult?.totalInvoices, 10) || 0;

    // Get sales breakdown by sale type
    const salesByTypeResults = await this.repo
      .createQueryBuilder('invoice')
      .select('invoice.saleType', 'saleType')
      .addSelect('SUM(invoice.totalAmount)', 'total')
      .where('invoice.branchId = :branchId', { branchId })
      .andWhere('invoice.status IN (:...statuses)', {
        statuses: [InvoiceStatus.PAID, InvoiceStatus.ISSUED],
      })
      .andWhere('invoice.type != :type', { type: InvoiceType.PROFORMA })
      .groupBy('invoice.saleType')
      .getRawMany();

    const salesByType = salesByTypeResults.map((r) => ({
      saleType: r.saleType,
      total: parseFloat(r.total) || 0,
    }));

    return {
      totalSales,
      salesByType,
      totalInvoices,
    };
  }
  async getPendingCounts(branchId?: string) {
    console.log('InvoiceRepo: getPendingCounts branchId:', branchId);
    const qb = this.repo
      .createQueryBuilder('invoice')
      .select('invoice.saleType', 'saleType')
      .addSelect('COUNT(invoice.id)', 'count')
      .where('invoice.status = :status', { status: InvoiceStatus.EMPLOYEE_APPROVED });

    if (branchId) {
      qb.andWhere('invoice.branchId = :branchId', { branchId });
    }

    const results = await qb.groupBy('invoice.saleType').getRawMany();
    // returns array like [{ saleType: 'SALE', count: '5' }, ...]
    console.log('InvoiceRepo: getPendingCounts results:', results);

    return results.map((r) => ({
      saleType: r.saleType || r.saletype, // Handle potential lowercase alias from Postgres
      count: Number(r.count),
    }));
  }

  async findActiveContracts(branchId?: string) {
    const qb = this.repo.createQueryBuilder('invoice');

    // Rent = PROFORMA (Contract), Lease = ACTIVE_LEASE
    // Filter by Branch if provided

    qb.where('(invoice.type = :proforma OR invoice.status = :activeLease)', {
      proforma: InvoiceType.PROFORMA,
      activeLease: InvoiceStatus.ACTIVE_LEASE,
    });

    if (branchId) {
      qb.andWhere('invoice.branchId = :branchId', { branchId });
    }

    // Also maybe SaleType check? PROFORMA implies Rent usually.
    // ACTIVE_LEASE implies Lease.
    return qb.getMany();
  }

  async getFinanceReport(
    filter: {
      branchId?: string;
      saleType?: string;
      month?: number;
      year?: number;
    } = {},
  ) {
    const qb = this.repo
      .createQueryBuilder('invoice')
      .select("TO_CHAR(invoice.createdAt, 'YYYY-MM')", 'month')
      .addSelect('invoice.branchId', 'branchId')
      .addSelect('invoice.saleType', 'saleType')
      .addSelect(
        `
        SUM(
          CASE 
            WHEN invoice.type = 'FINAL' THEN COALESCE(invoice.totalAmount, 0)
            WHEN invoice.saleType = 'SALE' AND invoice.status = 'FINANCE_APPROVED' THEN COALESCE(invoice.totalAmount, 0)
            WHEN invoice.saleType = 'RENT' AND invoice.status = 'FINANCE_APPROVED' THEN COALESCE(invoice.monthlyRent, 0)
            WHEN invoice.saleType = 'LEASE' AND (invoice.status = 'ACTIVE_LEASE' OR invoice.status = 'FINANCE_APPROVED') THEN 
              CASE 
                WHEN invoice.leaseType = 'EMI' THEN COALESCE(invoice.monthlyEmiAmount, 0)
                ELSE COALESCE(invoice.monthlyLeaseAmount, 0)
              END
            ELSE COALESCE(invoice.totalAmount, 0)
          END
        )`,
        'income',
      )
      .addSelect(
        `
        SUM(
          CASE 
            WHEN invoice.type = 'FINAL' THEN COALESCE(invoice.grossAmount, 0)
            WHEN invoice.saleType = 'SALE' THEN COALESCE(invoice.totalAmount, 0)
            WHEN invoice.saleType = 'RENT' THEN COALESCE(invoice.monthlyRent, 0)
            WHEN invoice.saleType = 'LEASE' THEN 
              CASE 
                WHEN invoice.leaseType = 'EMI' THEN COALESCE(invoice.monthlyEmiAmount, 0)
                ELSE COALESCE(invoice.monthlyLeaseAmount, 0)
              END
            ELSE COALESCE(invoice.totalAmount, 0)
          END
        )`,
        'grossIncome',
      )
      .addSelect('COUNT(invoice.id)', 'count')
      .where('invoice.status IN (:...includedStatuses)', {
        includedStatuses: [
          InvoiceStatus.FINANCE_APPROVED,
          InvoiceStatus.ACTIVE_LEASE,
          InvoiceStatus.ISSUED,
          InvoiceStatus.PAID,
        ],
      })
      .andWhere(
        '(invoice.type != :quotationType OR (invoice.saleType = :leaseType AND invoice.status = :activeLease))',
        {
          quotationType: InvoiceType.QUOTATION,
          leaseType: SaleType.LEASE,
          activeLease: InvoiceStatus.ACTIVE_LEASE,
        },
      );

    if (filter.branchId && filter.branchId !== 'All') {
      qb.andWhere('invoice.branchId = :branchId', { branchId: filter.branchId });
    }

    if (filter.saleType && filter.saleType !== 'All') {
      qb.andWhere('invoice.saleType = :saleType', { saleType: filter.saleType });
    }

    if (filter.year) {
      qb.andWhere('EXTRACT(YEAR FROM invoice.createdAt) = :year', { year: filter.year });
    }

    if (filter.month) {
      qb.andWhere('EXTRACT(MONTH FROM invoice.createdAt) = :month', { month: filter.month });
    }

    const results = await qb
      .groupBy("TO_CHAR(invoice.createdAt, 'YYYY-MM')")
      .addGroupBy('invoice.branchId')
      .addGroupBy('invoice.saleType')
      .orderBy('month', 'DESC')
      .getRawMany();

    return results.map((r) => ({
      month: r.month,
      branchId: r.branchId,
      source: r.saleType || r.saletype,
      income: parseFloat(r.income) || 0,
      grossIncome: parseFloat(r.grossIncome) || 0,
      count: parseInt(r.count, 10),
    }));
  }
}
