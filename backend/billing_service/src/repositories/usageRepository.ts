import { Repository } from 'typeorm';
import { UsageRecord } from '../entities/usageRecordEntity';
import { Source } from '../config/dataSource';

export class UsageRepository {
  private repo: Repository<UsageRecord>;

  constructor() {
    this.repo = Source.getRepository(UsageRecord);
  }

  /**
   * Saves a usage record.
   */
  save(usage: UsageRecord) {
    return this.repo.save(usage);
  }

  /**
   * Creates a usage record entity from partial data.
   */
  create(data: Partial<UsageRecord>) {
    return this.repo.create(data);
  }

  /**
   * Finds a usage record by ID.
   */
  findById(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  /**
   * Finds a usage record for a specific contract and billing period.
   */
  async findByContractAndPeriod(
    contractId: string,
    billingPeriodStart: Date,
    billingPeriodEnd: Date,
  ) {
    // Updated: Perform query using Contract ID and filtering in JS to avoid Timestamp/Date mismatch in SQL
    // OR Use string comparison if stored as 'date' type.
    // The entity uses @Column({ type: 'date' }), so TypeORM saves YYYY-MM-DD.
    // The Input Date objects might be UTC vs Local.
    // Let's use Raw or simply find matches for contract and check string equality.

    const records = await this.repo.find({
      where: { contractId },
    });

    // Find matching record using manual date part extraction to be timezone-safe
    const toDateStr = (d: Date | string) => {
      const date = typeof d === 'string' ? new Date(d) : d;
      // If it's a date-only string or we want to treat it as UTC (TypeORM 'date' columns often do)
      // we should be careful. toISOString is safe if the dates are at midnight UTC.
      // But let's use a more robust way:
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, '0');
      const d_ = String(date.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d_}`;
    };

    const startStr = toDateStr(billingPeriodStart);
    const endStr = toDateStr(billingPeriodEnd);

    const found = records.find((r) => {
      if (!r.billingPeriodStart || !r.billingPeriodEnd) return false;

      const rStart = toDateStr(r.billingPeriodStart);
      const rEnd = toDateStr(r.billingPeriodEnd);

      const isExact = rStart === startStr && rEnd === endStr;
      const isSubset = rStart >= startStr && rEnd <= endStr;

      return isExact || isSubset;
    });

    console.log('[DEBUG] Match Result:', found ? found.id : 'null');
    return found || null;
  }

  /**
   * Retrieves usage history for a contract, ordered by billing period.
   */
  getUsageHistory(contractId: string, order: 'ASC' | 'DESC' = 'DESC') {
    return this.repo.find({
      where: { contractId },
      order: {
        billingPeriodStart: order,
      },
    });
  }
}
