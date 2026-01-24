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

  findByContractAndPeriod(contractId: string, billingPeriodStart: Date, billingPeriodEnd: Date) {
    return this.repo.findOne({
      where: {
        contractId,
        billingPeriodStart,
        billingPeriodEnd,
      },
    });
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
