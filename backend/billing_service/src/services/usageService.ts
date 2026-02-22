import { UsageRepository } from '../repositories/usageRepository';
import { InvoiceRepository } from '../repositories/invoiceRepository';
import { AppError } from '../errors/appError';
import { ReportedBy } from '../entities/usageRecordEntity';
import { InvoiceType } from '../entities/enums/invoiceType';
import { ContractStatus } from '../entities/enums/contractStatus';
import { InvoiceStatus } from '../entities/enums/invoiceStatus';
import { ItemType } from '../entities/enums/itemType';
import { InvoiceItem } from '../entities/invoiceItemEntity';
import { NotificationService } from './notificationService';
import { NotificationPublisher } from '../events/publisher/notificationPublisher';
import { logger } from '../config/logger';
import { SaleType } from '../entities/enums/saleType';
import { ProductAllocation, AllocationStatus } from '../entities/productAllocationEntity';
import { emitProductStatusUpdate } from '../events/publisher/productStatusEvent';

export class UsageService {
  private usageRepo = new UsageRepository();
  private invoiceRepo = new InvoiceRepository();
  private notificationService = new NotificationService();

  /**
   * Records usage data (meter readings) for a contract.
   */
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
    const isSimplifiedLease =
      contract.saleType === 'LEASE' && contract.leaseType && contract.leaseType !== 'FSM';

    if (!isSimplifiedLease) {
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

        // 🚀 Post-transaction: Handle Product Allocations for RENT Contracts
        if (contract.saleType === SaleType.RENT) {
          try {
            // Find all allocated physical products for this contract
            const allocations = await this.invoiceRepo.manager.find(ProductAllocation, {
              where: { contractId: contract.id, status: AllocationStatus.ALLOCATED },
            });

            if (allocations.length > 0) {
              // Mark them as RETURNED in Billing Service
              await this.invoiceRepo.manager.update(
                ProductAllocation,
                { contractId: contract.id, status: AllocationStatus.ALLOCATED },
                { status: AllocationStatus.RETURNED },
              );

              // Tell Inventory Service to mark them AVAILABLE
              for (const allocation of allocations) {
                if (allocation.productId) {
                  await emitProductStatusUpdate({
                    productId: allocation.productId,
                    billType: 'RETURNED',
                    invoiceId: contract.id,
                    approvedBy: 'SYSTEM (Final Usage Logged)',
                    approvedAt: new Date(),
                  });
                }
              }
            }
          } catch (allocationError) {
            // Log the error but don't fail the usage record submission
            logger.error('Failed to update product allocations after final usage', {
              contractId: contract.id,
              error: allocationError,
            });
          }
        }

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

  /**
   * Retrieves usage history for a contract.
   */
  async getUsageHistory(contractId: string) {
    const history = await this.usageRepo.getUsageHistory(contractId, 'ASC');
    if (history.length === 0) return [];

    // 1️⃣ Fetch Contract WITH Pricing Rules
    const contract = await this.invoiceRepo.findById(contractId);
    if (!contract) {
      throw new AppError('Contract not found', 404);
    }

    // 2️⃣ Extract Pricing Rule (InvoiceItem) - More robust detection
    const pricingRule = (contract.items?.find(
      (i) =>
        i.itemType === 'PRICING_RULE' ||
        (i.itemType === ItemType.PRODUCT &&
          ((i.combinedIncludedLimit !== undefined && i.combinedIncludedLimit > 0) ||
            (i.bwIncludedLimit !== undefined && i.bwIncludedLimit > 0) ||
            (i.combinedExcessRate !== undefined && i.combinedExcessRate > 0) ||
            (i.bwExcessRate !== undefined && i.bwExcessRate > 0))),
    ) || {
      itemType: ItemType.PRICING_RULE,
      description: 'Default Pricing',
      initialBwCount: 0,
      initialColorCount: 0,
      bwIncludedLimit: 0,
      colorIncludedLimit: 0,
      combinedIncludedLimit: 0,
      bwExcessRate: 0,
      colorExcessRate: 0,
      combinedExcessRate: 0,
    }) as Partial<InvoiceItem>;

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

      // 5️⃣ Use Stored Values (Source of Truth)
      const exceededCount = Number(record.exceededTotal || 0);
      const exceededCharge = Number(record.exceededCharge || 0);
      const monthlyRent = Number(record.monthlyRent || 0);
      const advanceAdjusted = Number(record.advanceAdjusted || 0);
      const finalTotal = Number(record.totalCharge || 0);

      // 6️⃣ Determine Rate (Derived for UI only)
      let rate = 0;
      if (exceededCount > 0) {
        rate = exceededCharge / exceededCount;
      }

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
        // Detailed Breakdown for UI "View Details"
        bwFreeLimit: Number(pricingRule.bwIncludedLimit || 0),
        colorFreeLimit: Number(pricingRule.colorIncludedLimit || 0),
        combinedFreeLimit: Number(pricingRule.combinedIncludedLimit || 0),
        bwExcessRate: Number(pricingRule.bwExcessRate || 0),
        colorExcessRate: Number(pricingRule.colorExcessRate || 0),
        combinedExcessRate: Number(pricingRule.combinedExcessRate || 0),
        rentType: contract.rentType,
      };
    });

    return result.reverse(); // Return DESC order for UI
  }

  /**
   * Triggers the monthly invoice generation based on usage.
   */
  async sendMonthlyInvoice(usageId: string) {
    const usage = await this.usageRepo.findById(usageId);
    if (!usage) {
      throw new AppError('Usage record not found', 404);
    }

    // Logic: In a real app, we would generate a PDF here and call email/whatsapp services.
    // As per the plan, we simulate this and update sent timestamps.

    // Fetch Contract for email details
    const contract = await this.invoiceRepo.findById(usage.contractId);
    if (!contract) {
      throw new AppError('Contract not found for this usage record', 404);
    }

    // --- REPLICATE FREE LIMIT & URL LOGIC ---
    let freeLimitDisplay = '0';
    const isCPC = contract.rentType === 'CPC' || contract.rentType === 'CPC_COMBO';

    // Extract Pricing Rule
    const pricingRule = contract.items?.find(
      (i) =>
        i.itemType === 'PRICING_RULE' ||
        (i.combinedIncludedLimit !== undefined && i.combinedIncludedLimit > 0) ||
        (i.bwIncludedLimit !== undefined && i.bwIncludedLimit > 0),
    );

    if (isCPC) {
      freeLimitDisplay = 'Standard CPC';
    } else {
      if (pricingRule) {
        freeLimitDisplay = Number(
          pricingRule.combinedIncludedLimit ||
            (pricingRule.bwIncludedLimit || 0) + (pricingRule.colorIncludedLimit || 0),
        ).toLocaleString();
      }
    }

    // Normalize Image URL
    const R2_BASE_URL =
      process.env.R2_PUBLIC_URL || 'https://pub-8bbb88e1d79042349d0bc47ad1f3eb23.r2.dev';
    let meterImageUrl = usage.meterImageUrl;
    if (meterImageUrl && !meterImageUrl.startsWith('http')) {
      if (meterImageUrl.includes('cloudflarestorage.com')) {
        const parts = meterImageUrl.split('/');
        const filename = parts[parts.length - 1];
        meterImageUrl = `${R2_BASE_URL}/${filename}`;
      } else {
        meterImageUrl = `${R2_BASE_URL}/${meterImageUrl}`;
      }
    }

    // --- FETCH CUSTOMER DETAILS ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let customerDetails: any;
    let customerEmail: string | undefined;

    if (contract.customerId) {
      customerDetails = await this.getCustomerDetails(contract.customerId);
      if (customerDetails && customerDetails.email) {
        customerEmail = customerDetails.email;
        logger.info(`Fetched email for customer ${contract.customerId}: ${customerEmail}`);
      } else {
        logger.warn(`Could not fetch email for customer ${contract.customerId}`);
      }
    }

    // Trigger Email Notification via NotificationPublisher (Standardized Pipeline)
    const customerName = customerDetails?.firstName
      ? `${customerDetails.firstName} ${customerDetails.lastName || ''}`.trim()
      : 'Customer';

    // Inject Rules into Usage Object for Email Generation
    const detailedUsage = {
      ...usage,
      freeLimitDisplay,
      meterImageUrlNormalized: meterImageUrl,
      // Inject rule details if found
      bwFreeLimit: Number(pricingRule?.bwIncludedLimit || 0),
      colorFreeLimit: Number(pricingRule?.colorIncludedLimit || 0),
      combinedFreeLimit: Number(pricingRule?.combinedIncludedLimit || 0),
      bwExcessRate: Number(pricingRule?.bwExcessRate || 0),
      colorExcessRate: Number(pricingRule?.colorExcessRate || 0),
      combinedExcessRate: Number(pricingRule?.combinedExcessRate || 0),
      rentType: contract.rentType,
    };

    const htmlBody = this.generateUsageEmailBody(
      detailedUsage,
      customerName,
      usage.billingPeriodStart,
      usage.billingPeriodEnd,
    );

    if (customerEmail) {
      // Use the robust NotificationPublisher which routes to employee_service (actual sender)
      await NotificationPublisher.publishEmailRequest({
        recipient: customerEmail,
        subject: `Monthly Usage Statement - ${customerName}`,
        body: htmlBody,
        invoiceId: contract.id,
      });
      logger.info(`Usage Email published for ${customerEmail} via NotificationPublisher`);
    } else {
      logger.warn(`Skipping email for ${contract.id}: No customer email found`);
    }

    usage.emailSentAt = new Date();
    usage.whatsappSentAt = new Date();

    await this.usageRepo.save(usage);

    return {
      success: true,
      emailSentAt: usage.emailSentAt,
      whatsappSentAt: usage.whatsappSentAt,
      recipientEmail: customerEmail,
    };
  }

  /**
   * Helper: Generate HTML Body for Usage Email
   */
  private generateUsageEmailBody(
    usage: {
      bwA4Delta: number;
      bwA3Delta: number;
      colorA4Delta: number;
      colorA3Delta: number;
      exceededCharge: number;
      rentType?: string;
      bwFreeLimit?: number;
      colorFreeLimit?: number;
      combinedFreeLimit?: number;
      bwExcessRate?: number;
      colorExcessRate?: number;
      combinedExcessRate?: number;
      monthlyRent?: number;
      advanceAdjusted?: number;
      totalCharge?: number;
      meterImageUrlNormalized?: string;
    },
    customerName: string,
    periodStart: Date,
    periodEnd: Date,
  ): string {
    const formatCurrency = (amount: number) =>
      `₹${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

    // Re-derive limits/rates for the email (or pass them in if available)
    // For now, we'll try to use what's in 'usage' if we added it, or we might need to be careful.
    // The 'usage' object passed here comes from 'recordUsage' or 'sendMonthlyInvoice'.
    // 'sendMonthlyInvoice' fetches contract, so we can pass pricingRule or similar.
    // Let's assume 'usage' has the extended props we added to 'getUsageHistory' OR
    // we need to pass the rule.
    // Actually, 'usage' in 'sendMonthlyInvoice' is the raw entity.
    // We should probably fetch the rule in 'sendMonthlyInvoice' and pass it or relevant values.

    // Let's update sendMonthlyInvoice to pass these details.
    // Assuming usage object has: bwA4Delta, bwA3Delta, colorA4Delta, colorA3Delta
    // And we need limits/rates.

    // Destructure for cleaner access
    const { bwA4Delta, bwA3Delta, colorA4Delta, colorA3Delta, exceededCharge } = usage;

    // We need to calculate/show the breakdown.
    // Since we don't have the rule here cleanly, let's look at how we can get it.
    // In sendMonthlyInvoice, we have 'contract'. We can find the rule there.

    // Helper to get rule from usage (injected) or passed args.
    // For now, I will update 'sendMonthlyInvoice' to inject these into 'usage' or a new arg.
    // Let's assume 'usage' has them.

    const bwTotal = bwA4Delta + bwA3Delta * 2;
    const colorTotal = colorA4Delta + colorA3Delta * 2;

    // Limits and Rates (handled in valid JS even if undefined)
    const bwLimit = Number(usage.bwFreeLimit || 0);
    const colorLimit = Number(usage.colorFreeLimit || 0);
    const combinedLimit = Number(usage.combinedFreeLimit || 0);

    const bwRate = Number(usage.bwExcessRate || 0);
    const colorRate = Number(usage.colorExcessRate || 0);
    const combinedRate = Number(usage.combinedExcessRate || 0);

    // Calculate exceeded for display (approximation based on limits)
    let bwExceeded = 0;
    let colorExceeded = 0;
    let combinedExceeded = 0;
    let bwAmount = 0;
    let colorAmount = 0;
    let combinedAmount = 0;

    const rentType = usage.rentType || 'FIXED_LIMIT'; // Default

    if (rentType === 'FIXED_LIMIT') {
      bwExceeded = Math.max(0, bwTotal - bwLimit);
      colorExceeded = Math.max(0, colorTotal - colorLimit);
      bwAmount = bwExceeded * bwRate;
      colorAmount = colorExceeded * colorRate;
    } else if (rentType === 'FIXED_COMBO') {
      const totalUse = bwTotal + colorTotal;
      combinedExceeded = Math.max(0, totalUse - combinedLimit);
      combinedAmount = combinedExceeded * combinedRate;
    }
    // CPC logic handled by simplified display or total

    // Construct the rows dynamically based on Rent Type
    let detailedRows = '';

    if (rentType === 'FIXED_LIMIT') {
      detailedRows = `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #edf2f7;">
              Black & White
            </td>
            <td style="padding: 10px; text-align: right; border-bottom: 1px solid #edf2f7;">${bwLimit}</td>
            <td style="padding: 10px; text-align: right; border-bottom: 1px solid #edf2f7;">${bwTotal}</td>
             <td style="padding: 10px; text-align: right; border-bottom: 1px solid #edf2f7; color: ${bwExceeded > 0 ? '#e53e3e' : 'inherit'}">${bwExceeded}</td>
             <td style="padding: 10px; text-align: right; border-bottom: 1px solid #edf2f7;">${formatCurrency(bwRate)}</td>
             <td style="padding: 10px; text-align: right; border-bottom: 1px solid #edf2f7;">${formatCurrency(bwAmount)}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #edf2f7;">
              Color
            </td>
            <td style="padding: 10px; text-align: right; border-bottom: 1px solid #edf2f7;">${colorLimit}</td>
            <td style="padding: 10px; text-align: right; border-bottom: 1px solid #edf2f7;">${colorTotal}</td>
             <td style="padding: 10px; text-align: right; border-bottom: 1px solid #edf2f7; color: ${colorExceeded > 0 ? '#e53e3e' : 'inherit'}">${colorExceeded}</td>
             <td style="padding: 10px; text-align: right; border-bottom: 1px solid #edf2f7;">${formatCurrency(colorRate)}</td>
             <td style="padding: 10px; text-align: right; border-bottom: 1px solid #edf2f7;">${formatCurrency(colorAmount)}</td>
          </tr>
        `;
    } else if (rentType === 'FIXED_COMBO') {
      detailedRows = `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #edf2f7;">
              Combined (B&W + Color)
            </td>
            <td style="padding: 10px; text-align: right; border-bottom: 1px solid #edf2f7;">${combinedLimit}</td>
            <td style="padding: 10px; text-align: right; border-bottom: 1px solid #edf2f7;">${bwTotal + colorTotal}</td>
             <td style="padding: 10px; text-align: right; border-bottom: 1px solid #edf2f7; color: ${combinedExceeded > 0 ? '#e53e3e' : 'inherit'}">${combinedExceeded}</td>
             <td style="padding: 10px; text-align: right; border-bottom: 1px solid #edf2f7;">${formatCurrency(combinedRate)}</td>
             <td style="padding: 10px; text-align: right; border-bottom: 1px solid #edf2f7;">${formatCurrency(combinedAmount)}</td>
          </tr>
        `;
    } else {
      // Fallback for CPC or others
      detailedRows = `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #edf2f7;">Total Usage</td>
             <td style="padding: 10px; text-align: right; border-bottom: 1px solid #edf2f7;">-</td>
            <td style="padding: 10px; text-align: right; border-bottom: 1px solid #edf2f7;">${bwTotal + colorTotal}</td>
             <td style="padding: 10px; text-align: right; border-bottom: 1px solid #edf2f7;">-</td>
             <td style="padding: 10px; text-align: right; border-bottom: 1px solid #edf2f7;">-</td>
             <td style="padding: 10px; text-align: right; border-bottom: 1px solid #edf2f7;">${formatCurrency(exceededCharge)}</td>
          </tr>
        `;
    }

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #1a202c; text-align: center;">Monthly Usage Statement</h2>
        <p>Dear <strong>${customerName}</strong>,</p>
        <p>Here is your usage summary for the period <strong>${new Date(periodStart).toLocaleDateString()}</strong> to <strong>${new Date(periodEnd).toLocaleDateString()}</strong>.</p>
        
        <h3 style="margin-top:20px; color: #2d3748; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">Usage Breakdown</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px;">
          <tr style="background-color: #f7fafc;">
            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e2e8f0;">Item</th>
            <th style="padding: 8px; text-align: right; border-bottom: 2px solid #e2e8f0;">Free Limit</th>
            <th style="padding: 8px; text-align: right; border-bottom: 2px solid #e2e8f0;">Usage</th>
            <th style="padding: 8px; text-align: right; border-bottom: 2px solid #e2e8f0;">Exceeded</th>
            <th style="padding: 8px; text-align: right; border-bottom: 2px solid #e2e8f0;">Excess Rate</th>
            <th style="padding: 8px; text-align: right; border-bottom: 2px solid #e2e8f0;">Amount</th>
          </tr>
          ${detailedRows}
          <!-- Divider -->
           <tr>
            <td colspan="6" style="border-bottom: 1px solid #cbd5e0;"></td>
          </tr>
        </table>

        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #edf2f7;"><strong>Exceeded Charges Total</strong></td>
            <td style="padding: 10px; text-align: right; border-bottom: 1px solid #edf2f7;"><strong>${formatCurrency(usage.exceededCharge)}</strong></td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #edf2f7;">Monthly Rent</td>
            <td style="padding: 10px; text-align: right; border-bottom: 1px solid #edf2f7;">${formatCurrency(usage.monthlyRent || 0)}</td>
          </tr>
          <tr>
             <td style="padding: 10px; border-bottom: 1px solid #edf2f7;">Advance Adjusted</td>
             <td style="padding: 10px; text-align: right; border-bottom: 1px solid #edf2f7; color: #3182ce;">-${formatCurrency(usage.advanceAdjusted || 0)}</td>
           </tr>
           <tr style="background-color: #ebf8ff;">
             <td style="padding: 10px; font-weight: bold; font-size: 16px;">Final Total Payable</td>
             <td style="padding: 10px; text-align: right; font-weight: bold; color: #2c5282; font-size: 16px;">${formatCurrency(usage.totalCharge || 0)}</td>
           </tr>
        </table>

        ${
          usage.meterImageUrlNormalized
            ? `<div style="margin-top: 20px; text-align: center;">
                 <p style="font-size: 12px; color: #718096;">Meter Reading Evidence:</p>
                 <img src="${usage.meterImageUrlNormalized}" alt="Meter Reading" style="max-width: 100%; border-radius: 4px; border: 1px solid #cbd5e0;" />
               </div>`
            : ''
        }

        <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #718096;">
          <p>Thank you for choosing XeroCare.</p>
        </div>
      </div>
    `;
  }

  /**
   * Updates an existing usage record (meter readings) and recalculates charges.
   */
  async updateUsageRecord(
    id: string,
    payload: {
      bwA4Count: number;
      bwA3Count: number;
      colorA4Count: number;
      colorA3Count: number;
      billingPeriodEnd: string;
    }
  ) {
    const usage = await this.usageRepo.findById(id);
    if (!usage) {
      throw new AppError('Usage record not found', 404);
    }

    const contract = await this.invoiceRepo.findById(usage.contractId);
    if (!contract) {
      throw new AppError('Contract not found', 404);
    }

    const history = await this.usageRepo.getUsageHistory(usage.contractId, 'DESC');
    
    const sortedHistoryAsc = [...history].sort(
      (a, b) => new Date(a.billingPeriodStart).getTime() - new Date(b.billingPeriodStart).getTime()
    );
    const currentIndex = sortedHistoryAsc.findIndex(h => h.id === usage.id);

    const previousRecord = currentIndex > 0 ? sortedHistoryAsc[currentIndex - 1] : null;

    const pricingRules =
      contract.items?.filter((i) => i.itemType === 'PRICING_RULE' || i.itemType === 'PRODUCT') ||
      [];
    const rule = pricingRules[0];

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
      prevBwA4 = rule?.initialBwCount || 0;
      prevBwA3 = rule?.initialBwA3Count || 0;
      prevColorA4 = rule?.initialColorCount || 0;
      prevColorA3 = rule?.initialColorA3Count || 0;
    }

    const bwA4Delta = Math.max(0, payload.bwA4Count - prevBwA4);
    const bwA3Delta = Math.max(0, payload.bwA3Count - prevBwA3);
    const colorA4Delta = Math.max(0, payload.colorA4Count - prevColorA4);
    const colorA3Delta = Math.max(0, payload.colorA3Count - prevColorA3);

    const monthlyBw = bwA4Delta + bwA3Delta * 2;
    const monthlyColor = colorA4Delta + colorA3Delta * 2;
    const monthlyNormalized = monthlyBw + monthlyColor;

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
        exceededCharge = rule.comboSlabRanges && rule.comboSlabRanges.length > 0 ? comboCharge : bwCharge + colorCharge;
      }
    }

    usage.bwA4Count = payload.bwA4Count;
    usage.bwA3Count = payload.bwA3Count;
    usage.colorA4Count = payload.colorA4Count;
    usage.colorA3Count = payload.colorA3Count;
    usage.billingPeriodEnd = new Date(payload.billingPeriodEnd);

    usage.bwA4Delta = bwA4Delta;
    usage.bwA3Delta = bwA3Delta;
    usage.colorA4Delta = colorA4Delta;
    usage.colorA3Delta = colorA3Delta;
    usage.exceededCharge = exceededCharge;
    usage.exceededTotal = exceededTotal;
    
    usage.totalCharge = Number(usage.monthlyRent) + exceededCharge - Number(usage.advanceAdjusted || 0);

    return this.usageRepo.save(usage);
  }

  /**
   * Helper: Generate Final Summary Invoice
   */
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

  async getCustomerDetails(customerId: string) {
    try {
      const crmServiceUrl = process.env.CRM_SERVICE_URL || 'http://localhost:3005';

      // Generate Service Token
      const { sign } = await import('jsonwebtoken');
      const token = sign(
        { userId: 'billing_service', role: 'ADMIN' }, // Use ADMIN or SERVICE role to bypass restrictions
        process.env.ACCESS_SECRET as string,
        { expiresIn: '1m' },
      );

      const response = await fetch(`${crmServiceUrl}/customers/${customerId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        logger.error(`Failed to fetch customer details for ${customerId}: ${response.statusText}`);
        return null;
      }

      const data = await response.json();
      return data.data; // Assuming response structure { success: true, data: { ... } }
    } catch (error) {
      logger.error(`Error fetching customer details for ${customerId}`, error);
      return null;
    }
  }
}
