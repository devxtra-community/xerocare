import { Repository } from 'typeorm';
import { UsageRecord } from '../entities/usageRecordEntity';
import { Source } from '../config/dataSource';

export class UsageRepository {
  private repo: Repository<UsageRecord>;

  constructor() {
    this.repo = Source.getRepository(UsageRecord);
  }

  save(usage: UsageRecord) {
    return this.repo.save(usage);
  }

  create(data: Partial<UsageRecord>) {
    return this.repo.create(data);
  }

  findById(id: string) {
    return this.repo.findOne({ where: { id } });
  }

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

    // Debug Logging
    console.log('[DEBUG] findByContractAndPeriod Input:', {
      contractId,
      start: billingPeriodStart.toISOString(),
      end: billingPeriodEnd.toISOString(),
    });

    // Find matching record tolerating small time diffs or just checking ISO date string
    const startStr = billingPeriodStart.toISOString().split('T')[0];
    const endStr = billingPeriodEnd.toISOString().split('T')[0];

    const found = records.find((r) => {
      // Handle potential null/undefined db values safe-guard
      if (!r.billingPeriodStart || !r.billingPeriodEnd) return false;

      const rStart = new Date(r.billingPeriodStart).toISOString().split('T')[0];
      const rEnd = new Date(r.billingPeriodEnd).toISOString().split('T')[0];

      console.log(
        `[DEBUG] Comparing Record ${r.id}: DB(${rStart}, ${rEnd}) vs Target(${startStr}, ${endStr})`,
      );

      // Strict Match OR Subset Match (Usage is within the billing period)
      // e.g. Usage (Feb 3 - Feb 8) is valid for Invoice (Feb 1 - Feb 28)
      const isExact = rStart === startStr && rEnd === endStr;
      const isSubset = rStart >= startStr && rEnd <= endStr;

      return isExact || isSubset;
    });

    console.log('[DEBUG] Match Result:', found ? found.id : 'null');
    return found || null;
  }

  getUsageHistory(contractId: string) {
    return this.repo.find({
      where: { contractId },
      order: {
        billingPeriodStart: 'DESC',
      },
    });
  }
}
