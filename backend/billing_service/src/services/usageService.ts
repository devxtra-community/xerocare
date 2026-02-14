import { UsageRepository } from '../repositories/usageRepository';
import { InvoiceRepository } from '../repositories/invoiceRepository';
import { AppError } from '../errors/appError';
import { ReportedBy } from '../entities/usageRecordEntity';
import { InvoiceType } from '../entities/enums/invoiceType';
import { ContractStatus } from '../entities/enums/contractStatus';
import { InvoiceStatus } from '../entities/enums/invoiceStatus';

export class UsageService {
  private usageRepo = new UsageRepository();
  private invoiceRepo = new InvoiceRepository();

  async recordUsage(payload: {
    contractId: string;
    billingPeriodStart: string;
    billingPeriodEnd: string;
    bwA4Count: number;
    bwA3Count: number;
    colorA4Count: number;
    colorA3Count: number;

    meterImageUrl?: string;
    reportedBy?: 'CUSTOMER' | 'EMPLOYEE';
    remarks?: string;
  }) {
    // 1. Fetch Contract
    const contract = await this.invoiceRepo.findById(payload.contractId);
    if (!contract) {
      throw new AppError('Contract (Proforma Invoice) not found', 404);
    }

    if (contract.type !== InvoiceType.PROFORMA) {
      throw new AppError(
        `Usage can only be recorded for PROFORMA contracts. Current status: ${contract.type}`,
        400,
      );
    }

    // --- ENFORCEMENT (STRICT BLOCK) ---
    if (contract.contractStatus === 'COMPLETED') {
      throw new AppError('Contract already completed. No further recording allowed.', 400);
    }

    // Strict Period Overflow Check
    const newEnd = new Date(payload.billingPeriodEnd);
    if (contract.effectiveTo && newEnd.getTime() > new Date(contract.effectiveTo).getTime()) {
      throw new AppError('Billing period exceeds contract period', 400);
    }

    // const history = await this.usageRepo.getUsageHistory(payload.contractId, 'DESC');
    // const usageCount = history.length;

    // if (tenure > 0 && usageCount >= tenure) {
    //   throw new AppError('Contract period completed. No further billing allowed.', 400);
    // }

    // Fetch History for previous readings
    const history = await this.usageRepo.getUsageHistory(payload.contractId, 'DESC');

    // 2. Fetch Pricing Rules

    // FIX: Allow 'PRODUCT' items to serve as pricing rules if they contain limits
    // Providing fallback to PRICING_RULE then PRODUCT
    const pricingRules =
      contract.items?.filter((i) => i.itemType === 'PRICING_RULE' || i.itemType === 'PRODUCT') ||
      [];

    // Sort to prefer PRICING_RULE if both exist? Or just take first.
    // Usually only one exists.

    if (pricingRules.length === 0) {
      console.warn(
        'WARNING: No pricing rules (or products with limits) found for contract',
        contract.id,
      );
    }
    const rule = pricingRules[0]; // Assuming single rule for now

    // 3. Previous Readings for Delta Calculation (Already fetched history above)
    const previousRecord = history.length > 0 ? history[0] : null;

    let prevBwA4 = 0;
    let prevBwA3 = 0;
    let prevColorA4 = 0;
    let prevColorA3 = 0;

    if (previousRecord) {
      prevBwA4 = previousRecord.bwA4Count;
      prevBwA3 = previousRecord.bwA3Count;
      prevColorA4 = previousRecord.colorA4Count;
      prevColorA3 = previousRecord.colorA3Count;
    } else {
      // First Month Logic: Use initial counts from contract items
      prevBwA4 = rule?.initialBwCount || 0;
      prevBwA3 = 0; // Assuming initial counts are A4 equivalent or A4 only
      prevColorA4 = rule?.initialColorCount || 0;
      prevColorA3 = 0;
    }

    // 4. Calculate Deltas (Monthly Consumption)
    const bwA4Delta = payload.bwA4Count - prevBwA4;
    const bwA3Delta = payload.bwA3Count - prevBwA3;
    const colorA4Delta = payload.colorA4Count - prevColorA4;
    const colorA3Delta = payload.colorA3Count - prevColorA3;

    // 5. Backend Validations
    // Rollback Prevention
    if (bwA4Delta < 0 || bwA3Delta < 0 || colorA4Delta < 0 || colorA3Delta < 0) {
      throw new AppError(
        'Meter reading cannot be less than previous reading (Rollback prevented)',
        400,
      );
    }

    // Zero-Usage Detection (Professional)
    if (bwA4Delta === 0 && bwA3Delta === 0 && colorA4Delta === 0 && colorA3Delta === 0) {
      throw new AppError(
        'No usage detected for this period. Please provide a newer meter reading.',
        400,
      );
    }

    // 6. Normalize Monthly Usage (DELTA BASED)
    const monthlyBw = bwA4Delta + bwA3Delta * 2;
    const monthlyColor = colorA4Delta + colorA3Delta * 2;
    const monthlyNormalized = monthlyBw + monthlyColor;

    // 7. Calculate Exceeded & Charges (BACKEND SOURCE OF TRUTH)
    let exceededTotal = 0;
    let exceededCharge = 0;

    if (rule) {
      if (contract.rentType === 'FIXED_LIMIT') {
        const bwExceeded = Math.max(0, monthlyBw - (rule.bwIncludedLimit || 0));
        const colorExceeded = Math.max(0, monthlyColor - (rule.colorIncludedLimit || 0));

        exceededTotal = bwExceeded + colorExceeded;
        const bwCharge = bwExceeded * Number(rule.bwExcessRate || 0);
        const colorCharge = colorExceeded * Number(rule.colorExcessRate || 0);
        exceededCharge = bwCharge + colorCharge;
      } else if (contract.rentType === 'FIXED_COMBO') {
        const combinedLimit =
          rule.combinedIncludedLimit ||
          (rule.bwIncludedLimit || 0) + (rule.colorIncludedLimit || 0);
        const totalMonthly = monthlyBw + monthlyColor;
        exceededTotal = Math.max(0, totalMonthly - combinedLimit);
        exceededCharge = exceededTotal * Number(rule.combinedExcessRate || rule.bwExcessRate || 0);
      } else if (contract.rentType === 'CPC' || contract.rentType === 'CPC_COMBO') {
        exceededTotal = monthlyNormalized;
        const bwCharge = this.calculateSlabCharge(monthlyBw, rule.bwSlabRanges);
        const colorCharge = this.calculateSlabCharge(monthlyColor, rule.colorSlabRanges);
        const comboCharge = this.calculateSlabCharge(monthlyNormalized, rule.comboSlabRanges);

        // If it's a combo rule, use comboCharge, otherwise sum BW and Color
        exceededCharge =
          rule.comboSlabRanges && rule.comboSlabRanges.length > 0
            ? comboCharge
            : bwCharge + colorCharge;
      }
    }

    // 8. Determine Rent & Final Month Logic
    // STRICT CHANGE: Store actual charged rent here based on strict logic

    // Detect Last Month Properly (Strict Date Equality)
    let isLastMonth = false;
    if (contract.effectiveTo) {
      // Compare dates strictly (ignoring time components)
      const payloadEnd = new Date(payload.billingPeriodEnd).setHours(0, 0, 0, 0);
      const contractEnd = new Date(contract.effectiveTo).setHours(0, 0, 0, 0);
      isLastMonth = payloadEnd === contractEnd;
    }

    const monthlyRent = Number(
      contract.monthlyRent || contract.monthlyLeaseAmount || contract.monthlyEmiAmount || 0,
    );

    // --- LOGIC BRANCHING ---

    if (isLastMonth) {
      // === FINAL MONTH LOGIC (TRANSACTION WRAPPED) ===

      const queryRunner = (await import('../config/dataSource')).Source.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        // Rent Logic: Keep monthlyRent as is for UsageRecord/Gross Amount.
        // Deduct it from Advance only for "Payable" calculation on the Invoice.
        const advanceAdjusted = monthlyRent;

        // Deduct from remaining Advance Amount on Contract
        const currentAdvance = Number(contract.advanceAmount || 0);
        contract.advanceAmount = currentAdvance - monthlyRent; // Remaining security deposit

        // Mark Contract as Completed
        contract.contractStatus = ContractStatus.COMPLETED;
        contract.completedAt = new Date();

        // Create Final Invoice Snapshot (Update Proforma)
        contract.isFinalMonth = true;
        contract.advanceAdjusted = advanceAdjusted;

        // Payable = (Rent + Exceeded) - Deducted Advance
        // Since Deducted Advance == Rent, Payable = Exceeded
        contract.totalAmount = monthlyRent + exceededCharge - advanceAdjusted;

        contract.grossAmount = monthlyRent + exceededCharge; // Show full amount as Gross

        await queryRunner.manager.save(contract); // Save contract status update

        const usage = this.usageRepo.create({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          contract: { id: payload.contractId } as any,
          billingPeriodStart: new Date(payload.billingPeriodStart),
          billingPeriodEnd: new Date(payload.billingPeriodEnd),
          bwA4Count: payload.bwA4Count,
          bwA3Count: payload.bwA3Count,
          colorA4Count: payload.colorA4Count,
          colorA3Count: payload.colorA3Count,
          bwA4Delta,
          bwA3Delta,
          colorA4Delta,
          colorA3Delta,
          meterImageUrl: payload.meterImageUrl,
          reportedBy: (payload.reportedBy as ReportedBy) || ReportedBy.CUSTOMER,
          remarks: payload.remarks,
          exceededCharge,
          monthlyRent, // Store ACTUAL rent
          advanceAdjusted, // Store Advance Used
          totalCharge: monthlyRent + exceededCharge - advanceAdjusted, // Store ACTUAL PAYABLE charge
          exceededTotal,
        });
        await queryRunner.manager.save(usage);

        await queryRunner.commitTransaction();

        return usage;
      } catch (error) {
        await queryRunner.rollbackTransaction();
        console.error('Record Usage Transaction failed:', error);
        throw error;
      } finally {
        await queryRunner.release();
      }
    } else {
      // === STANDARD MONTH LOGIC ===
      const totalCharge = exceededCharge + monthlyRent;
      const usage = this.usageRepo.create({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        contract: { id: payload.contractId } as any,
        billingPeriodStart: new Date(payload.billingPeriodStart),
        billingPeriodEnd: new Date(payload.billingPeriodEnd),
        bwA4Count: payload.bwA4Count,
        bwA3Count: payload.bwA3Count,
        colorA4Count: payload.colorA4Count,
        colorA3Count: payload.colorA3Count,
        bwA4Delta,
        bwA3Delta,
        colorA4Delta,
        colorA3Delta,
        meterImageUrl: payload.meterImageUrl,
        reportedBy: (payload.reportedBy as ReportedBy) || ReportedBy.CUSTOMER,
        remarks: payload.remarks,
        exceededCharge,
        monthlyRent,
        totalCharge,
        exceededTotal,
      });
      await this.usageRepo.save(usage);

      // Return next period for UI convenience
      const nextPeriod = this.calculateNextPeriod(contract, new Date(payload.billingPeriodEnd));
      return { usage, nextPeriod };
    }
  }

  // Helper: Slab Calculation (Progressive)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private calculateSlabCharge(count: number, slabs: any[] | undefined): number {
    if (!slabs || !Array.isArray(slabs) || slabs.length === 0) return 0;

    // Sort slabs by 'from'
    const sortedSlabs = [...slabs].sort((a, b) => a.from - b.from);
    let remaining = count;
    let totalCharge = 0;

    for (const slab of sortedSlabs) {
      if (remaining <= 0) break;

      const slabSize = slab.to - slab.from + 1; // e.g. 0-999 is 1000 units
      // Adjust if 'to' is infinite or very large? Usually 'to' matches next 'from'.
      // If we assume standard ranges:
      const applicable = Math.min(remaining, slabSize);
      totalCharge += applicable * Number(slab.rate);
      remaining -= applicable;
    }

    return totalCharge;
  }

  // Helper: Next Period
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private calculateNextPeriod(contract: any, currentEnd: Date) {
    const nextStart = new Date(currentEnd);
    nextStart.setDate(nextStart.getDate() + 1);

    const nextEnd = new Date(nextStart);
    const billingCycleDays = contract.billingCycleInDays || 30;
    // -1 day to match cycle? e.g. 1st to 30th (30 days).
    nextEnd.setDate(nextEnd.getDate() + billingCycleDays - 1);

    return {
      billingPeriodStart: nextStart.toISOString().split('T')[0],
      billingPeriodEnd: nextEnd.toISOString().split('T')[0],
    };
  }

  async getUsageHistory(contractId: string) {
    const history = await this.usageRepo.getUsageHistory(contractId, 'ASC');
    if (history.length === 0) return [];

    // 1️⃣ Fetch Contract WITH Pricing Rules
    const contract = await this.invoiceRepo.findById(contractId);
    if (!contract) {
      throw new AppError('Contract not found', 404);
    }

    // 2️⃣ Extract Pricing Rule (InvoiceItem) - More robust detection
    const pricingRule = contract.items?.find(
      (i) =>
        i.itemType === 'PRICING_RULE' ||
        (i.combinedIncludedLimit !== undefined && i.combinedIncludedLimit > 0) ||
        (i.bwIncludedLimit !== undefined && i.bwIncludedLimit > 0) ||
        (i.combinedExcessRate !== undefined && i.combinedExcessRate > 0) ||
        (i.bwExcessRate !== undefined && i.bwExcessRate > 0),
    );

    if (!pricingRule) {
      throw new AppError('Pricing rule not found for contract', 400);
    }

    // Prepare R2 Base URL
    const R2_BASE_URL =
      process.env.R2_PUBLIC_URL || 'https://pub-8bbb88e1d79042349d0bc47ad1f3eb23.r2.dev';

    // Track previous readings for on-the-fly delta calculation (backwards compatibility)
    let lastBwA4 = pricingRule.initialBwCount || 0;
    let lastBwA3 = 0;
    let lastColorA4 = pricingRule.initialColorCount || 0;
    let lastColorA3 = 0;

    const result = history.map((record) => {
      // 3️⃣ Determine Free Limit (DELTA BASED)
      let freeLimit: number = 0;
      const isCPC = contract.rentType === 'CPC' || contract.rentType === 'CPC_COMBO';

      if (!isCPC) {
        freeLimit = Number(
          pricingRule.combinedIncludedLimit ||
            (pricingRule.bwIncludedLimit || 0) + (pricingRule.colorIncludedLimit || 0),
        );
      }

      // 4️⃣ Normalize Monthly Usage (DELTA BASED - Fallback for legacy records)
      const bwA4D = record.bwA4Delta || Math.max(0, record.bwA4Count - lastBwA4);
      const bwA3D = record.bwA3Delta || Math.max(0, record.bwA3Count - lastBwA3);
      const colorA4D = record.colorA4Delta || Math.max(0, record.colorA4Count - lastColorA4);
      const colorA3D = record.colorA3Delta || Math.max(0, record.colorA3Count - lastColorA3);

      const monthlyNormalized = bwA4D + bwA3D * 2 + (colorA4D + colorA3D * 2);
      const totalUsage = monthlyNormalized;

      // Update pointers for next record in ASC sequence
      lastBwA4 = record.bwA4Count;
      lastBwA3 = record.bwA3Count;
      lastColorA4 = record.colorA4Count;
      lastColorA3 = record.colorA3Count;

      // 5️⃣ Calculate Exceeded Count (DELTA BASED)
      const exceededCount = isCPC ? totalUsage : Math.max(0, totalUsage - freeLimit);

      // 6️⃣ Determine Rate & Exceeded Charge (RE-CALCULATED ROBUSTLY)
      let rate = 0;
      let exceededCharge = 0;

      if (contract.rentType === 'FIXED_LIMIT') {
        rate = Number(pricingRule.combinedExcessRate || pricingRule.bwExcessRate || 0);
        exceededCharge = exceededCount * rate;
      } else if (contract.rentType === 'FIXED_COMBO') {
        rate = Number(pricingRule.combinedExcessRate || pricingRule.bwExcessRate || 0);
        exceededCharge = exceededCount * rate;
      } else if (contract.rentType === 'CPC' || contract.rentType === 'CPC_COMBO') {
        const bwCharge = this.calculateSlabCharge(bwA4D + bwA3D * 2, pricingRule.bwSlabRanges);
        const colorCharge = this.calculateSlabCharge(
          colorA4D + colorA3D * 2,
          pricingRule.colorSlabRanges,
        );
        const comboCharge = this.calculateSlabCharge(
          monthlyNormalized,
          pricingRule.comboSlabRanges,
        );

        exceededCharge =
          pricingRule.comboSlabRanges && pricingRule.comboSlabRanges.length > 0
            ? comboCharge
            : bwCharge + colorCharge;

        // For rate display in UI
        if (totalUsage > 0) {
          rate = exceededCharge / totalUsage;
        }
      }

      // 7️⃣ Monthly Rent & Total Calculation (Recalculated Robustly)
      // Determine if this is the final month based on contract end date
      let isFinalMonth = false;
      if (contract.effectiveTo) {
        const recEnd = new Date(record.billingPeriodEnd).setHours(0, 0, 0, 0);
        const conEnd = new Date(contract.effectiveTo).setHours(0, 0, 0, 0);
        isFinalMonth = recEnd === conEnd;
      }

      const monthlyRent = Number(
        record.monthlyRent ||
          contract.monthlyRent ||
          contract.monthlyLeaseAmount ||
          contract.monthlyEmiAmount ||
          0,
      );
      let advanceAdjusted = Number(record.advanceAdjusted || 0);

      if (isFinalMonth) {
        // Last Month: Rent is covered by Advance
        advanceAdjusted = monthlyRent;
      }

      // STRICT CHANGE: finalTotal should represent PAYABLE amount (Rent + Excess - Advance)
      const finalTotal = monthlyRent + exceededCharge - advanceAdjusted;

      // 8️⃣ Normalize Meter Image URL
      let meterImageUrl = record.meterImageUrl;
      if (meterImageUrl && !meterImageUrl.startsWith('http')) {
        if (meterImageUrl.includes('cloudflarestorage.com')) {
          const parts = meterImageUrl.split('/');
          const filename = parts[parts.length - 1];
          meterImageUrl = `${R2_BASE_URL}/${filename}`;
        } else {
          meterImageUrl = `${R2_BASE_URL}/${meterImageUrl}`;
        }
      }

      return {
        id: record.id,
        periodStart: new Date(record.billingPeriodStart).toISOString().split('T')[0],
        periodEnd: new Date(record.billingPeriodEnd).toISOString().split('T')[0],
        freeLimit: isCPC ? 'Standard CPC' : freeLimit,
        totalUsage,
        exceededCount,
        rate,
        exceededAmount: exceededCharge,
        rent: monthlyRent,
        advanceAdjusted,
        finalTotal: finalTotal,
        meterImageUrl,
        emailSentAt: record.emailSentAt ? new Date(record.emailSentAt).toISOString() : undefined,
        whatsappSentAt: record.whatsappSentAt
          ? new Date(record.whatsappSentAt).toISOString()
          : undefined,
        bwA4Count: record.bwA4Count,
        bwA3Count: record.bwA3Count,
        colorA4Count: record.colorA4Count,
        colorA3Count: record.colorA3Count,
        bwA4Delta: bwA4D,
        bwA3Delta: bwA3D,
        colorA4Delta: colorA4D,
        colorA3Delta: colorA3D,
        remarks: record.remarks,
      };
    });

    return result.reverse(); // Return DESC order for UI
  }

  async sendMonthlyInvoice(usageId: string) {
    const usage = await this.usageRepo.findById(usageId);
    if (!usage) {
      throw new AppError('Usage record not found', 404);
    }

    // Logic: In a real app, we would generate a PDF here and call email/whatsapp services.
    // As per the plan, we simulate this and update sent timestamps.

    console.log(`[SIMULATION] Sending Monthly Invoice for usage ${usageId}`);
    console.log(`- Customer Contract: ${usage.contractId}`);
    console.log(`- Amount: ₹${usage.totalCharge}`);

    usage.emailSentAt = new Date();
    usage.whatsappSentAt = new Date();

    await this.usageRepo.save(usage);

    return {
      success: true,
      emailSentAt: usage.emailSentAt,
      whatsappSentAt: usage.whatsappSentAt,
    };
  }

  // Helper: Generate Final Summary Invoice
  private async generateFinalSummary(contractId: string) {
    // Fetch all usages for this contract
    const history = await this.usageRepo.getUsageHistory(contractId, 'ASC'); // Get all
    if (history.length === 0) return;

    // Calculate totals from usage records
    // Note: usages have 'monthlyRent' and 'exceededCharge' stored.
    // For the last month, we just set monthlyRent = 0.
    // For previous months, monthlyRent should be there.

    const totalExcess = history.reduce((sum, u) => sum + Number(u.exceededCharge || 0), 0);
    const totalRent = history.reduce((sum, u) => sum + Number(u.monthlyRent || 0), 0);

    // Create Summary Invoice
    const contract = await this.invoiceRepo.findById(contractId);
    if (!contract) return;

    const summaryInvoice = await this.invoiceRepo.createInvoice({
      invoiceNumber: await this.invoiceRepo.generateInvoiceNumber(),
      type: InvoiceType.FINAL,
      isSummaryInvoice: true,
      referenceContractId: contractId,
      grossAmount: totalRent + totalExcess,
      totalAmount: totalRent + totalExcess,
      status: InvoiceStatus.ISSUED, // Default to ISSUED for final summary
      customerId: contract.customerId,
      branchId: contract.branchId,
      createdBy: contract.createdBy,
      saleType: contract.saleType,
      rentType: contract.rentType,
      leaseType: contract.leaseType,
      billingPeriodStart: new Date(contract.effectiveFrom),
      billingPeriodEnd: new Date(contract.effectiveTo || new Date()),
      contractStatus: ContractStatus.COMPLETED,
    });

    // Link usages to this final invoice?
    // Usually via finalInvoiceId column in usage_record, but we might want to keep individual monthly invoices separate?
    // "Consolidated Final Invoice" implies one big invoice.
    // User request: "Generate final consolidated invoice including all months."
    // Let's assume this is the 'Master' invoice.

    return summaryInvoice;
  }

  // Transaction-aware version of generateFinalSummary
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async generateFinalSummaryInTransaction(contractId: string, manager: any) {
    const history = await this.usageRepo.getUsageHistory(contractId, 'ASC');
    if (history.length === 0) return;

    const totalExcess = history.reduce((sum, u) => sum + Number(u.exceededCharge || 0), 0);
    const totalRent = history.reduce((sum, u) => sum + Number(u.monthlyRent || 0), 0);

    const contract = await this.invoiceRepo.findById(contractId);
    if (!contract) return;

    const invoiceNumber = await this.invoiceRepo.generateInvoiceNumber();

    const summaryInvoice = manager.create('Invoice', {
      invoiceNumber,
      type: InvoiceType.FINAL,
      isSummaryInvoice: true,
      referenceContractId: contractId,
      grossAmount: totalRent + totalExcess,
      totalAmount: totalRent + totalExcess,
      status: InvoiceStatus.ISSUED,
      customerId: contract.customerId,
      branchId: contract.branchId,
      createdBy: contract.createdBy,
      saleType: contract.saleType,
      rentType: contract.rentType,
      leaseType: contract.leaseType,
      billingPeriodStart: new Date(contract.effectiveFrom),
      billingPeriodEnd: new Date(contract.effectiveTo || new Date()),
      contractStatus: ContractStatus.COMPLETED,
    });

    await manager.save(summaryInvoice);
    return summaryInvoice;
  }
}
