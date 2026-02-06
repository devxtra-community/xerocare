import { UsageRepository } from '../repositories/usageRepository';
import { InvoiceRepository } from '../repositories/invoiceRepository';
import { AppError } from '../errors/appError';
import { InvoiceType } from '../entities/enums/invoiceType';
import { ReportedBy } from '../entities/usageRecordEntity';

export class UsageService {
  private usageRepo = new UsageRepository();
  private invoiceRepo = new InvoiceRepository();

  async createUsageRecord(payload: {
    contractId: string;
    billingPeriodStart: string;
    billingPeriodEnd: string;
    bwA4Count: number;
    bwA3Count: number;
    colorA4Count: number;
    colorA3Count: number;
    reportedBy: ReportedBy;
    recordedByEmployeeId?: string;
    remarks?: string;
    meterImageUrl?: string;
  }) {
    // 1. Fetch Contract
    const contract = await this.invoiceRepo.findById(payload.contractId);
    if (!contract) {
      throw new AppError('Contract (Proforma Invoice) not found', 404);
    }

    // 2. Validate Type = PROFORMA
    if (contract.type !== InvoiceType.PROFORMA) {
      throw new AppError(
        `Usage can only be recorded for PROFORMA contracts. Current status: ${contract.type}`,
        400,
      );
    }

    const start = new Date(payload.billingPeriodStart);
    const end = new Date(payload.billingPeriodEnd);

    // 3. Check for Duplicates / Upsert
    let usage = await this.usageRepo.findByContractAndPeriod(payload.contractId, start, end);

    if (usage) {
      // If usage exists, we update it instead of throwing error (Upsert)
      // This supports the flow where "Next Month Invoice" initialization created an empty record.
      if (usage.finalInvoiceId) {
        throw new AppError('Usage record is already locked/settled', 409);
      }
      usage.bwA4Count = payload.bwA4Count;
      usage.bwA3Count = payload.bwA3Count;
      usage.colorA4Count = payload.colorA4Count;
      usage.colorA3Count = payload.colorA3Count;
      usage.reportedBy = payload.reportedBy;
      usage.recordedByEmployeeId = payload.recordedByEmployeeId;
      usage.remarks = payload.remarks;
      usage.meterImageUrl = payload.meterImageUrl;
    } else {
      // 4. Create New Record
      usage = this.usageRepo.create({
        contractId: payload.contractId,
        billingPeriodStart: start,
        billingPeriodEnd: end,
        bwA4Count: payload.bwA4Count,
        bwA3Count: payload.bwA3Count,
        colorA4Count: payload.colorA4Count,
        colorA3Count: payload.colorA3Count,
        reportedBy: payload.reportedBy,
        recordedByEmployeeId: payload.recordedByEmployeeId,
        remarks: payload.remarks,
        meterImageUrl: payload.meterImageUrl,
      });
    }

    return this.usageRepo.save(usage);
  }

  async updateUsageRecord(
    id: string,
    payload: {
      bwA4Count?: number;
      bwA3Count?: number;
      colorA4Count?: number;
      colorA3Count?: number;
      remarks?: string;
    },
  ) {
    const usage = await this.usageRepo.findById(id);
    if (!usage) {
      throw new AppError('Usage record not found', 404);
    }

    // Check if settled (Phase 3 placeholder)
    // if (usage.settled) throw new AppError('Cannot edit settled usage', 400);

    if (payload.bwA4Count !== undefined) usage.bwA4Count = payload.bwA4Count;
    if (payload.bwA3Count !== undefined) usage.bwA3Count = payload.bwA3Count;
    if (payload.colorA4Count !== undefined) usage.colorA4Count = payload.colorA4Count;
    if (payload.colorA3Count !== undefined) usage.colorA3Count = payload.colorA3Count;
    if (payload.remarks !== undefined) usage.remarks = payload.remarks;

    return this.usageRepo.save(usage);
  }

  async getUsageHistory(contractId: string) {
    return this.usageRepo.getUsageHistory(contractId);
  }
}
