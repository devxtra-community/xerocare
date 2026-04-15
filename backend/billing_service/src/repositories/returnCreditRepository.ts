import { Repository } from 'typeorm';
import { ReturnCredit } from '../entities/returnCreditEntity';
import { Source } from '../config/dataSource';

export class ReturnCreditRepository {
  private repo: Repository<ReturnCredit>;

  constructor() {
    this.repo = Source.getRepository(ReturnCredit);
  }

  async createReturnCredit(data: Partial<ReturnCredit>) {
    const rc = this.repo.create(data);
    return this.repo.save(rc);
  }

  async getReturnTotalsByBranch(branchId?: string, year?: number) {
    const query = this.repo
      .createQueryBuilder('rc')
      .select('SUM(rc.amount)', 'totalReturns')
      .addSelect('COUNT(rc.id)', 'returnsCount');

    if (branchId) {
      query.andWhere('rc.branchId = :branchId', { branchId });
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

  async getGlobalReturnTotals(year?: number) {
    return this.getReturnTotalsByBranch(undefined, year);
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
