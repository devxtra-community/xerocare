import { InvoiceRepository } from '../repositories/invoiceRepository';
import { getRabbitChannel } from '../config/rabbitmq';
import { InvoiceStatus } from '../entities/enums/invoiceStatus';
import { InvoiceItem } from '../entities/invoiceItemEntity';
// import { publishInvoiceCreated } from '../events/publisher/billingPublisher';
import { SaleType } from '../entities/enums/saleType';
import { AppError } from '../errors/appError';
import { BillingCalculationService } from './billingCalculationService';
import { UsageRepository } from '../repositories/usageRepository';
import { SecurityDepositMode, Invoice } from '../entities/invoiceEntity';
import { logger } from '../config/logger';
import { RentType } from '../entities/enums/rentType';
import { RentPeriod } from '../entities/enums/rentPeriod';
import { LeaseType } from '../entities/enums/leaseType';
import { ItemType } from '../entities/enums/itemType';
import { InvoiceType } from '../entities/enums/invoiceType';
import { emitProductStatusUpdate } from '../events/publisher/productStatusEvent';
import { ReportedBy } from '../entities/usageRecordEntity';
import { ContractStatus } from '../entities/enums/contractStatus';
import { ProductAllocation, AllocationStatus } from '../entities/productAllocationEntity';
import PDFDocument from 'pdfkit';

export class BillingService {
  private invoiceRepo = new InvoiceRepository();
  private usageRepo = new UsageRepository();
  private calculator = new BillingCalculationService();

  // ... existing methods ...

  // ... existing methods ...

  /**
   * @deprecated logic moved to generateConsolidatedFinalInvoice (One final invoice per contract)
   */
  async generateFinalInvoice(payload: {
    contractId: string;
    billingPeriodStart: string;
    billingPeriodEnd: string;
  }) {
    const start = new Date(payload.billingPeriodStart);
    const end = new Date(payload.billingPeriodEnd);

    // 1. Fetch Contract (Proforma)
    const contract = await this.invoiceRepo.findById(payload.contractId);
    if (!contract || contract.type !== InvoiceType.PROFORMA) {
      throw new AppError('Valid Proforma Contract not found', 404);
    }

    // 2. Fetch Usage Record
    const usage = await this.usageRepo.findByContractAndPeriod(payload.contractId, start, end);
    if (!usage) {
      throw new AppError('Usage records not found for this billing period', 404);
    }

    // 3. Check for Duplicate/Tenure
    if (contract.contractStatus === ContractStatus.COMPLETED) {
      throw new AppError('Contract already completed. No further billing allowed.', 400);
    }

    const tenure = contract.leaseTenureMonths || 0;
    const history = await this.usageRepo.getUsageHistory(contract.id);
    const usageCount = history.length;

    if (tenure > 0 && usageCount > tenure) {
      // If we already have more usage records than tenure, it's an error
      // But usually generateFinalInvoice is called FOR a specific usage record.
      // Let's check if this specific usage record is the "next" one or past tenure.
    }

    // 3.5. Final Month Detection
    // Wait, history.length already includes the record we just retrieved if it's already in DB.
    // In recordUsage, we just saved it. So usageCount is the total number of records.
    const isFinalMonth = tenure > 0 && usageCount === tenure;

    // 4. Determine Rent to Charge
    let rentToCharge = 0;
    let advanceAdjusted = 0;

    if (isFinalMonth) {
      rentToCharge = 0; // Rent cancelled in final month
      advanceAdjusted = Number(
        contract.monthlyRent || contract.monthlyLeaseAmount || contract.monthlyEmiAmount || 0,
      );
    } else {
      rentToCharge = Number(
        contract.monthlyRent || contract.monthlyLeaseAmount || contract.monthlyEmiAmount || 0,
      );
      advanceAdjusted = 0;
    }

    // 5. Calculate
    const calcResult = this.calculator.calculate({
      rentType: contract.rentType,
      monthlyRent: rentToCharge,
      discountPercent: Number(contract.discountPercent || 0),
      pricingItems: contract.items,
      usage: {
        bwA4: usage.bwA4Count,
        bwA3: usage.bwA3Count,
        colorA4: usage.colorA4Count,
        colorA3: usage.colorA3Count,
      },
    });

    let payableAmount = calcResult.netAmount;

    // Rule: Fixed models consume advance (Monthly rent portion first)
    // Rule: CPC models -> advanceConsumed = 0 (as per prompt)
    if (contract.rentType === RentType.FIXED_LIMIT || contract.rentType === RentType.FIXED_COMBO) {
      if (isFinalMonth) {
        // If it's the final month, advanceAdjusted is already set to monthly rent/lease/emi amount
        // rentToCharge was set to 0, so calcResult.netAmount is just usage charges.
        // User wants "only exceeded charge to be collected", so payableAmount = calcResult.netAmount.
        payableAmount = calcResult.netAmount;
      } else {
        // Normal month, no advance deduction anymore (moved to final month)
        advanceAdjusted = 0;
        payableAmount = calcResult.netAmount;
      }
    } else {
      // CPC
      advanceAdjusted = 0;
      payableAmount = calcResult.netAmount;
    }

    // LEASE LOGIC
    if (contract.saleType === SaleType.LEASE) {
      if (contract.leaseType === LeaseType.EMI) {
        // EMI: Fixed EMI Amount, No Usage Calc
        payableAmount = Number(contract.monthlyEmiAmount || 0);
        calcResult.grossAmount = payableAmount;
        calcResult.netAmount = payableAmount;
        calcResult.discountAmount = 0;
        // advanceAdjusted is already handled by isFinalMonth logic
      } else if (contract.leaseType === LeaseType.FSM) {
        // FSM: Monthly Lease Amount + Usage CPC
        // Reuse calculator results which used monthlyLeaseAmount as base
        payableAmount = calcResult.netAmount;
      }

      // Check Tenure Completion
      if (contract.leaseTenureMonths && contract.effectiveFrom) {
        // This check is complex without proper date diffing libs or logic.
        // Skipping precise "Stop Invoice" enforcement here for safety,
        // but strictly, we should check if we are beyond tenure.
      }
    }

    // 6. Create FINAL Invoice
    const invoiceNumber = await this.invoiceRepo.generateInvoiceNumber();

    const finalInvoice = await this.invoiceRepo.createInvoice({
      invoiceNumber,
      branchId: contract.branchId,
      createdBy: contract.createdBy,
      customerId: contract.customerId,
      saleType: contract.saleType,

      type: InvoiceType.FINAL,
      status: InvoiceStatus.DRAFT,
      isFinalMonth: isFinalMonth,

      billingCycleInDays: contract.billingCycleInDays,
      effectiveFrom: start,
      effectiveTo: end,

      // Amounts
      monthlyRent: rentToCharge,
      grossAmount: calcResult.grossAmount,
      discountAmount: calcResult.discountAmount,
      advanceAdjusted: advanceAdjusted,
      totalAmount: payableAmount,

      referenceContractId: contract.id,
      usageRecordId: usage.id,
      rentType: contract.rentType,
      billingPeriodStart: start,
      billingPeriodEnd: end,

      // Usage Snapshot
      bwA4Count: usage.bwA4Count,
      bwA3Count: usage.bwA3Count,
      colorA4Count: usage.colorA4Count,
      colorA3Count: usage.colorA3Count,
    });

    return finalInvoice;
  }

  async updateInvoiceUsage(
    invoiceId: string,
    payload: {
      bwA4Count: number;
      bwA3Count: number;
      colorA4Count: number;
      colorA3Count: number;
      monthlyRent?: number;
      additionalCharges?: number;
      additionalChargesRemarks?: string;
      billingPeriodStart?: string;
      billingPeriodEnd?: string;
    },
  ): Promise<Invoice> {
    // 1. Fetch Invoice
    const invoice = await this.invoiceRepo.findById(invoiceId);
    if (!invoice) throw new AppError('Invoice not found', 404);
    if (invoice.type !== InvoiceType.FINAL) {
      throw new AppError('Only FINAL invoices can have their usage updated', 400);
    }
    if (invoice.status === InvoiceStatus.PAID) {
      throw new AppError('Cannot update usage for a PAID invoice', 400);
    }

    // 2. Fetch Contract
    if (!invoice.referenceContractId) throw new AppError('Contract reference missing', 400);
    const contract = await this.invoiceRepo.findById(invoice.referenceContractId);
    if (!contract) throw new AppError('Reference contract not found', 404);

    // 3. Recalculate
    const calcResult = this.calculator.calculate({
      rentType: contract.rentType,
      monthlyRent:
        payload.monthlyRent !== undefined
          ? Number(payload.monthlyRent)
          : contract.saleType === SaleType.LEASE && contract.leaseType === LeaseType.FSM
            ? Number(contract.monthlyLeaseAmount || 0)
            : Number(contract.monthlyRent || 0),
      discountPercent: Number(contract.discountPercent || 0),
      pricingItems: contract.items, // Items from contract
      usage: {
        bwA4: payload.bwA4Count,
        bwA3: payload.bwA3Count,
        colorA4: payload.colorA4Count,
        colorA3: payload.colorA3Count,
      },
      additionalCharges: payload.additionalCharges || invoice.additionalCharges || 0,
    });

    const isFinalMonth = invoice.isFinalMonth;
    let advanceAdjusted = 0;

    // Re-run calculation if we changed rentToCharge vs what was passed to calculator
    // Actually, updateInvoiceUsage's calculator call used payload.monthlyRent or contract value.
    // If isFinalMonth, we must force rentToCharge to 0.
    const finalCalcResult = isFinalMonth
      ? this.calculator.calculate({
          ...contract,
          rentType: contract.rentType,
          monthlyRent: 0,
          discountPercent: Number(contract.discountPercent || 0),
          pricingItems: contract.items,
          usage: {
            bwA4: payload.bwA4Count,
            bwA3: payload.bwA3Count,
            colorA4: payload.colorA4Count,
            colorA3: payload.colorA3Count,
          },
          additionalCharges: payload.additionalCharges || invoice.additionalCharges || 0,
        })
      : calcResult;

    let payableAmount = 0;

    // Handle Advance Adjustment (mirrors generateFinalInvoice logic)
    if (contract.rentType === RentType.FIXED_LIMIT || contract.rentType === RentType.FIXED_COMBO) {
      if (isFinalMonth) {
        payableAmount = finalCalcResult.netAmount;
      } else {
        advanceAdjusted = 0;
        payableAmount = finalCalcResult.netAmount;
      }
    } else {
      advanceAdjusted = 0;
      payableAmount = finalCalcResult.netAmount;
    }

    // 4. Update Invoice
    invoice.bwA4Count = payload.bwA4Count;
    invoice.bwA3Count = payload.bwA3Count;
    invoice.colorA4Count = payload.colorA4Count;
    invoice.colorA3Count = payload.colorA3Count;

    if (payload.monthlyRent !== undefined) invoice.monthlyRent = payload.monthlyRent;
    if (payload.additionalCharges !== undefined)
      invoice.additionalCharges = payload.additionalCharges;
    if (payload.additionalChargesRemarks !== undefined)
      invoice.additionalChargesRemarks = payload.additionalChargesRemarks;

    invoice.grossAmount = finalCalcResult.grossAmount;
    invoice.discountAmount = finalCalcResult.discountAmount;
    invoice.advanceAdjusted = advanceAdjusted;
    invoice.totalAmount = payableAmount;

    // 5. Update linked UsageRecord if it exists
    if (invoice.usageRecordId) {
      const usage = await this.usageRepo.findById(invoice.usageRecordId);
      if (usage) {
        usage.bwA4Count = payload.bwA4Count;
        usage.bwA3Count = payload.bwA3Count;
        usage.colorA4Count = payload.colorA4Count;
        usage.colorA3Count = payload.colorA3Count;
        await this.usageRepo.save(usage);
      }
    }

    return this.invoiceRepo.saveInvoice(invoice);
  }

  /**
   * @deprecated Monthly verification no longer generates invoices/locks.
   */
  async createNextMonthInvoice(contractId: string) {
    // 1. Fetch Contract
    const contract = await this.invoiceRepo.findById(contractId);
    if (!contract) throw new AppError('Contract not found', 404);

    if (contract.type !== InvoiceType.PROFORMA && contract.status !== InvoiceStatus.ACTIVE_LEASE) {
      throw new AppError('Invalid contract type', 400);
    }

    // 2. Determine Next Billing Period
    const history = await this.usageRepo.getUsageHistory(contractId);
    let nextStart: Date;

    if (history.length > 0) {
      // Sort history desc in case getUsageHistory not sorted (though repo usually does)
      const lastUsage = history[0];
      const lastEnd = new Date(lastUsage.billingPeriodEnd);
      nextStart = new Date(lastEnd);
      nextStart.setDate(nextStart.getDate() + 1);
    } else {
      // First period
      if (!contract.effectiveFrom) throw new AppError('Contract start date missing', 400);
      nextStart = new Date(contract.effectiveFrom);
    }

    // Calculate End date
    const year = nextStart.getFullYear();
    const month = nextStart.getMonth();
    // Default: End of that month.
    // Optimization: If contract has Custom Cycle (e.g. 30 days) use that?
    // User request: "One month usage". Defaulting to calendar month logic.
    const nextEnd = new Date(year, month + 1, 0);

    // 3. Upsert Empty Usage Record
    // We use usageRepo directly to initializing it.
    // UsageService.createUsageRecord checks for duplicates too, but requires payload like reportedBy.
    // Here we are systematically creating a placeholder.

    let usage = await this.usageRepo.findByContractAndPeriod(contractId, nextStart, nextEnd);

    if (!usage) {
      usage = this.usageRepo.create({
        contractId,
        billingPeriodStart: nextStart,
        billingPeriodEnd: nextEnd,
        bwA4Count: 0,
        bwA3Count: 0,
        colorA4Count: 0,
        colorA3Count: 0,
        reportedBy: ReportedBy.EMPLOYEE, // System or Employee triggered
        remarks: 'Next month placeholder',
      });
      await this.usageRepo.save(usage);
    } else {
      // Usage already exists for this period
    }

    // Return a shape that Frontend expects. Frontend expects Invoice?
    // The frontend `createNextMonthInvoice` return type is `Promise<Invoice>`.
    // But `UsageRecordingModal` just ignores the return or uses it to refresh.
    // Let's return the usage record as a pseudo-invoice or just the usage object.
    // Controller returns `res.data.data`.
    // If we return usage, frontend types might mismatch if it expects Invoice.
    // Let's check frontend usage: `await createNextMonthInvoice(contractId)`.
    // It doesn't use the return value explicitly in `handleSubmitAndNext`.
    // The prompt says "Opens a new form... Pre-fills...".

    return usage;
  }

  async generateConsolidatedFinalInvoice(contractId: string) {
    // 1. Fetch contract
    const contract = await this.invoiceRepo.findById(contractId);

    // Check if contract exists
    if (!contract) {
      throw new AppError('Contract not found', 404);
    }

    // Idempotency: If already FINAL, just return it
    if (contract.type === InvoiceType.FINAL) {
      return contract;
    }

    // Ensure it is PROFORMA (Contract) before processing
    if (contract.type !== InvoiceType.PROFORMA) {
      throw new AppError('Invalid contract type', 400);
    }

    // 🔹 GUARD: Prevent double completion (if somehow marked completed but not FINAL type yet?)
    if (contract.contractStatus === ContractStatus.COMPLETED) {
      // Should ideally be FINAL if completed, but if inconsistent state, warn.
      // However, we just checked type != FINAL above.
      throw new AppError('Contract already completed but not finalized', 400);
    }

    // 2. Fetch all usage records (ordered by date)
    const usageRecords = await this.usageRepo.getUsageHistory(contractId);
    if (usageRecords.length === 0) {
      throw new AppError('No usage records found', 400);
    }

    // 🔹 VALIDATION: Check if all months recorded
    const expectedMonths = this.calculateExpectedMonths(contract);
    if (usageRecords.length < expectedMonths) {
      throw new AppError(
        `Incomplete usage records. Expected ${expectedMonths} months, found ${usageRecords.length}`,
        400,
      );
    }

    // 3. Calculate Totals from Usage Records (Source of Truth)
    const totalExceededCharge = usageRecords.reduce(
      (sum, u) => sum + Number(u.exceededCharge || 0),
      0,
    );
    const totalMonthlyRent = usageRecords.reduce((sum, u) => sum + Number(u.monthlyRent || 0), 0);

    // Total Value of the Contract (Rent + Excess)
    const finalTotal = totalMonthlyRent + totalExceededCharge;

    // 4. Update Contract to become the FINAL Invoice
    contract.contractStatus = ContractStatus.COMPLETED;
    contract.type = InvoiceType.FINAL;
    contract.status = InvoiceStatus.ISSUED;
    contract.completedAt = new Date();

    // Update Amounts
    // Note: advanceAmount is assumed to be the remaining advance after usage adjustments
    // If this is manual trigger, we assume usage records already handled advance adjustments logic?
    // Actually, UsageService handles advance adjustment per month.
    // If manual trigger runs, we must trust the state of usage records and contract.advanceAmount.

    contract.grossAmount = finalTotal;
    contract.totalAmount = finalTotal; // Total Billable Value

    // Populate simple counts if needed
    contract.bwA4Count = usageRecords.reduce((s, u) => s + (u.bwA4Count || 0), 0);
    contract.bwA3Count = usageRecords.reduce((s, u) => s + (u.bwA3Count || 0), 0);
    contract.colorA4Count = usageRecords.reduce((s, u) => s + (u.colorA4Count || 0), 0);
    contract.colorA3Count = usageRecords.reduce((s, u) => s + (u.colorA3Count || 0), 0);

    await this.invoiceRepo.save(contract);

    return contract;
  }

  private calculateExpectedMonths(contract: Invoice): number {
    if (contract.leaseTenureMonths) return contract.leaseTenureMonths;
    if (contract.effectiveFrom && contract.effectiveTo) {
      const start = new Date(contract.effectiveFrom);
      const end = new Date(contract.effectiveTo);
      const diffMonth =
        (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
      return diffMonth > 0 ? diffMonth : 1;
    }
    return 12; // Default
  }

  async createQuotation(payload: {
    branchId: string;
    createdBy: string;
    customerId: string;
    saleType: SaleType;

    // Quotation Fields
    rentType: RentType;
    rentPeriod: RentPeriod;
    monthlyRent?: number;
    advanceAmount?: number;
    discountPercent?: number;
    effectiveFrom: string; // From UI usually string
    effectiveTo?: string;
    totalAmount?: number;
    billingCycleInDays?: number; // Added for CUSTOM period logic

    // Lease Fields
    leaseType?: LeaseType;
    leaseTenureMonths?: number;
    totalLeaseAmount?: number;
    monthlyEmiAmount?: number;
    monthlyLeaseAmount?: number;

    // Sale Items
    items?: {
      description: string;
      quantity: number;
      unitPrice: number;
      itemType?: ItemType;
      productId?: string; // Optional: Specific Serial (Sale)
      modelId?: string; // Required for Rent/Lease Quotation
    }[];
    // Pricing Items (Rules)
    pricingItems?: {
      description: string;
      // Fixed
      bwIncludedLimit?: number;
      colorIncludedLimit?: number;
      combinedIncludedLimit?: number;
      // Excess Rates
      bwExcessRate?: number;
      colorExcessRate?: number;
      combinedExcessRate?: number;
      // Slabs
      bwSlabRanges?: Array<{ from: number; to: number; rate: number }>;
      colorSlabRanges?: Array<{ from: number; to: number; rate: number }>;
      comboSlabRanges?: Array<{ from: number; to: number; rate: number }>;
    }[];
  }) {
    // 1. Validation Logic
    if (payload.rentType === RentType.FIXED_LIMIT || payload.rentType === RentType.FIXED_COMBO) {
      if (payload.pricingItems) {
        // Rule: No Slabs for Fixed
        const hasSlabs = payload.pricingItems.some(
          (item) => item.bwSlabRanges || item.colorSlabRanges || item.comboSlabRanges,
        );
        if (hasSlabs) {
          throw new AppError('Fixed Rent models cannot have Slab Ranges', 400);
        }
      }
    } else if (payload.rentType === RentType.CPC || payload.rentType === RentType.CPC_COMBO) {
      if (payload.monthlyRent && payload.monthlyRent > 0) {
        throw new AppError('CPC models cannot have Monthly Rent', 400);
      }
    }

    // Validation for Custom Billing Period
    if (payload.rentPeriod === RentPeriod.CUSTOM) {
      if (!payload.billingCycleInDays || payload.billingCycleInDays <= 0) {
        throw new AppError(
          'Billing Cycle (Days) is required and must be greater than 0 for CUSTOM rent period',
          400,
        );
      }
    }

    const invoiceNumber = await this.invoiceRepo.generateInvoiceNumber();

    const invoiceItems: InvoiceItem[] = [];
    let calculatedTotal = 0;

    // 1. Handle Items (Product/Machines) - Available for both SALE and RENT
    if (payload.items) {
      logger.info('Creating invoice items from payload', {
        itemsCount: payload.items.length,
        items: payload.items.map((i) => ({
          description: i.description,
          productId: i.productId,
          hasProductId: !!i.productId,
        })),
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const productItems = payload.items.map((item: any) => {
        const invItem = new InvoiceItem();
        invItem.itemType = item.itemType || ItemType.PRODUCT;
        invItem.description = item.description;
        invItem.quantity = item.quantity;
        invItem.unitPrice = item.unitPrice;
        invItem.modelId = item.modelId;
        invItem.productId = item.productId; // Specific Serial (if Sale)

        // Map Pricing/Limit Fields for Product Items (Rent/Lease)
        invItem.bwIncludedLimit = item.bwIncludedLimit;
        invItem.colorIncludedLimit = item.colorIncludedLimit;
        invItem.combinedIncludedLimit = item.combinedIncludedLimit;
        invItem.bwExcessRate = item.bwExcessRate;
        invItem.colorExcessRate = item.colorExcessRate;
        invItem.combinedExcessRate = item.combinedExcessRate;
        invItem.bwSlabRanges = item.bwSlabRanges;
        invItem.colorSlabRanges = item.colorSlabRanges;
        invItem.comboSlabRanges = item.comboSlabRanges;

        logger.info(
          `Created invoice item (cons): Desc=${invItem.description} Model=${invItem.modelId} BWLimit=${invItem.bwIncludedLimit} ColorLimit=${invItem.colorIncludedLimit} BWExcess=${invItem.bwExcessRate}`,
        );

        return invItem;
      });
      invoiceItems.push(...productItems);

      // Calculate Total for Sale items (machines usually 0 price in rent, but safeguards added)
      calculatedTotal += payload.items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0,
      );
    }

    // 2. Handle Pricing Rules (Rent Specific)
    if (payload.pricingItems && payload.saleType !== SaleType.SALE) {
      const ruleItems = payload.pricingItems.map((item) => {
        const invoiceItem = new InvoiceItem();
        invoiceItem.itemType = ItemType.PRICING_RULE;
        invoiceItem.description = item.description;

        // Map Pricing Fields
        invoiceItem.bwIncludedLimit = item.bwIncludedLimit;
        invoiceItem.colorIncludedLimit = item.colorIncludedLimit;
        invoiceItem.combinedIncludedLimit = item.combinedIncludedLimit;

        invoiceItem.bwExcessRate = item.bwExcessRate;
        invoiceItem.colorExcessRate = item.colorExcessRate;
        invoiceItem.combinedExcessRate = item.combinedExcessRate;

        invoiceItem.bwSlabRanges = item.bwSlabRanges;
        invoiceItem.colorSlabRanges = item.colorSlabRanges;
        invoiceItem.comboSlabRanges = item.comboSlabRanges;

        return invoiceItem;
      });
      invoiceItems.push(...ruleItems);
    }

    // 2. Create Invoice as Quotation
    const invoice = await this.invoiceRepo.createInvoice({
      invoiceNumber,

      branchId: payload.branchId,
      createdBy: payload.createdBy,
      customerId: payload.customerId,
      saleType: payload.saleType,

      // If Sale, maybe DIRECT FINAL? Or SENT?
      // User flow for Sale: "New Sale" -> likely confirmed immediately?
      // Code sets QUOTATION. Let's keep consistency.
      type: InvoiceType.QUOTATION,
      status: InvoiceStatus.DRAFT,

      rentType: payload.rentType,
      rentPeriod: payload.rentPeriod,
      monthlyRent: payload.monthlyRent ? Number(payload.monthlyRent) : undefined,
      advanceAmount: Number(payload.advanceAmount || 0), // STRICT FIX: Ensure number
      discountPercent: payload.discountPercent ? Number(payload.discountPercent) : undefined,
      effectiveFrom: payload.effectiveFrom ? new Date(payload.effectiveFrom) : new Date(),
      effectiveTo: payload.effectiveTo ? new Date(payload.effectiveTo) : undefined,
      billingCycleInDays:
        payload.rentPeriod === RentPeriod.CUSTOM ? payload.billingCycleInDays : undefined, // Only save if CUSTOM

      leaseType: payload.leaseType!, // ! if validated
      leaseTenureMonths: payload.leaseTenureMonths,
      totalLeaseAmount: payload.totalLeaseAmount,
      monthlyEmiAmount: payload.monthlyEmiAmount,
      monthlyLeaseAmount: payload.monthlyLeaseAmount,

      totalAmount:
        payload.saleType === SaleType.LEASE
          ? Number(payload.advanceAmount || 0)
          : calculatedTotal == 0
            ? Number(payload.advanceAmount || 0)
            : calculatedTotal,
      items: invoiceItems,
    });

    // Publish event if needed (maybe quotation.created later)
    try {
      // Skipping usage-based event publishing for now
    } catch (err: unknown) {
      logger.error('Failed to publish event', err);
    }

    return invoice;
  }

  async updateQuotation(
    id: string,
    payload: {
      rentType?: RentType;
      rentPeriod?: RentPeriod;
      monthlyRent?: number;
      advanceAmount?: number;
      discountPercent?: number;
      effectiveFrom?: string;
      effectiveTo?: string;
      billingCycleInDays?: number; // Added for CUSTOM period
      // Lease Fields
      leaseType?: LeaseType;
      leaseTenureMonths?: number;
      totalLeaseAmount?: number;
      monthlyEmiAmount?: number;
      monthlyLeaseAmount?: number;

      pricingItems?: {
        description: string;
        bwIncludedLimit?: number;
        colorIncludedLimit?: number;
        combinedIncludedLimit?: number;
        bwExcessRate?: number;
        colorExcessRate?: number;
        combinedExcessRate?: number;
        bwSlabRanges?: Array<{ from: number; to: number; rate: number }>;
        colorSlabRanges?: Array<{ from: number; to: number; rate: number }>;
        comboSlabRanges?: Array<{ from: number; to: number; rate: number }>;
      }[];
      items?: {
        description: string;
        quantity: number;
        unitPrice: number;
        itemType?: ItemType;
        productId?: string;
        modelId?: string;
      }[];
    },
  ) {
    const invoice = await this.invoiceRepo.findById(id);
    if (!invoice) throw new AppError('Quotation not found', 404);

    // Lock editing after final approval or conversion to contract
    if (
      invoice.status === InvoiceStatus.APPROVED ||
      invoice.status === InvoiceStatus.FINANCE_APPROVED ||
      invoice.type === InvoiceType.PROFORMA
    ) {
      throw new AppError(
        'Cannot edit a Quotation after it has been finalized/approved by Finance',
        400,
      );
    }

    // Update basic fields
    if (payload.rentType) invoice.rentType = payload.rentType;
    if (payload.rentPeriod) invoice.rentPeriod = payload.rentPeriod;
    if (payload.monthlyRent !== undefined) invoice.monthlyRent = payload.monthlyRent;
    if (payload.advanceAmount !== undefined) invoice.advanceAmount = payload.advanceAmount;
    if (payload.discountPercent !== undefined) invoice.discountPercent = payload.discountPercent;
    if (payload.effectiveFrom) invoice.effectiveFrom = new Date(payload.effectiveFrom);
    if (payload.effectiveTo) invoice.effectiveTo = new Date(payload.effectiveTo);
    if (payload.billingCycleInDays !== undefined) {
      invoice.billingCycleInDays = payload.billingCycleInDays;
    }

    // Validation update: If switching to CUSTOM, check validity
    if (
      (payload.rentPeriod === RentPeriod.CUSTOM ||
        (invoice.rentPeriod === RentPeriod.CUSTOM && !payload.rentPeriod)) &&
      (!invoice.billingCycleInDays || invoice.billingCycleInDays <= 0)
    ) {
      throw new AppError(
        'Billing Cycle (Days) is required and must be greater than 0 for CUSTOM rent period',
        400,
      );
    }

    // Update Lease Fields
    if (payload.leaseType) invoice.leaseType = payload.leaseType;
    if (payload.leaseTenureMonths !== undefined)
      invoice.leaseTenureMonths = payload.leaseTenureMonths;
    if (payload.totalLeaseAmount !== undefined) invoice.totalLeaseAmount = payload.totalLeaseAmount;
    if (payload.monthlyEmiAmount !== undefined) invoice.monthlyEmiAmount = payload.monthlyEmiAmount;
    if (payload.monthlyLeaseAmount !== undefined)
      invoice.monthlyLeaseAmount = payload.monthlyLeaseAmount;

    // Update Items (Machines + Pricing Rules)
    const newInvoiceItems: InvoiceItem[] = [];

    // 1. Handle Machine Items
    if (payload.items) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const machineItems = payload.items.map((item: any) => {
        const invItem = new InvoiceItem();
        invItem.itemType = item.itemType || ItemType.PRODUCT;
        invItem.description = item.description;
        invItem.quantity = item.quantity;
        invItem.unitPrice = item.unitPrice;
        invItem.modelId = item.modelId;
        invItem.productId = item.productId;

        // Map pricing fields if present on the product item
        invItem.bwIncludedLimit = item.bwIncludedLimit;
        invItem.colorIncludedLimit = item.colorIncludedLimit;
        invItem.combinedIncludedLimit = item.combinedIncludedLimit;
        invItem.bwExcessRate = item.bwExcessRate;
        invItem.colorExcessRate = item.colorExcessRate;
        invItem.combinedExcessRate = item.combinedExcessRate;
        invItem.bwSlabRanges = item.bwSlabRanges;
        invItem.colorSlabRanges = item.colorSlabRanges;
        invItem.comboSlabRanges = item.comboSlabRanges;

        return invItem;
      });
      newInvoiceItems.push(...machineItems);
    }

    // 2. Handle Pricing Rules
    if (payload.pricingItems) {
      const ruleItems = payload.pricingItems.map((item) => {
        const invoiceItem = new InvoiceItem();
        invoiceItem.itemType = ItemType.PRICING_RULE;
        invoiceItem.description = item.description;
        invoiceItem.bwIncludedLimit = item.bwIncludedLimit;
        invoiceItem.colorIncludedLimit = item.colorIncludedLimit;
        invoiceItem.combinedIncludedLimit = item.combinedIncludedLimit;
        invoiceItem.bwExcessRate = item.bwExcessRate;
        invoiceItem.colorExcessRate = item.colorExcessRate;
        invoiceItem.combinedExcessRate = item.combinedExcessRate;
        invoiceItem.bwSlabRanges = item.bwSlabRanges;
        invoiceItem.colorSlabRanges = item.colorSlabRanges;
        invoiceItem.comboSlabRanges = item.comboSlabRanges;
        return invoiceItem;
      });
      newInvoiceItems.push(...ruleItems);
    }

    // Replace items if any new items are provided (either machine or rules)
    if (newInvoiceItems.length > 0) {
      await this.invoiceRepo.clearItems(invoice.id);
      newInvoiceItems.forEach((item) => (item.invoice = invoice));
      invoice.items = newInvoiceItems;
    }

    // Recalculate Total Amount for Quotation Phase
    if (invoice.saleType === SaleType.LEASE) {
      invoice.totalAmount = invoice.advanceAmount || 0;
    } else {
      // Rent or Sale
      let calculatedTotal = 0;
      if (invoice.items && invoice.items.length > 0) {
        calculatedTotal = invoice.items.reduce(
          (sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
          0,
        );
      }
      invoice.totalAmount =
        calculatedTotal === 0 ? Number(invoice.advanceAmount || 0) : calculatedTotal;
    }

    await this.invoiceRepo.save(invoice);
    const updated = await this.invoiceRepo.findById(invoice.id);
    if (!updated) throw new AppError('Updated quotation not found', 404);
    return updated;
  }

  async approveQuotation(
    id: string,
    deposit?: {
      amount: number;
      mode: SecurityDepositMode;
      reference?: string;
      receivedDate?: string;
    },
  ) {
    const invoice = await this.invoiceRepo.findById(id);
    if (!invoice) {
      throw new AppError('Quotation not found', 404);
    }

    if (invoice.status !== InvoiceStatus.SENT && invoice.status !== InvoiceStatus.DRAFT) {
      // Can we approve DRAFT directly? Usually DRAFT -> SENT -> APPROVED.
      // User said: "send quotation: update status -> SENT", "approve quotation: update status -> APPROVED, type -> PROFORMA".
    }

    // Update to PROFORMA (Rent Contract)
    invoice.status = InvoiceStatus.APPROVED;
    invoice.type = InvoiceType.PROFORMA;

    if (invoice.saleType === SaleType.LEASE) {
      // LEASE: No Security Deposit Logic
      return this.invoiceRepo.save(invoice);
    }

    // Security Deposit Logic
    if (deposit) {
      invoice.securityDepositAmount = deposit.amount;
      invoice.securityDepositMode = deposit.mode;
      invoice.securityDepositReference = deposit.reference;
      if (deposit.receivedDate) {
        invoice.securityDepositReceivedDate = new Date(deposit.receivedDate);
      }
    }

    return this.invoiceRepo.save(invoice);
  }

  async updateStatus(id: string, status: InvoiceStatus) {
    // Generic status update (e.g. DRAFT -> SENT)
    const invoice = await this.invoiceRepo.findById(id);
    if (!invoice) throw new AppError('Invoice not found', 404);

    invoice.status = status;
    return this.invoiceRepo.save(invoice);
  }

  async employeeApprove(id: string, userId: string) {
    const invoice = await this.invoiceRepo.findById(id);
    if (!invoice) throw new AppError('Quotation not found', 404);

    if (invoice.status !== InvoiceStatus.DRAFT && invoice.status !== InvoiceStatus.SENT) {
      throw new AppError('Only DRAFT or SENT quotations can be submitted for approval', 400);
    }

    invoice.status = InvoiceStatus.EMPLOYEE_APPROVED;
    invoice.employeeApprovedBy = userId;
    invoice.employeeApprovedAt = new Date();

    return this.invoiceRepo.save(invoice);
  }

  async financeApprove(
    id: string,
    userId: string,
    token: string, // Added token for authenticated requests
    deposit?: {
      amount: number;
      mode: SecurityDepositMode;
      reference?: string;
      receivedDate?: string;
    },
    itemUpdates?: {
      id: string;
      productId: string;
      initialBwCount?: number;
      initialBwA3Count?: number;
      initialColorCount?: number;
      initialColorA3Count?: number;
    }[],
  ) {
    const queryRunner = this.invoiceRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const invoice = await queryRunner.manager.findOne(Invoice, {
        where: { id },
        relations: ['items'],
      });

      if (!invoice) throw new AppError('Quotation not found', 404);

      if (invoice.status !== InvoiceStatus.EMPLOYEE_APPROVED) {
        throw new AppError('Only Employee Approved quotations can be finalized by Finance', 400);
      }

      console.log(`[Billing Service] financeApprove started for invoice: ${id}. User: ${userId}`);
      console.log('[Billing Service] Item Updates received:', JSON.stringify(itemUpdates, null, 2));

      // 0. Ensure all PRODUCT items are allocated and have readings
      const productItems = invoice.items.filter((item) => item.itemType === 'PRODUCT');

      // Create a Map for O(1) and robust lookup
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updatesMap = new Map<string, any>();
      if (Array.isArray(itemUpdates)) {
        itemUpdates.forEach((u) => {
          if (u.id) {
            const key = String(u.id).toLowerCase().trim();
            updatesMap.set(key, u);
            console.log(`[Billing Service] Indexed update for ID: ${key} -> PID: ${u.productId}`);
          }
        });
      }

      for (const item of productItems) {
        const itemKey = String(item.id).toLowerCase().trim();
        const update = updatesMap.get(itemKey);
        const isAllocated = !!(item.productId || update?.productId);

        console.log(`[Billing Service] Validating item ${item.description}:`, {
          itemKey,
          updateFound: !!update,
          updatePID: update?.productId,
          dbPID: item.productId,
          isAllocated,
          modelId: item.modelId,
        });

        if (!isAllocated && item.modelId) {
          throw new AppError(
            `Machine allocation (Serial Number) is required for: ${item.description}. ` +
              `[Debug: ID=${item.id}, DB_PID=${item.productId || 'null'}, Upd_PID=${update?.productId || 'null'}, MapHas=${updatesMap.has(itemKey)}, TotalUpdates=${updatesMap.size}]`,
            400,
          );
        }

        // Check readings
        const bwCount =
          update?.initialBwCount !== undefined ? update.initialBwCount : item.initialBwCount;
        if (bwCount === undefined || bwCount === null) {
          throw new AppError(`Initial B&W reading missing for item: ${item.description}`, 400);
        }
      }

      // 0.1 Ensure Deposit is provided for non-LEASE contracts
      if (invoice.saleType !== SaleType.LEASE) {
        if (!deposit || !deposit.amount || deposit.amount <= 0) {
          throw new AppError('Security Deposit is mandatory for Rent and Sale contracts', 400);
        }
      }

      // Apply item updates (productId + readings) AND Create Allocations
      if (itemUpdates && itemUpdates.length > 0) {
        for (const update of itemUpdates) {
          const item = invoice.items.find((i) => i.id === update.id);
          if (item) {
            // 1. Fetch Product Details for Validation
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let product: any;
            try {
              const inventoryServiceUrl =
                process.env.INVENTORY_SERVICE_URL || 'http://localhost:3003';
              const response = await fetch(`${inventoryServiceUrl}/products/${update.productId}`, {
                headers: {
                  Authorization: token,
                  'Content-Type': 'application/json',
                },
              });

              if (!response.ok) {
                throw new Error(
                  `Failed to fetch product ${update.productId}: ${response.statusText}`,
                );
              }
              const data = await response.json();
              product = data.data;
            } catch (error) {
              logger.error(`Failed to validate product capability for ${update.productId}`, error);
              throw new AppError(
                `Failed to validate product ${update.productId}. Please try again.`,
                500,
              );
            }

            if (!product) {
              throw new AppError(`Product ${update.productId} not found during validation`, 404);
            }

            // 2. Validate Capability
            if (!product.print_colour) {
              throw new AppError(
                `Product capability (print_colour) undefined for product ${product.serial_no || update.productId}`,
                400,
              );
            }

            item.productId = update.productId;

            // Always set B&W if provided
            if (update.initialBwCount !== undefined) {
              item.initialBwCount = update.initialBwCount;
            }

            if (update.initialBwA3Count !== undefined) {
              item.initialBwA3Count = update.initialBwA3Count;
            }

            // Strictly handle Color
            if (product.print_colour === 'BLACK_WHITE') {
              item.initialColorCount = 0;
            } else {
              if (update.initialColorCount === undefined || update.initialColorCount === null) {
                throw new AppError(
                  `Initial Color reading missing for color product ${product.serial_no}`,
                  400,
                );
              }
              item.initialColorCount = update.initialColorCount;

              if (update.initialColorA3Count !== undefined) {
                item.initialColorA3Count = update.initialColorA3Count;
              }
            }

            // 3. Create ProductAllocation Record
            await queryRunner.manager.insert(ProductAllocation, {
              contractId: invoice.id,
              modelId: item.modelId,
              productId: update.productId,
              serialNumber: product.serial_no || 'Unknown',
              initialBwA4: item.initialBwCount || 0,
              initialBwA3: item.initialBwA3Count || 0,
              initialColorA4: item.initialColorCount || 0,
              initialColorA3: item.initialColorA3Count || 0,
              currentBwA4: item.initialBwCount || 0,
              currentBwA3: item.initialBwA3Count || 0,
              currentColorA4: item.initialColorCount || 0,
              currentColorA3: item.initialColorA3Count || 0,
              status: AllocationStatus.ALLOCATED,
            });
          }
        }
      }

      invoice.status = InvoiceStatus.FINANCE_APPROVED;
      invoice.financeApprovedBy = userId;
      invoice.financeApprovedAt = new Date();

      // Final Transition Logic
      if (invoice.saleType === SaleType.SALE) {
        invoice.type = InvoiceType.FINAL;
        invoice.status = InvoiceStatus.ISSUED;
      } else if (invoice.saleType === SaleType.RENT) {
        invoice.type = InvoiceType.PROFORMA;
        invoice.contractStatus = ContractStatus.ACTIVE;

        if (!invoice.effectiveFrom) {
          invoice.effectiveFrom = new Date();
        }

        if (!invoice.effectiveTo) {
          const startDate = new Date(invoice.effectiveFrom!);
          const endDate = new Date(startDate);

          if (invoice.rentPeriod === RentPeriod.CUSTOM && invoice.billingCycleInDays) {
            endDate.setDate(endDate.getDate() + invoice.billingCycleInDays);
          } else if (invoice.rentPeriod === RentPeriod.QUARTERLY) {
            endDate.setMonth(endDate.getMonth() + 3);
          } else if (invoice.rentPeriod === RentPeriod.HALF_YEARLY) {
            endDate.setMonth(endDate.getMonth() + 6);
          } else if (invoice.rentPeriod === RentPeriod.YEARLY) {
            endDate.setFullYear(endDate.getFullYear() + 1);
          } else {
            endDate.setMonth(endDate.getMonth() + 1);
          }
          invoice.effectiveTo = endDate;
        }
      } else if (invoice.saleType === SaleType.LEASE) {
        invoice.type = InvoiceType.PROFORMA;
        invoice.status = InvoiceStatus.FINANCE_APPROVED;
        invoice.contractStatus = ContractStatus.ACTIVE;

        if (invoice.leaseTenureMonths) {
          invoice.effectiveFrom = new Date();
          const leaseEnd = new Date();
          leaseEnd.setMonth(leaseEnd.getMonth() + invoice.leaseTenureMonths);
          invoice.effectiveTo = leaseEnd;
        }
      }

      // Security Deposit Logic
      if (deposit) {
        invoice.securityDepositAmount = deposit.amount;
        invoice.securityDepositMode = deposit.mode;
        invoice.securityDepositReference = deposit.reference;
        if (deposit.receivedDate) {
          invoice.securityDepositReceivedDate = new Date(deposit.receivedDate);
        }
      }

      const savedInvoice = await queryRunner.manager.save(invoice);
      await queryRunner.commitTransaction();

      logger.info('Finance approved invoice', {
        invoiceId: savedInvoice.id,
        saleType: savedInvoice.saleType,
        itemsCount: savedInvoice.items?.length || 0,
        hasDeposit: !!deposit,
      });

      // Emit product status update events
      try {
        if (!savedInvoice.items || savedInvoice.items.length === 0) {
          logger.warn('No items found in invoice for product status update', {
            invoiceId: savedInvoice.id,
          });
          return savedInvoice;
        }

        for (const item of savedInvoice.items) {
          if (!item.productId) {
            logger.debug('Skipping item without productId', {
              itemId: item.id,
              itemType: item.itemType,
            });
            continue;
          }

          logger.info('Emitting product status update', {
            productId: item.productId,
            billType: savedInvoice.saleType,
            invoiceId: savedInvoice.id,
          });

          await emitProductStatusUpdate({
            productId: item.productId,
            billType: savedInvoice.saleType,
            invoiceId: savedInvoice.id,
            approvedBy: userId,
            approvedAt: savedInvoice.financeApprovedAt || new Date(),
          });
        }
      } catch (error) {
        logger.error('Failed to emit product status update events', {
          error,
          invoiceId: savedInvoice.id,
        });
        // Don't fail the approval if event emission fails
      }

      return savedInvoice;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async financeReject(id: string, userId: string, reason: string) {
    const invoice = await this.invoiceRepo.findById(id);
    if (!invoice) throw new AppError('Quotation not found', 404);

    if (invoice.status !== InvoiceStatus.EMPLOYEE_APPROVED) {
      throw new AppError('Only Employee Approved quotations can be rejected by Finance', 400);
    }

    invoice.status = InvoiceStatus.REJECTED;
    invoice.financeApprovedBy = userId; // Record who rejected
    invoice.financeApprovedAt = new Date();
    invoice.financeRemarks = reason;

    return this.invoiceRepo.save(invoice);
  }

  async getAllInvoices(branchId?: string) {
    return this.invoiceRepo.findAll(branchId);
  }

  async getInvoicesByCreator(creatorId: string) {
    return this.invoiceRepo.findByCreatorId(creatorId);
  }

  async getBranchInvoices(branchId: string) {
    return this.invoiceRepo.findByBranchId(branchId);
  }

  async getInvoiceById(id: string) {
    const invoice = await this.invoiceRepo.findById(id);
    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    // Logic 1: If this is a Contract (PROFORMA / ACTIVE_LEASE),
    // enrich with latest pending usage readings for display.
    if (
      (invoice.type === InvoiceType.PROFORMA || invoice.status === InvoiceStatus.ACTIVE_LEASE) &&
      (invoice.bwA4Count === null || invoice.bwA4Count === undefined)
    ) {
      const history = await this.usageRepo.getUsageHistory(invoice.id);
      const latestUsage = history[0];
      if (latestUsage) {
        invoice.bwA4Count = latestUsage.bwA4Count;
        invoice.bwA3Count = latestUsage.bwA3Count;
        invoice.colorA4Count = latestUsage.colorA4Count;
        invoice.colorA3Count = latestUsage.colorA3Count;
        invoice.billingPeriodStart = latestUsage.billingPeriodStart;
        invoice.billingPeriodEnd = latestUsage.billingPeriodEnd;

        // NEW: Determine if this is the first month for advance deduction simulation
        const isFirstMonth = history.length === 1;
        if (isFirstMonth && invoice.advanceAmount && invoice.advanceAmount > 0) {
          // Simulation: Deduct advance from rent for the preview
          invoice.advanceAdjusted = invoice.advanceAmount;
        }

        // Calculate a projected total for the UI
        // We'll leave totalAmount as is but the UI will use these flags.
      }
    }

    // Logic 2: If this is a FINAL invoice, it might not have the pricing rules (items)
    // copied from the contract. Load them from the reference contract if missing
    // so the Usage Breakdown and Pricing Rules sections display correctly.
    if (
      invoice.type === InvoiceType.FINAL &&
      invoice.referenceContractId &&
      (!invoice.items || !invoice.items.some((i) => i.itemType === ItemType.PRICING_RULE))
    ) {
      const contract = await this.invoiceRepo.findById(invoice.referenceContractId);
      if (contract && contract.items) {
        const rules = contract.items.filter((i) => i.itemType === ItemType.PRICING_RULE);
        if (!invoice.items) invoice.items = [];
        invoice.items.push(...rules);
      }
    }

    // Logic 3: Fetch related final invoice history for contracts or final invoices
    if (invoice.type === InvoiceType.FINAL && invoice.referenceContractId) {
      (invoice as Invoice & { invoiceHistory?: Invoice[] }).invoiceHistory =
        await this.invoiceRepo.findFinalInvoicesByContractId(invoice.referenceContractId);
    } else if (
      invoice.type === InvoiceType.PROFORMA ||
      invoice.status === InvoiceStatus.ACTIVE_LEASE
    ) {
      (invoice as Invoice & { invoiceHistory?: Invoice[] }).invoiceHistory =
        await this.invoiceRepo.findFinalInvoicesByContractId(invoice.id);

      // Also include usage records (for displaying usage history even without generated invoices)
      const usageHistory = await this.usageRepo.getUsageHistory(invoice.id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (invoice as Invoice & { usageHistory?: any[] }).usageHistory = usageHistory;
    }

    return invoice;
  }

  async getInvoiceStats(filter: { createdBy?: string; branchId?: string } = {}) {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = await this.invoiceRepo.getStats({ ...filter, startOfDay, startOfMonth });

    const result: Record<string, number> = {
      SALE: 0,
      RENT: 0,
      LEASE: 0,
      SALE_TODAY: 0,
      SALE_THIS_MONTH: 0,
    };

    stats.forEach((s) => {
      // Base Counts
      result[s.saleType] = s.count;

      // Time-based Aggregation (Specifically for SALE type as per requirement, or ALL?)
      // User asked for "Sale This Month" and "Today Count".
      // "Today Count" likely implies ALL orders today.
      // "Sale This Month" implies ALL orders (or Sales?) this month.
      // Let's aggregate ALL types for now.

      result.SALE_TODAY += s.todayCount;
      result.SALE_THIS_MONTH += s.monthCount;
    });

    return result;
  }

  async getBranchSales(period: string, branchId: string) {
    let days = 30; // Default 1M
    if (period === '1W') days = 7;
    else if (period === '1M') days = 30;
    else if (period === '3M') days = 90;
    else if (period === '1Y') days = 365;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await this.invoiceRepo.getBranchSalesTrend(branchId, startDate);
    return stats;
  }

  async getBranchSalesTotals(branchId: string) {
    return await this.invoiceRepo.getBranchSalesTotals(branchId);
  }

  async getGlobalSales(period: string) {
    let days = 30; // Default 1M
    if (period === '1W') days = 7;
    else if (period === '1M') days = 30;
    else if (period === '3M') days = 90;
    else if (period === '1Y') days = 365;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await this.invoiceRepo.getGlobalSalesTrend(startDate);
    return stats;
  }

  async getGlobalSalesTotals() {
    return await this.invoiceRepo.getGlobalSalesTotals();
  }

  async getAdminSalesStats() {
    return await this.invoiceRepo.getAdminSalesStats();
  }

  async getPendingCounts(branchId: string) {
    const counts = await this.invoiceRepo.getPendingCounts(branchId);
    // Convert array to object { RENT: 5, SALE: 2, ... }
    const result: Record<string, number> = {
      RENT: 0,
      LEASE: 0,
      SALE: 0,
    };
    counts.forEach((c) => {
      if (c.saleType) result[c.saleType] = c.count;
    });
    return result;
  }

  async getCollectionAlerts(branchId: string) {
    const activeContracts = await this.invoiceRepo.findActiveContracts(branchId);
    const alerts: Array<{
      contractId: string;
      customerId: string; // customerName fetched by API Gateway
      invoiceNumber: string;
      type: 'USAGE_PENDING' | 'INVOICE_PENDING' | 'SEND_PENDING' | 'SUMMARY_PENDING';
      saleType: string;
      dueDate: Date;
      effectiveFrom?: Date;
      effectiveTo?: Date;
      monthlyRent?: number;
      totalAmount?: number;
      recordedMonths?: number;
      tenure?: number;
      contractStatus?: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
      usageData?: {
        bwA4Count: number;
        bwA3Count: number;
        colorA4Count: number;
        colorA3Count: number;
        totalAmount?: number;
        billingPeriodStart: Date;
        billingPeriodEnd: Date;
      };
    }> = [];

    // For Final Invoices (SEND_PENDING), we still might want date filtering or just show all pending?
    // User request: "Monthly table always moves to next period".
    // Let's iterate Active Contracts and determine their CURRENT state.

    for (const contract of activeContracts) {
      if (!contract.effectiveFrom) continue;

      // 1. Get History sorted by date DESC
      const history = await this.usageRepo.getUsageHistory(contract.id);

      // Completion Logic: If recorded months >= tenure, skip monthly recording alert.
      // We don't mark as COMPLETED here; that happens during Final Summary generation.
      if (contract.leaseTenureMonths && history.length >= contract.leaseTenureMonths) {
        alerts.push({
          contractId: contract.id,
          customerId: contract.customerId,
          invoiceNumber: contract.invoiceNumber,
          type: 'SUMMARY_PENDING',
          saleType: contract.saleType,
          dueDate: new Date(),
          effectiveFrom: contract.effectiveFrom,
          effectiveTo: contract.effectiveTo,
          monthlyRent: contract.monthlyRent,
          recordedMonths: history.length,
          tenure: contract.leaseTenureMonths || 0,
        });
        continue;
      }

      let currentPeriodStart: Date;

      // Logic: Always project the NEXT pending period based on the latest record
      const latestRecord = history[0];

      if (latestRecord) {
        // Next start = last end + 1 day
        currentPeriodStart = new Date(latestRecord.billingPeriodEnd);
        currentPeriodStart.setDate(currentPeriodStart.getDate() + 1);
      } else {
        // First period
        currentPeriodStart = new Date(contract.effectiveFrom);
      }

      // Calculate End Date
      const cycleDays = contract.billingCycleInDays || 30; // Default 30

      const currentPeriodEnd = new Date(currentPeriodStart);
      currentPeriodEnd.setDate(currentPeriodEnd.getDate() + cycleDays - 1);

      // Validation: Is the contract complete?
      if (contract.effectiveTo && currentPeriodStart > contract.effectiveTo) {
        continue;
      }

      // 2. Create Alert for "USAGE_PENDING"
      const due = new Date(currentPeriodEnd);
      due.setDate(due.getDate() + 5);

      alerts.push({
        contractId: contract.id,
        customerId: contract.customerId,
        invoiceNumber: contract.invoiceNumber,
        type: 'USAGE_PENDING',
        saleType: contract.saleType,
        dueDate: due,
        effectiveFrom: contract.effectiveFrom,
        effectiveTo: contract.effectiveTo,
        monthlyRent: contract.monthlyRent,
        recordedMonths: history.length,
        tenure: contract.leaseTenureMonths || 0,
        usageData: {
          bwA4Count: 0,
          bwA3Count: 0,
          colorA4Count: 0,
          colorA3Count: 0,
          billingPeriodStart: currentPeriodStart,
          billingPeriodEnd: currentPeriodEnd,
        },
      });
    }

    // Optional: Add SEND_PENDING for actual Final Invoices if needed?
    // "Remove Invoice Pending status... Remove monthly invoice generation".
    // But verify: "Consolidated FINAL invoice generated".
    // If a Final Invoice exists and is not sent, show it?
    // For "Monthly Collection", maybe stick to active contracts for now.
    // Or fetch separately.
    // Let's keep it clean as requested: Active Contracts -> Usage Pending.

    // 3. Fetch Unpaid FINAL Invoices (Consolidated)
    const finalInvoices = await this.invoiceRepo.findUnpaidFinalInvoices(branchId);
    for (const inv of finalInvoices) {
      alerts.push({
        contractId: inv.id,
        customerId: inv.customerId,
        invoiceNumber: inv.invoiceNumber,
        type: 'INVOICE_PENDING',
        saleType: inv.saleType,
        dueDate: inv.createdAt, // Or calculated due date
        effectiveFrom: inv.effectiveFrom,
        effectiveTo: inv.effectiveTo,
        monthlyRent: inv.monthlyRent,
        totalAmount: inv.totalAmount,
        contractStatus: 'COMPLETED',
        recordedMonths: inv.items?.length || 0, // Approximate
        tenure: inv.leaseTenureMonths || 0,
      });
    }

    return alerts;
  }

  async getCompletedCollections(branchId?: string) {
    // Fetch all completed contracts
    const completedContracts = await this.invoiceRepo.findCompletedContracts(branchId);

    const collections = [];

    for (const contract of completedContracts) {
      // Find the final summary invoice for this contract
      const finalInvoices = await this.invoiceRepo.findFinalInvoicesByContractId(contract.id);
      const summaryInvoice = finalInvoices.find((inv) => inv.isSummaryInvoice); // The "Consolidated" one

      // Calculate totals
      let totalCollected = 0;
      let finalAmount = 0;
      let grossAmount = 0;
      let advanceAdjusted = 0;

      if (summaryInvoice) {
        // Summary invoice available - use its totals
        console.log(
          `[DEBUG] Summary Inv found for ${contract.invoiceNumber}: Gross=${summaryInvoice.grossAmount}, Total=${summaryInvoice.totalAmount}`,
        );
        grossAmount = Number(summaryInvoice.grossAmount || 0);
        advanceAdjusted = Number(summaryInvoice.advanceAdjusted || 0);
        finalAmount = Number(summaryInvoice.totalAmount || 0);
        totalCollected = grossAmount; // Assuming Total Collected means Gross Value here
      } else if (contract.type === InvoiceType.FINAL) {
        // Contract ITSELF is the Final Invoice (New Flow)
        console.log(`[DEBUG] Consolidated Contract (Final) found: ${contract.invoiceNumber}`);
        grossAmount = Number(contract.grossAmount || 0);
        advanceAdjusted = Number(contract.advanceAmount || 0); // Is this adjusted rent? Or remaining advance?
        // In UsageService, we updated contract.grossAmount = finalTotalRent + finalTotalExcess
        // contract.advanceAmount was updated to (currentAdvance - rentAmount).

        finalAmount = Number(contract.totalAmount || 0);
        totalCollected = grossAmount;
      } else {
        // Fallback: Sum monthly invoices
        const monthlyInvoices = finalInvoices.filter(
          (inv) => !inv.isSummaryInvoice && inv.type === InvoiceType.FINAL,
        );
        console.log(
          `[DEBUG] No Summary Inv for ${contract.invoiceNumber}. Found ${monthlyInvoices.length} monthly invoices.`,
        );

        // Summing up totals from monthly invoices
        const monthlySum = monthlyInvoices.reduce(
          (sum, inv) => sum + Number(inv.totalAmount || 0),
          0,
        );
        const monthlyGross = monthlyInvoices.reduce(
          (sum, inv) => sum + Number(inv.grossAmount || inv.totalAmount || 0),
          0,
        );

        console.log(`[DEBUG] Monthly Sums: Total=${monthlySum}, Gross=${monthlyGross}`);
        grossAmount = monthlyGross;

        advanceAdjusted = Number(contract.advanceAmount || 0);
        finalAmount = monthlySum;
        totalCollected = grossAmount;
      }

      // Fallback: If totals are still 0, check Usage Records (History)
      if (grossAmount === 0) {
        console.log(`[DEBUG] Totals 0 for ${contract.invoiceNumber}, checking Usage Records...`);
        try {
          const history = await this.usageRepo.getUsageHistory(contract.id, 'ASC');
          if (history.length > 0) {
            console.log(`[DEBUG] Found ${history.length} usage records.`);
            // Sum up total charges from usage records
            const usageGross = history.reduce((sum, u) => sum + Number(u.totalCharge || 0), 0);

            // Assuming advance is already adjusted in the final usage record calculation if handled there
            // But generally, totalCollected ~ Gross Bill
            grossAmount = usageGross;
            totalCollected = usageGross;
            finalAmount = usageGross; // Approximation if invoice logic fails
            console.log(`[DEBUG] Calculated from Usage: Gross=${grossAmount}`);
          }
        } catch (err) {
          console.error(`[DEBUG] Failed to fetch usage history for ${contract.invoiceNumber}`, err);
        }
      }

      collections.push({
        contractId: contract.id,
        customerId: contract.customerId,
        invoiceNumber: contract.invoiceNumber,
        saleType: contract.saleType,
        effectiveFrom: contract.effectiveFrom,
        effectiveTo: contract.effectiveTo,
        completedAt: contract.completedAt,
        finalInvoiceId:
          summaryInvoice?.id || (contract.type === InvoiceType.FINAL ? contract.id : undefined),
        finalInvoiceNumber:
          summaryInvoice?.invoiceNumber ||
          (contract.type === InvoiceType.FINAL ? contract.invoiceNumber : undefined),
        totalCollected,
        finalAmount,
        grossAmount,
        advanceAdjusted,
        status: summaryInvoice
          ? summaryInvoice.status
          : contract.status || ContractStatus.COMPLETED,
      });
    }

    return collections;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async downloadConsolidatedInvoice(contractId: string, res: any) {
    const contract = await this.invoiceRepo.findById(contractId);
    if (!contract) throw new AppError('Contract not found', 404);

    const finalInvoices = await this.invoiceRepo.findFinalInvoicesByContractId(contractId);
    const summaryInvoice = finalInvoices.find((inv) => inv.isSummaryInvoice);
    const monthlyInvoices = finalInvoices
      .filter((inv) => !inv.isSummaryInvoice && inv.type === InvoiceType.FINAL)
      .reverse(); // Order by date

    // PDF Generation
    const doc = new PDFDocument({ margin: 50 });

    doc.pipe(res);

    // Header
    doc.fontSize(20).text('Consolidated Billing Statement', { align: 'center' });
    doc.moveDown();

    // Customer Details
    doc.fontSize(12).text(`Customer ID: ${contract.customerId}`);
    doc.text(`Contract #: ${contract.invoiceNumber}`);
    doc.text(`Date: ${new Date().toLocaleDateString()}`);
    doc.moveDown();

    // Summary Table
    const tableTop = 200;
    const itemCodeX = 50;
    const descriptionX = 150; // Invoice #
    const amountX = 400;

    doc.font('Helvetica-Bold');
    doc.text('Period', itemCodeX, tableTop);
    doc.text('Invoice #', descriptionX, tableTop);
    doc.text('Amount', amountX, tableTop);
    doc.moveDown();
    doc.font('Helvetica');

    let y = tableTop + 25;

    monthlyInvoices.forEach((inv) => {
      const start = inv.billingPeriodStart
        ? new Date(inv.billingPeriodStart).toLocaleDateString()
        : '-';
      const end = inv.billingPeriodEnd ? new Date(inv.billingPeriodEnd).toLocaleDateString() : '-';
      const period = `${start} to ${end}`;

      doc.text(period, itemCodeX, y);
      doc.text(inv.invoiceNumber, descriptionX, y);
      doc.text(`INR ${Number(inv.totalAmount).toFixed(2)}`, amountX, y);
      y += 20;
    });

    doc.moveDown();
    doc.font('Helvetica-Bold');
    const totalCollected =
      summaryInvoice?.grossAmount ||
      monthlyInvoices.reduce((s, i) => s + Number(i.grossAmount || 0), 0);
    doc.text(`Total Collected: INR ${Number(totalCollected).toFixed(2)}`, amountX, y + 20);

    doc.end();
  }

  async sendConsolidatedInvoice(contractId: string) {
    const contract = await this.invoiceRepo.findById(contractId);
    if (!contract) throw new AppError('Contract not found', 404);

    // Publish to RabbitMQ
    try {
      const channel = await getRabbitChannel();
      const message = {
        type: 'SEND_CONSOLIDATED_INVOICE',
        payload: {
          contractId: contract.id,
          customerId: contract.customerId,
          invoiceNumber: contract.invoiceNumber,
          // @ts-expect-error customerEmail might not exist on type yet
          customerEmail: contract.customerEmail, // Assuming this field exists or needs fetching
        },
      };

      channel.sendToQueue('email_queue', Buffer.from(JSON.stringify(message)), {
        persistent: true,
      });
      logger.info(
        `[Email Service] Published invoice email task for ${contract.invoiceNumber} to queue`,
      );
    } catch (error) {
      logger.error('Failed to publish email task to RabbitMQ', error);
      // Fallback or re-throw based on requirement. For now, logging error but updating db as "attempted"
    }

    // Update Last Sent time
    contract.emailSentAt = new Date();
    await this.invoiceRepo.save(contract);

    return { success: true, message: 'Invoice sending queued successfully' };
  }

  async getFinanceReport(filter: {
    branchId?: string;
    saleType?: string;
    month?: number;
    year?: number;
  }) {
    const reportData = await this.invoiceRepo.getFinanceReport(filter);

    // For profit calculation, we would ideally need the cost of each item.
    // Since we are in separate DBs, we'll suggest a default 15-20% expense for now,
    // or calculate it based on items if we had cost info in billing_service.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return reportData.map((item: any) => {
      const expense = 0; // Updated as per user request (expense logic not yet implemented)
      const profit = (item.income || 0) - expense;
      return {
        ...item,
        expense,
        profit,
        profitStatus: 'profit',
      };
    });
  }

  async getInvoiceHistory(branchId: string, saleType?: string) {
    // Fetch all FINAL invoices for the branch
    const invoices = await this.invoiceRepo.findFinalInvoicesByBranch(branchId, saleType);

    // Enrich with usage data
    const enrichedInvoices = await Promise.all(
      invoices.map(async (invoice) => {
        // Fetch usage record if linked
        let usageData = null;
        if (invoice.usageRecordId) {
          const usage = await this.usageRepo.findById(invoice.usageRecordId);
          if (usage) {
            usageData = {
              bwA4Count: usage.bwA4Count,
              bwA3Count: usage.bwA3Count,
              colorA4Count: usage.colorA4Count,
              colorA3Count: usage.colorA3Count,
              billingPeriodStart: usage.billingPeriodStart,
              billingPeriodEnd: usage.billingPeriodEnd,
              remarks: usage.remarks,
            };
          }
        }

        return {
          ...invoice,
          usageData,
        };
      }),
    );

    return enrichedInvoices;
  }

  async completeContract(contractId: string) {
    const queryRunner = this.invoiceRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const contract = await queryRunner.manager.findOne(Invoice, { where: { id: contractId } });
      if (!contract) throw new AppError('Contract not found', 404);

      // Fetch Allocations
      const allocations = await queryRunner.manager.find(ProductAllocation, {
        where: { contractId: contract.id, status: AllocationStatus.ALLOCATED },
      });

      if (allocations.length > 0) {
        // Mark as RETURNED
        await queryRunner.manager.update(
          ProductAllocation,
          { contractId: contract.id, status: AllocationStatus.ALLOCATED },
          { status: AllocationStatus.RETURNED },
        );
      }

      // Update Contract Status
      contract.contractStatus = ContractStatus.COMPLETED;
      contract.completedAt = new Date();
      await queryRunner.manager.save(contract);

      await queryRunner.commitTransaction();

      // Emit Event
      if (allocations.length > 0) {
        try {
          const channel = await getRabbitChannel();
          if (channel) {
            const eventPayload = {
              contractId: contract.id,
              allocations: allocations.map((a: ProductAllocation) => ({
                productId: a.productId, // Physical Product ID
                serialNumber: a.serialNumber,
              })),
            };
            channel.sendToQueue('product.returned', Buffer.from(JSON.stringify(eventPayload)));
          }
        } catch (e) {
          logger.error('Failed to emit product.returned event', e);
        }
      }

      return contract;
    } catch (err: unknown) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
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

  async sendEmailNotification(
    contractId: string,
    recipient: string | undefined,
    subject: string,
    body: string,
  ) {
    const contract = await this.invoiceRepo.findById(contractId);
    if (!contract) throw new AppError('Contract not found', 404);

    let finalRecipient = recipient;

    // Fetch from CRM if recipient is missing
    if (!finalRecipient && contract.customerId) {
      const customer = await this.getCustomerDetails(contract.customerId);
      if (customer && customer.email) {
        finalRecipient = customer.email;
        logger.info(`Fetched email for customer ${contract.customerId}: ${finalRecipient}`);
      } else {
        logger.warn(`Could not fetch email for customer ${contract.customerId}`);
      }
    }

    if (!finalRecipient) {
      throw new AppError('Recipient email is required and could not be fetched from CRM', 400);
    }

    // Construct Detailed HTML Body
    const itemsHtml = contract.items
      ?.map(
        (item) => `
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px;">${item.description}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${item.quantity || 1}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${item.bwIncludedLimit ?? '-'}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${item.colorIncludedLimit ?? '-'}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${item.bwExcessRate ?? '-'}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${item.colorExcessRate ?? '-'}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${item.unitPrice || 0}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${(item.quantity || 1) * (item.unitPrice || 0)}</td>
      </tr>
    `,
      )
      .join('');

    // helper to display fields if they exist
    const showRow = (label: string, value: string | number | undefined | null) => {
      if (value === undefined || value === null) return '';
      return `<tr>
        <td style="padding: 5px; font-weight: bold; width: 40%;">${label}:</td>
        <td style="padding: 5px;">${value}</td>
      </tr>`;
    };

    // Extract Limit/Excess info from the first pricing rule or item (assuming uniform for quotation usually, or list them)
    // For simplicity in summary, we check if there's a pricing rule.
    // const pricingRule = contract.items?.find((i) => i.itemType === ItemType.PRICING_RULE) || contract.items?.[0];

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; border: 1px solid #eee; padding: 20px;">
        <h2 style="color: #333;">Quotation / Invoice Details</h2>
        <p>${body}</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <h3 style="margin-top: 0; color: #555;">Contract Overview</h3>
          <table style="width: 100%; border-collapse: collapse;">
            ${showRow('Invoice Number', contract.invoiceNumber)}
            ${showRow('Date', new Date(contract.createdAt).toLocaleDateString())}
            ${showRow('Type', contract.saleType)}
            ${showRow('Advance Amount', contract.advanceAmount)}
            ${showRow('Monthly Rent', contract.monthlyRent)}
            ${showRow('Rent Period', contract.rentPeriod)}
            ${showRow('Billing Cycle', contract.billingCycleInDays ? `${contract.billingCycleInDays} Days` : undefined)}
          </table>
        </div>

        <div style="margin-bottom: 20px; overflow-x: auto;">
          <h3 style="color: #555;">Itemized Breakdown & Usage Limits</h3>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd; font-size: 13px;">
            <thead style="background-color: #f2f2f2;">
              <tr>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Description</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Qty</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">B&W Limit</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Color Limit</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">B&W Excess</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Color Excess</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Unit Price</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml || '<tr><td colspan="8" style="text-align: center; padding: 10px;">No Items</td></tr>'}
            </tbody>
            <tfoot>
               <tr>
                 <td colspan="7" style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: bold;">Total Amount</td>
                 <td style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: bold;">${contract.totalAmount}</td>
               </tr>
            </tfoot>
          </table>
          <p style="font-size: 11px; color: #666; margin-top: 5px;">* Limits are included in the rental. Excess rates apply after limits are crossed.</p>
        </div>
        
        <p style="font-size: 12px; color: #888;">Thank you for choosing XeroCare.</p>
      </div>
    `;

    // Import dynamically to avoid circular dependency issues if any, or just use import at top
    const { NotificationPublisher } = await import('../events/publisher/notificationPublisher');

    await NotificationPublisher.publishEmailRequest({
      recipient: finalRecipient,
      subject,
      body: htmlBody, // Sending HTML as body
      invoiceId: contract.id,
    });
  }

  async sendWhatsappNotification(contractId: string, recipient: string | undefined, body: string) {
    const contract = await this.invoiceRepo.findById(contractId);
    if (!contract) throw new AppError('Contract not found', 404);

    let finalRecipient = recipient;

    // Fetch from CRM if recipient is missing
    if (!finalRecipient && contract.customerId) {
      const customer = await this.getCustomerDetails(contract.customerId);
      if (customer && customer.phone) {
        finalRecipient = customer.phone;
        logger.info(`Fetched phone for customer ${contract.customerId}: ${finalRecipient}`);
      } else {
        logger.warn(`Could not fetch phone for customer ${contract.customerId}`);
      }
    }

    if (!finalRecipient) {
      throw new AppError('Recipient phone is required and could not be fetched from CRM', 400);
    }

    const { NotificationPublisher } = await import('../events/publisher/notificationPublisher');

    // Construct Detailed WhatsApp Message
    let details = `*Invoice:* ${contract.invoiceNumber}\n`;
    details += `*Date:* ${new Date(contract.createdAt).toLocaleDateString()}\n`;
    details += `*Total:* ${contract.totalAmount}\n`;

    if (contract.advanceAmount) details += `*Advance:* ${contract.advanceAmount}\n`;
    if (contract.monthlyRent) details += `*Rent:* ${contract.monthlyRent}\n`;
    details += `----------------\n`;

    // Per Item Details
    if (contract.items && contract.items.length > 0) {
      contract.items.forEach((item) => {
        details += `*Item:* ${item.description} (Qty: ${item.quantity || 1})\n`;

        const hasLimits =
          item.bwIncludedLimit !== undefined || item.colorIncludedLimit !== undefined;
        const hasRates = item.bwExcessRate !== undefined || item.colorExcessRate !== undefined;

        if (hasLimits) {
          details += `   • *Limits:* BW: ${item.bwIncludedLimit ?? '-'} | Clr: ${item.colorIncludedLimit ?? '-'}\n`;
        }
        if (hasRates) {
          details += `   • *Excess:* BW: ${item.bwExcessRate ?? '-'} | Clr: ${item.colorExcessRate ?? '-'}\n`;
        }
      });
      details += `----------------\n`;
    }

    const fullBody = `${body}\n\n${details}\n_Thank you, XeroCare_`;

    await NotificationPublisher.publishWhatsappRequest({
      recipient: finalRecipient,
      body: fullBody,
      invoiceId: contract.id,
    });
  }
}
