import { EntityManager, Repository } from 'typeorm';
import { ReturnCredit } from '../entities/returnCreditEntity';
import { Source } from '../config/dataSource';

export class ReturnCreditRepository {
  private repo: Repository<ReturnCredit>;

  constructor() {
    this.repo = Source.getRepository(ReturnCredit);
  }

  // Optional `manager` lets this write participate in a caller-owned transaction
  // (e.g. CreditNoteController.approve) instead of committing on its own connection.
  async createReturnCredit(data: Partial<ReturnCredit>, manager?: EntityManager) {
    const repo = manager ? manager.getRepository(ReturnCredit) : this.repo;
    const rc = repo.create(data);
    return repo.save(rc);
  }

  /** `branchId` accepts one branch or a list; omitted means every branch. */
  async getReturnTotalsByBranch(branchId?: string | string[], year?: number) {
    const query = this.repo
      .createQueryBuilder('rc')
      .select('SUM(rc.amount)', 'totalReturns')
      .addSelect('COUNT(rc.id)', 'returnsCount');

    const branchIds = (Array.isArray(branchId) ? branchId : branchId ? [branchId] : []).filter(
      Boolean,
    );
    if (branchIds.length) {
      query.andWhere('rc.branchId IN (:...branchIds)', { branchIds });
    }
    if (year) {
      query.andWhere('EXTRACT(YEAR FROM rc.createdAt) = :year', { year });
    }

    const result = await query.getRawOne();
    return {
      totalReturns: parseFloat(result.totalReturns || '0'),
      returnsCount: parseInt(result.returnsCount || '0', 10),
    };
  }

  async getGlobalReturnTotals(year?: number, branchIds?: string[]) {
    return this.getReturnTotalsByBranch(branchIds, year);
  }

  async getReturnsTrendByBranch(branchId: string, startDate: Date, endDate?: Date) {
    const query = this.repo
      .createQueryBuilder('rc')
      .select("TO_CHAR(rc.createdAt, 'YYYY-MM-DD')", 'date')
      .addSelect('SUM(rc.amount)', 'totalReturns')
      .where('rc.branchId = :branchId', { branchId })
      .andWhere('rc.createdAt >= :startDate', { startDate });

    if (endDate) {
      query.andWhere('rc.createdAt <= :endDate', { endDate });
    }

    query.groupBy("TO_CHAR(rc.createdAt, 'YYYY-MM-DD')").orderBy('date', 'ASC');

    const result = await query.getRawMany();
    return result.map((r) => ({
      date: r.date,
      totalReturns: parseFloat(r.totalReturns || '0'),
    }));
  }

  async getGlobalReturnsTrend(startDate: Date, endDate?: Date) {
    const query = this.repo
      .createQueryBuilder('rc')
      .select("TO_CHAR(rc.createdAt, 'YYYY-MM-DD')", 'date')
      .addSelect('SUM(rc.amount)', 'totalReturns')
      .where('rc.createdAt >= :startDate', { startDate });

    if (endDate) {
      query.andWhere('rc.createdAt <= :endDate', { endDate });
    }

    query.groupBy("TO_CHAR(rc.createdAt, 'YYYY-MM-DD')").orderBy('date', 'ASC');

    const result = await query.getRawMany();
    return result.map((r) => ({
      date: r.date,
      totalReturns: parseFloat(r.totalReturns || '0'),
    }));
  }

  async getMonthlyReturns(filter: { branchId?: string; month?: number; year?: number } = {}) {
    const query = this.repo
      .createQueryBuilder('rc')
      .select("TO_CHAR(rc.createdAt, 'YYYY-MM')", 'month')
      .addSelect('SUM(rc.amount)', 'totalAmount')
      .groupBy("TO_CHAR(rc.createdAt, 'YYYY-MM')");

    if (filter.branchId && filter.branchId !== 'All') {
      query.andWhere('rc.branchId = :branchId', { branchId: filter.branchId });
    }
    if (filter.month) {
      query.andWhere('EXTRACT(MONTH FROM rc.createdAt) = :month', { month: filter.month });
    }
    if (filter.year) {
      query.andWhere('EXTRACT(YEAR FROM rc.createdAt) = :year', { year: filter.year });
    }

    const results = await query.getRawMany();
    return results.map((r) => ({
      month: r.month,
      totalAmount: parseFloat(r.totalAmount || '0'),
    }));
  }
}
