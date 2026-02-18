import { Repository, Between, Brackets } from 'typeorm';
import { Invoice } from '../entities/invoiceEntity';
import { InvoiceStatus } from '../entities/enums/invoiceStatus';
import { InvoiceType } from '../entities/enums/invoiceType';
import { SaleType } from '../entities/enums/saleType';
import { InvoiceItem } from '../entities/invoiceItemEntity';
import { Source } from '../config/dataSource';
import { ContractStatus } from '../entities/enums/contractStatus';

export class InvoiceRepository {
  private repo: Repository<Invoice>;

  constructor() {
    this.repo = Source.getRepository(Invoice);
  }

  get manager() {
    return this.repo.manager;
  }

  /**
   * Creates a new invoice entity from partial data.
   */
  createInvoice(data: Partial<Invoice>) {
    const invoice = this.repo.create(data);
    return this.repo.save(invoice);
  }

  /**
   * Removes all items associated with an invoice.
   */
  async clearItems(invoiceId: string) {
    await Source.getRepository(InvoiceItem).delete({
      invoice: { id: invoiceId },
    } as { invoice: { id: string } });
  }

  /**
   * Saves an invoice, preserving original dates for Proforma invoices.
   */
  async save(invoice: Invoice) {
    if (invoice.id && invoice.type === InvoiceType.PROFORMA) {
      // Find existing to prevent date mutation
      const existing = await this.repo.findOne({ where: { id: invoice.id } });
      if (existing && existing.type === InvoiceType.PROFORMA) {
        // Force dates to remain as they were
        if (existing.effectiveFrom) invoice.effectiveFrom = existing.effectiveFrom;
        if (existing.effectiveTo) invoice.effectiveTo = existing.effectiveTo;
      }
    }
    return this.repo.save(invoice);
  }

  /**
   * Alias for save, ensuring consistent date handling.
   */
  async saveInvoice(invoice: Invoice) {
    if (invoice.id && invoice.type === InvoiceType.PROFORMA) {
      // Find existing to prevent date mutation
      const existing = await this.repo.findOne({ where: { id: invoice.id } });
      if (existing && existing.type === InvoiceType.PROFORMA) {
        // Force dates to remain as they were
        if (existing.effectiveFrom) invoice.effectiveFrom = existing.effectiveFrom;
        if (existing.effectiveTo) invoice.effectiveTo = existing.effectiveTo;
      }
    }
    return this.repo.save(invoice);
  }

  /**
   * Checks if this is the first final invoice generated for a contract.
   */
  async isFirstFinalInvoice(contractId: string): Promise<boolean> {
    const count = await this.countFinalInvoicesByContractId(contractId);
    return count === 0;
  }

  /**
   * Generates a unique invoice number (INV-YYYY-XXXX).
   */
  async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.getInvoiceCountForYear(year);
    const paddedCount = String(count + 1).padStart(4, '0');
    return `INV-${year}-${paddedCount}`;
  }

  /**
   * Finds an invoice by ID, including its items.
   */
  findById(id: string) {
    return this.repo.findOne({
      where: { id },
      relations: ['items'],
    });
  }

  /**
   * Finds all invoices, optionally filtered by branch.
   * Excludes FINAL invoices unless they are direct SALES.
   */
  async findAll(branchId?: string) {
    const qb = this.repo
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.items', 'items')
      .orderBy('invoice.createdAt', 'DESC');

    if (branchId) {
      qb.andWhere('invoice.branchId = :branchId', { branchId });
    }

    qb.andWhere(
      new Brackets((innerQb) => {
        innerQb
          .where('invoice.type != :finalType', { finalType: 'FINAL' })
          .orWhere('invoice.saleType = :saleType', { saleType: 'SALE' });
      }),
    );

    return qb.getMany();
  }

  /**
   * Finds invoices created by a specific user.
   */
  async findByCreatorId(createdBy: string) {
    return this.repo.find({
      where: { createdBy },
      order: {
        createdAt: 'DESC',
      },
      relations: ['items'],
    });
  }

  /**
   * Finds invoices for a branch, excluding certain types.
   */
  async findByBranchId(branchId: string) {
    const qb = this.repo
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.items', 'items')
      .where('invoice.branchId = :branchId', { branchId })
      .orderBy('invoice.createdAt', 'DESC');

    qb.andWhere(
      new Brackets((innerQb) => {
        innerQb
          .where('invoice.type != :finalType', { finalType: 'FINAL' })
          .orWhere('invoice.saleType = :saleType', { saleType: 'SALE' });
      }),
    );

    return qb.getMany();
  }

  /**
   * Updates the status of an invoice.
   */
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

  /**
   * Counts how many final invoices exist for a contract.
   */
  async countFinalInvoicesByContractId(contractId: string): Promise<number> {
    return this.repo.count({
      where: {
        referenceContractId: contractId,
        type: InvoiceType.FINAL,
      },
    });
  }

  /**
   * Finds all final invoices for a contract.
   */
  async findFinalInvoicesByContractId(contractId: string): Promise<Invoice[]> {
    return this.repo.find({
      where: {
        referenceContractId: contractId,
        type: InvoiceType.FINAL,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Aggregates invoice statistics (counts by type, today/month counts).
   */
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
    return results.map((r) => ({
      saleType: r.saleType || r.saletype,
      count: parseInt(r.count, 10),
      todayCount: filter.startOfDay ? parseInt(r.todayCount || r.todaycount || '0', 10) : 0,
      monthCount: filter.startOfMonth ? parseInt(r.monthCount || r.monthcount || '0', 10) : 0,
    }));
  }

  /**
   * Retrieves daily sales totals for a branch since a start date.
   */
  async getBranchSalesTrend(
    branchId: string,
    startDate: Date,
  ): Promise<{ date: string; saleType: string; totalSales: number }[]> {
    const query = this.repo
      .createQueryBuilder('invoice')
      .select("TO_CHAR(invoice.createdAt, 'YYYY-MM-DD')", 'date')
      .addSelect('invoice.saleType', 'saleType')
      .addSelect('SUM(invoice.totalAmount)', 'totalSales')
      .where('invoice.branchId = :branchId', { branchId })
      .andWhere('invoice.createdAt >= :startDate', { startDate })
      .andWhere('invoice.status IN (:...statuses)', {
        statuses: [
          InvoiceStatus.PAID,
          InvoiceStatus.ISSUED,
          InvoiceStatus.FINANCE_APPROVED,
          InvoiceStatus.ACTIVE_LEASE,
          InvoiceStatus.APPROVED,
        ],
      })
      .groupBy("TO_CHAR(invoice.createdAt, 'YYYY-MM-DD')")
      .addGroupBy('invoice.saleType')
      .orderBy('date', 'ASC');

    const results = await query.getRawMany();
    return results.map((r) => ({
      date: r.date,
      saleType: r.saleType || r.saletype,
      totalSales: parseFloat(r.totalSales) || 0,
    }));
  }

  /**
   * Retrieves global sales trends breakdown by sale type.
   */
  async getGlobalSalesTrend(
    startDate: Date,
  ): Promise<{ date: string; saleType: string; totalSales: number }[]> {
    const query = this.repo
      .createQueryBuilder('invoice')
      .select("TO_CHAR(invoice.createdAt, 'YYYY-MM-DD')", 'date')
      .addSelect('invoice.saleType', 'saleType')
      .addSelect('SUM(invoice.totalAmount)', 'totalSales')
      .where('invoice.createdAt >= :startDate', { startDate })
      .andWhere('invoice.status IN (:...statuses)', {
        statuses: [
          InvoiceStatus.PAID,
          InvoiceStatus.ISSUED,
          InvoiceStatus.FINANCE_APPROVED,
          InvoiceStatus.ACTIVE_LEASE,
          InvoiceStatus.EMPLOYEE_APPROVED,
          InvoiceStatus.APPROVED,
        ],
      })
      // Include all types for trend to support tooltip breakdown
      .groupBy("TO_CHAR(invoice.createdAt, 'YYYY-MM-DD')")
      .addGroupBy('invoice.saleType')
      .orderBy('date', 'ASC');

    const results = await query.getRawMany();
    return results.map((r) => ({
      date: r.date,
      saleType: r.saleType || r.saletype,
      totalSales: parseFloat(r.totalSales) || 0,
    }));
  }

  /**
   * Retrieves global total sales and breakdown by type.
   */
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
        statuses: [
          InvoiceStatus.PAID,
          InvoiceStatus.ISSUED,
          InvoiceStatus.FINANCE_APPROVED,
          InvoiceStatus.ACTIVE_LEASE,
          InvoiceStatus.EMPLOYEE_APPROVED,
          InvoiceStatus.APPROVED,
        ],
      })
      // Include all types that represent a commitment
      .getRawOne();

    const totalSales = parseFloat(totalResult?.totalSales) || 0;
    const totalInvoices = parseInt(totalResult?.totalInvoices, 10) || 0;

    const salesByTypeResults = await this.repo
      .createQueryBuilder('invoice')
      .select('invoice.saleType', 'saleType')
      .addSelect('SUM(invoice.totalAmount)', 'total')
      .where('invoice.status IN (:...statuses)', {
        statuses: [
          InvoiceStatus.PAID,
          InvoiceStatus.ISSUED,
          InvoiceStatus.FINANCE_APPROVED,
          InvoiceStatus.ACTIVE_LEASE,
          InvoiceStatus.EMPLOYEE_APPROVED,
          InvoiceStatus.APPROVED,
        ],
      })
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

  /**
   * Retrieves branch-specific total sales and breakdown by type.
   */
  async getBranchSalesTotals(branchId: string): Promise<{
    totalSales: number;
    salesByType: { saleType: string; total: number }[];
    totalInvoices: number;
  }> {
    const totalResult = await this.repo
      .createQueryBuilder('invoice')
      .select('SUM(invoice.totalAmount)', 'totalSales')
      .addSelect('COUNT(*)', 'totalInvoices')
      .where('invoice.branchId = :branchId', { branchId })
      .andWhere('invoice.status IN (:...statuses)', {
        statuses: [
          InvoiceStatus.PAID,
          InvoiceStatus.ISSUED,
          InvoiceStatus.FINANCE_APPROVED,
          InvoiceStatus.ACTIVE_LEASE,
          InvoiceStatus.APPROVED,
          InvoiceStatus.EMPLOYEE_APPROVED,
        ],
      })
      .andWhere('(invoice.type != :type OR invoice.saleType IN (:...saleTypes))', {
        type: InvoiceType.PROFORMA,
        saleTypes: ['SALE', 'RENT', 'LEASE'],
      })
      .getRawOne();

    const totalSales = parseFloat(totalResult?.totalSales) || 0;
    const totalInvoices = parseInt(totalResult?.totalInvoices, 10) || 0;

    const salesByTypeResults = await this.repo
      .createQueryBuilder('invoice')
      .select('invoice.saleType', 'saleType')
      .addSelect('SUM(invoice.totalAmount)', 'total')
      .where('invoice.branchId = :branchId', { branchId })
      .andWhere('invoice.status IN (:...statuses)', {
        statuses: [
          InvoiceStatus.PAID,
          InvoiceStatus.ISSUED,
          InvoiceStatus.FINANCE_APPROVED,
          InvoiceStatus.ACTIVE_LEASE,
          InvoiceStatus.APPROVED,
          InvoiceStatus.EMPLOYEE_APPROVED,
        ],
      })
      .andWhere('(invoice.type != :type OR invoice.saleType IN (:...saleTypes))', {
        type: InvoiceType.PROFORMA,
        saleTypes: ['SALE', 'RENT', 'LEASE'],
      })
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
  /**
   * Counts pending employee-approved invoices for a branch.
   */
  async getPendingCounts(branchId?: string) {
    const qb = this.repo
      .createQueryBuilder('invoice')
      .select('invoice.saleType', 'saleType')
      .addSelect('COUNT(invoice.id)', 'count')
      .where('invoice.status = :status', { status: InvoiceStatus.EMPLOYEE_APPROVED });

    if (branchId) {
      qb.andWhere('invoice.branchId = :branchId', { branchId });
    }

    const results = await qb.groupBy('invoice.saleType').getRawMany();
    console.log('InvoiceRepo: getPendingCounts results:', results);

    return results.map((r) => ({
      saleType: r.saleType || r.saletype, // Handle potential lowercase alias from Postgres
      count: Number(r.count),
    }));
  }

  /**
   * Finds active contracts (Proforma or Active Lease) for colleciton alerts.
   */
  async findActiveContracts(branchId?: string) {
    const qb = this.repo.createQueryBuilder('invoice');

    qb.where('(invoice.type = :proforma OR invoice.status = :activeLease)', {
      proforma: InvoiceType.PROFORMA,
      activeLease: InvoiceStatus.ACTIVE_LEASE,
    }).andWhere('(invoice.contractStatus IS NULL OR invoice.contractStatus != :completed)', {
      completed: ContractStatus.COMPLETED,
    });

    if (branchId) {
      qb.andWhere('invoice.branchId = :branchId', { branchId });
    }

    return qb.getMany();
  }

  /**
   * Finds completed contracts.
   */
  async findCompletedContracts(branchId?: string) {
    const qb = this.repo.createQueryBuilder('invoice').leftJoinAndSelect('invoice.items', 'items');

    qb.where('invoice.contractStatus = :completed', { completed: ContractStatus.COMPLETED });

    if (branchId) {
      qb.andWhere('invoice.branchId = :branchId', { branchId });
    }

    qb.orderBy('invoice.completedAt', 'DESC');

    return qb.getMany();
  }

  /**
   * Finds final invoices that are not yet paid.
   */
  async findUnpaidFinalInvoices(branchId?: string) {
    const qb = this.repo.createQueryBuilder('invoice');
    qb.where('invoice.type = :type', { type: InvoiceType.FINAL })
      .andWhere('invoice.status != :paid', { paid: InvoiceStatus.PAID })
      .andWhere('invoice.status != :cancelled', { cancelled: InvoiceStatus.CANCELLED });

    if (branchId) {
      qb.andWhere('invoice.branchId = :branchId', { branchId });
    }

    qb.orderBy('invoice.createdAt', 'DESC');
    return qb.getMany();
  }

  /**
   * Generates a comprehensive financial report based on filters.
   */
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

  /**
   * Retrieves high-level sales statistics for the Admin dashboard.
   */
  async getAdminSalesStats() {
    const statuses = [
      InvoiceStatus.PAID,
      InvoiceStatus.ISSUED,
      InvoiceStatus.FINANCE_APPROVED,
      InvoiceStatus.SENT,
      InvoiceStatus.EMPLOYEE_APPROVED,
      InvoiceStatus.DRAFT,
      InvoiceStatus.APPROVED,
    ];

    const totals = await this.repo
      .createQueryBuilder('invoice')
      .select('SUM(invoice.totalAmount)', 'totalRevenue')
      .addSelect('COUNT(invoice.id)', 'totalOrders')
      .where('invoice.saleType = :saleType', { saleType: SaleType.SALE })
      .andWhere('invoice.status IN (:...statuses)', { statuses })
      .getRawOne();

    const itemsStats = await Source.getRepository(InvoiceItem)
      .createQueryBuilder('item')
      .leftJoin('item.invoice', 'invoice')
      .select('SUM(item.quantity)', 'productsSold')
      .where('invoice.saleType = :saleType', { saleType: SaleType.SALE })
      .andWhere('invoice.status IN (:...statuses)', { statuses })
      .getRawOne();

    const topProductRes = await Source.getRepository(InvoiceItem)
      .createQueryBuilder('item')
      .leftJoin('item.invoice', 'invoice')
      .select('item.description', 'name')
      .addSelect('SUM(item.quantity)', 'qty')
      .where('invoice.saleType = :saleType', { saleType: SaleType.SALE })
      .andWhere('invoice.status IN (:...statuses)', { statuses })
      .andWhere("item.itemType != 'PRICING_RULE'")
      .groupBy('item.description')
      .orderBy('qty', 'DESC')
      .limit(1)
      .getRawOne();

    const monthlySalesRes = await this.repo
      .createQueryBuilder('invoice')
      .select("TO_CHAR(invoice.createdAt, 'Mon')", 'month')
      .addSelect('SUM(invoice.totalAmount)', 'sales')
      .addSelect('EXTRACT(MONTH FROM invoice.createdAt)', 'month_num')
      .where('invoice.saleType = :saleType', { saleType: SaleType.SALE })
      .andWhere('invoice.status IN (:...statuses)', { statuses })
      .groupBy("TO_CHAR(invoice.createdAt, 'Mon')")
      .addGroupBy('EXTRACT(MONTH FROM invoice.createdAt)')
      .orderBy('month_num', 'ASC')
      .getRawMany();

    const mostSoldProductsRes = await Source.getRepository(InvoiceItem)
      .createQueryBuilder('item')
      .leftJoin('item.invoice', 'invoice')
      .select('item.description', 'product')
      .addSelect('SUM(item.quantity)', 'qty')
      .where('invoice.saleType = :saleType', { saleType: SaleType.SALE })
      .andWhere('invoice.status IN (:...statuses)', { statuses })
      .andWhere("item.itemType != 'PRICING_RULE'")
      .groupBy('item.description')
      .orderBy('qty', 'DESC')
      .limit(5)
      .getRawMany();

    return {
      totalRevenue: parseFloat(totals?.totalRevenue || totals?.totalrevenue) || 0,
      totalOrders: parseInt(totals?.totalOrders || totals?.totalorders, 10) || 0,
      productsSold: parseInt(itemsStats?.productsSold || itemsStats?.productssold, 10) || 0,
      topProduct: topProductRes?.name || topProductRes?.name || 'N/A',
      monthlySales: (monthlySalesRes || []).map((r) => ({
        month: r.month,
        sales: parseFloat(r.sales) || 0,
      })),
      soldProductsByQty: (mostSoldProductsRes || []).map((r) => ({
        product: r.product,
        qty: parseInt(r.qty, 10) || 0,
      })),
    };
  }

  /**
   * Finds final invoices for a branch to show history.
   */
  async findFinalInvoicesByBranch(branchId: string, saleType?: string): Promise<Invoice[]> {
    const qb = this.repo
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.items', 'items')
      .where('invoice.branchId = :branchId', { branchId })
      .andWhere('(invoice.type = :proforma OR invoice.type = :final)', {
        proforma: InvoiceType.PROFORMA,
        final: InvoiceType.FINAL,
      })
      .andWhere('invoice.status IN (:...statuses)', {
        statuses: [
          InvoiceStatus.FINANCE_APPROVED,
          InvoiceStatus.ACTIVE_LEASE,
          InvoiceStatus.ISSUED,
          InvoiceStatus.PAID,
        ],
      })
      .orderBy('invoice.createdAt', 'DESC');

    if (saleType) {
      qb.andWhere('invoice.saleType = :saleType', { saleType });
    }

    return qb.getMany();
  }
}
