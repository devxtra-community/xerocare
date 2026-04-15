import { InvoiceRepository } from '../repositories/invoiceRepository';
// import { getRabbitChannel } from '../config/rabbitmq';
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
import { ContractStatus } from '../entities/enums/contractStatus';
import { ProductAllocation, AllocationStatus } from '../entities/productAllocationEntity';
import { DeviceMeterReading, ReadingSource } from '../entities/deviceMeterReadingEntity';
import { UsageRecord } from '../entities/usageRecordEntity';
import { UsageService } from './usageService';

const appendOpenEndedSlab = <T extends { from: number; to: number; rate: number }>(
  ranges: T[] | undefined,
  excessRate: number | undefined,
): T[] | undefined => {
  if (
    !ranges ||
    !Array.isArray(ranges) ||
    ranges.length === 0 ||
    excessRate === undefined ||
    excessRate === null
  ) {
    return ranges;
  }
  const maxTo = Math.max(...ranges.map((r) => Number(r.to) || 0));
  if (maxTo >= 999999) return ranges;
  return [...ranges, { from: maxTo + 1, to: 9999999, rate: Number(excessRate) } as T];
};

export class BillingService {
  private invoiceRepo = new InvoiceRepository();
  private usageRepo = new UsageRepository();
  private calculator = new BillingCalculationService();
  private usageService = new UsageService();

  // ... existing methods ...

  // ... existing methods ...

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
          : [SaleType.LEASE, SaleType.PRODUCT_SALE, SaleType.SPAREPART_SALE].includes(
                contract.saleType as SaleType,
              ) && contract.leaseType === LeaseType.FSM
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
      await this.usageService.updateUsageRecord(invoice.usageRecordId, {
        bwA4Count: payload.bwA4Count,
        bwA3Count: payload.bwA3Count,
        colorA4Count: payload.colorA4Count,
        colorA3Count: payload.colorA3Count,
        billingPeriodEnd: payload.billingPeriodEnd,
      });
    }

    return this.invoiceRepo.saveInvoice(invoice);
  }

  /**
   * Generates the consolidated final invoice for the closed contract.
   */
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

    if (contract.contractStatus === ContractStatus.COMPLETED) {
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
    const finalGross = totalMonthlyRent + totalExceededCharge;

    // 🔹 DISCOUNT CALCULATION: Sum up all discounts from usage records
    const totalDiscountAmount = usageRecords.reduce(
      (sum, u) => sum + Number(u.discountAmount || 0),
      0,
    );

    // 4. Update Contract to become the FINAL Invoice
    contract.contractStatus = ContractStatus.COMPLETED;
    contract.type = InvoiceType.FINAL;
    contract.status = InvoiceStatus.ISSUED;
    contract.completedAt = new Date();

    contract.grossAmount = finalGross;
    contract.discountAmount = totalDiscountAmount;
    contract.totalAmount = finalGross - totalDiscountAmount;

    contract.bwA4Count = usageRecords.reduce((s, u) => s + (u.bwA4Count || 0), 0);
    contract.bwA3Count = usageRecords.reduce((s, u) => s + (u.bwA3Count || 0), 0);
    contract.colorA4Count = usageRecords.reduce((s, u) => s + (u.colorA4Count || 0), 0);
    contract.colorA3Count = usageRecords.reduce((s, u) => s + (u.colorA3Count || 0), 0);

    await this.invoiceRepo.save(contract);

    // 5. Update Product Allocations to RETURNED (Only for RENT, LEASE remains untouched)
    const allocations = await this.invoiceRepo.manager.find(ProductAllocation, {
      where: { contractId: contract.id, status: AllocationStatus.ALLOCATED },
    });

    logger.info(
      `DEBUG_FINALIZATION: Found ${allocations.length} ALLOCATED allocations for contract ${contract.id}`,
    );
    logger.info(`DEBUG_FINALIZATION: Contract SaleType is ${contract.saleType}`);

    if (
      [SaleType.RENT, SaleType.PRODUCT_SALE, SaleType.SPAREPART_SALE].includes(contract.saleType) &&
      allocations.length > 0
    ) {
      logger.info(
        `DEBUG_FINALIZATION: Updating ALLOCATED to RETURNED for rent contract ${contract.id}`,
      );
      const updateResult = await this.invoiceRepo.manager.update(
        ProductAllocation,
        { contractId: contract.id, status: AllocationStatus.ALLOCATED },
        { status: AllocationStatus.RETURNED },
      );
      logger.info('DEBUG_FINALIZATION: updateResult', { updateResult });
    } else {
      logger.info('DEBUG_FINALIZATION: Skipped update', {
        saleType: contract.saleType,
        allocCount: allocations.length,
      });
    }

    // 6. Emit Product Status Updates (Mark as AVAILABLE/RETURNED)
    if (contract.saleType === SaleType.RENT && allocations.length > 0) {
      for (const allocation of allocations) {
        if (!allocation.productId) continue;
        try {
          await emitProductStatusUpdate({
            productId: allocation.productId,
            billType: 'RETURNED',
            invoiceId: contract.id,
            approvedBy: 'SYSTEM',
            approvedAt: new Date(),
          });
        } catch (e) {
          logger.error('Failed to emit product status update for allocation', {
            productId: allocation.productId,
            error: e,
          });
        }
      }
    }

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

  /**
   * Creates a new quotation, validating availability and pricing.
   */
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
    discountAmount?: number;
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

    // Security Deposit Fields
    securityDepositAmount?: number;
    securityDepositMode?: SecurityDepositMode;
    securityDepositReference?: string;
    securityDepositDate?: string;
    securityDepositBank?: string;
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
        invItem.bwSlabRanges = appendOpenEndedSlab(item.bwSlabRanges, item.bwExcessRate);
        invItem.colorSlabRanges = appendOpenEndedSlab(item.colorSlabRanges, item.colorExcessRate);
        invItem.comboSlabRanges = appendOpenEndedSlab(
          item.comboSlabRanges,
          item.combinedExcessRate,
        );

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
    if (
      payload.pricingItems &&
      ![SaleType.SALE, SaleType.PRODUCT_SALE, SaleType.SPAREPART_SALE].includes(payload.saleType)
    ) {
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

        invoiceItem.bwSlabRanges = appendOpenEndedSlab(item.bwSlabRanges, item.bwExcessRate);
        invoiceItem.colorSlabRanges = appendOpenEndedSlab(
          item.colorSlabRanges,
          item.colorExcessRate,
        );
        invoiceItem.comboSlabRanges = appendOpenEndedSlab(
          item.comboSlabRanges,
          item.combinedExcessRate,
        );

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

      // Security Deposit (NEW)
      securityDepositAmount: payload.securityDepositAmount
        ? Number(payload.securityDepositAmount)
        : undefined,
      securityDepositMode: payload.securityDepositMode,
      securityDepositReference: payload.securityDepositReference,
      securityDepositDate: payload.securityDepositDate
        ? new Date(payload.securityDepositDate)
        : undefined,
      securityDepositBank: payload.securityDepositBank,

      totalAmount: 0, // Placeholder
      items: invoiceItems,
    });

    // 3. Finalize Amounts for SALE / LEASE / RENT
    if (
      [SaleType.SALE, SaleType.PRODUCT_SALE, SaleType.SPAREPART_SALE].includes(payload.saleType)
    ) {
      const discAmount = Number(payload.discountAmount || 0);
      const discPercent = Number(payload.discountPercent || 0);

      if (discAmount > 0) {
        invoice.discountAmount = discAmount;
        invoice.grossAmount = calculatedTotal; // Frontend sends gross/base prices
        invoice.totalAmount = calculatedTotal - discAmount;
      } else {
        invoice.grossAmount = calculatedTotal;
        invoice.discountAmount = calculatedTotal * (discPercent / 100);
        invoice.totalAmount = calculatedTotal - (invoice.discountAmount || 0);
      }
    } else if (payload.saleType === SaleType.LEASE) {
      invoice.totalAmount = Number(payload.advanceAmount || 0);
    } else {
      // Rent
      invoice.totalAmount =
        calculatedTotal === 0 ? Number(payload.advanceAmount || 0) : calculatedTotal;
    }

    await this.invoiceRepo.save(invoice);

    // Publish event if needed (maybe quotation.created later)
    try {
      // Skipping usage-based event publishing for now
    } catch (err: unknown) {
      logger.error('Failed to publish event', err);
    }

    return invoice;
  }

  /**
   * Updates an existing quotation.
   */
  async updateQuotation(
    id: string,
    payload: {
      rentType?: RentType;
      rentPeriod?: RentPeriod;
      monthlyRent?: number;
      advanceAmount?: number;
      discountPercent?: number;
      discountAmount?: number;
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

      // Security Deposit Fields
      securityDepositAmount?: number;
      securityDepositMode?: SecurityDepositMode;
      securityDepositReference?: string;
      securityDepositDate?: string;
      securityDepositBank?: string;
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
    if (payload.discountAmount !== undefined) invoice.discountAmount = payload.discountAmount;
    if (payload.effectiveFrom) invoice.effectiveFrom = new Date(payload.effectiveFrom);
    if (payload.effectiveTo) invoice.effectiveTo = new Date(payload.effectiveTo);
    if (payload.billingCycleInDays !== undefined) {
      invoice.billingCycleInDays = payload.billingCycleInDays;
    }

    // Security Deposit Update
    if (payload.securityDepositAmount !== undefined) {
      invoice.securityDepositAmount = payload.securityDepositAmount;
    }
    if (payload.securityDepositMode !== undefined) {
      invoice.securityDepositMode = payload.securityDepositMode;
    }
    if (payload.securityDepositReference !== undefined) {
      invoice.securityDepositReference = payload.securityDepositReference;
    }
    if (payload.securityDepositDate !== undefined) {
      invoice.securityDepositDate = payload.securityDepositDate
        ? new Date(payload.securityDepositDate)
        : undefined;
    }
    if (payload.securityDepositBank !== undefined) {
      invoice.securityDepositBank = payload.securityDepositBank;
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
        invItem.bwSlabRanges = appendOpenEndedSlab(item.bwSlabRanges, item.bwExcessRate);
        invItem.colorSlabRanges = appendOpenEndedSlab(item.colorSlabRanges, item.colorExcessRate);
        invItem.comboSlabRanges = appendOpenEndedSlab(
          item.comboSlabRanges,
          item.combinedExcessRate,
        );

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
        invoiceItem.bwSlabRanges = appendOpenEndedSlab(item.bwSlabRanges, item.bwExcessRate);
        invoiceItem.colorSlabRanges = appendOpenEndedSlab(
          item.colorSlabRanges,
          item.colorExcessRate,
        );
        invoiceItem.comboSlabRanges = appendOpenEndedSlab(
          item.comboSlabRanges,
          item.combinedExcessRate,
        );
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
    if (
      [SaleType.SALE, SaleType.PRODUCT_SALE, SaleType.SPAREPART_SALE].includes(invoice.saleType)
    ) {
      let calculatedTotal = 0;
      if (invoice.items && invoice.items.length > 0) {
        calculatedTotal = invoice.items.reduce(
          (sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
          0,
        );
      }
      const discAmount = Number(invoice.discountAmount || 0);
      const discPercent = Number(invoice.discountPercent || 0);

      if (discAmount > 0) {
        invoice.discountAmount = discAmount;
        invoice.grossAmount = calculatedTotal;
        invoice.totalAmount = calculatedTotal - discAmount;
      } else {
        invoice.grossAmount = calculatedTotal;
        invoice.discountAmount = calculatedTotal * (discPercent / 100);
        invoice.totalAmount = calculatedTotal - (invoice.discountAmount || 0);
      }
    } else if (invoice.saleType === SaleType.LEASE) {
      invoice.totalAmount = invoice.advanceAmount || 0;
    } else {
      // Rent
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

  /**
   * Approves a quotation (Customer/Manager) and converts to Proforma.
   */
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

  /**
   * Employee marks a quotation as ready for Finance review.
   */
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

  /**
   * Step 1: Finance allocates machines for the quotation.
   * Finalizes as a PROFORMA contract pending customer confirmation.
   */
  async allocateMachines(
    id: string,
    userId: string,
    token: string,
    itemUpdates?: { id: string; productId: string }[],
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
        throw new AppError('Only Employee Approved quotations can be allocated by Finance', 400);
      }

      // Check that all machines are allocated
      const productItems = invoice.items.filter(
        (item) => item.itemType === 'PRODUCT' && item.modelId,
      );
      const updatesMap = new Map<string, { id: string; productId: string }>();
      if (itemUpdates) itemUpdates.forEach((u) => updatesMap.set(String(u.id).toLowerCase(), u));

      for (const item of productItems) {
        const update = updatesMap.get(String(item.id).toLowerCase());
        const isAllocated = !!(item.productId || update?.productId);
        if (!isAllocated) {
          throw new AppError(
            `Machine allocation (Serial Number) is required for: ${item.description}`,
            400,
          );
        }
      }

      if (itemUpdates && itemUpdates.length > 0) {
        const inventoryServiceUrl = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3003';
        for (const update of itemUpdates) {
          const item = invoice.items.find((i) => i.id === update.id);
          if (item && update.productId) {
            let product;
            try {
              const response = await fetch(`${inventoryServiceUrl}/products/${update.productId}`, {
                headers: { Authorization: token, 'Content-Type': 'application/json' },
              });
              if (!response.ok) throw new Error(response.statusText);
              const data = await response.json();
              product = data.data;
            } catch (error) {
              logger.error(`Product validation failed: ${update.productId}`, error);
              throw new AppError(`Failed to validate product ${update.productId}`, 500);
            }

            if (!product) throw new AppError(`Product ${update.productId} not found`, 404);

            item.productId = update.productId;

            // Create basic allocation record without meter readings yet
            await queryRunner.manager.insert(ProductAllocation, {
              contractId: invoice.id,
              modelId: item.modelId,
              productId: update.productId,
              serialNumber: product.serial_no || 'Unknown',
              status: AllocationStatus.ALLOCATED,
              initialBwA4: 0,
              initialBwA3: 0,
              initialColorA4: 0,
              initialColorA3: 0,
              currentBwA4: 0,
              currentBwA3: 0,
              currentColorA4: 0,
              currentColorA3: 0,
            });
          }
        }
      }

      invoice.status = InvoiceStatus.FINANCE_APPROVED;
      invoice.type = InvoiceType.PROFORMA;
      invoice.contractStatus = ContractStatus.PENDING_CONFIRMATION;

      // We don't record financeApprovedAt until the contract is fully activated in Step 2,
      // but we record who drafted the allocation.
      invoice.financeApprovedBy = userId;

      const savedInvoice = await queryRunner.manager.save(invoice);
      await queryRunner.commitTransaction();

      // Emit status update as "ALLOCATED" to reserve stock in inventory
      // We can use the existing saleType but understand it's pre-active
      this.emitProductStatusUpdates(savedInvoice, userId);

      return savedInvoice;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Step 2: Customer confirmed the contract. Upload confirmation, record deposit & readings.
   * Activates the Contract.
   */
  async activateContract(
    id: string,
    userId: string,
    token: string,
    contractConfirmationUrl: string,
    deposit?: {
      amount: number;
      mode: SecurityDepositMode;
      reference?: string;
      receivedDate?: string;
    },
    itemUpdates?: {
      id: string;
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
      if (invoice.contractStatus !== ContractStatus.PENDING_CONFIRMATION) {
        throw new AppError('Contract is not pending confirmation', 400);
      }

      invoice.contractConfirmationUrl = contractConfirmationUrl;

      // 1. Deposit is optional — record it if provided, but don't block activation

      if (deposit && deposit.amount > 0) {
        invoice.securityDepositAmount = deposit.amount;
        invoice.securityDepositMode = deposit.mode;
        invoice.securityDepositReference = deposit.reference;
        if (deposit.receivedDate) {
          invoice.securityDepositReceivedDate = new Date(deposit.receivedDate);
        }
      }

      // 2. Process Initial Readings
      if (itemUpdates && itemUpdates.length > 0) {
        const inventoryServiceUrl = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3003';
        for (const update of itemUpdates) {
          const item = invoice.items.find((i) => i.id === update.id);
          if (item && item.productId) {
            // Check product color to enforce reading requirements
            let product;
            try {
              const response = await fetch(`${inventoryServiceUrl}/products/${item.productId}`, {
                headers: { Authorization: token, 'Content-Type': 'application/json' },
              });
              if (response.ok) {
                const data = await response.json();
                product = data.data;
              }
            } catch (error) {
              logger.error(`Product fetch failed for readings: ${item.productId}`, error);
            }

            if (invoice.saleType !== SaleType.SALE) {
              if (update.initialBwCount === undefined) {
                throw new AppError(
                  `Initial B&W reading missing for item: ${item.description}`,
                  400,
                );
              }
            }

            if (update.initialBwCount !== undefined) item.initialBwCount = update.initialBwCount;
            if (update.initialBwA3Count !== undefined)
              item.initialBwA3Count = update.initialBwA3Count;

            if (product && product.print_colour === 'BLACK_WHITE') {
              item.initialColorCount = 0;
            } else {
              if (invoice.saleType !== SaleType.SALE && update.initialColorCount === undefined) {
                throw new AppError(`Initial Color reading missing for ${item.description}`, 400);
              }
              if (update.initialColorCount !== undefined)
                item.initialColorCount = update.initialColorCount;
              if (update.initialColorA3Count !== undefined)
                item.initialColorA3Count = update.initialColorA3Count;
            }

            // Update the existing allocation record
            await queryRunner.manager.update(
              ProductAllocation,
              { contractId: invoice.id, productId: item.productId },
              {
                initialBwA4: item.initialBwCount || 0,
                initialBwA3: item.initialBwA3Count || 0,
                initialColorA4: item.initialColorCount || 0,
                initialColorA3: item.initialColorA3Count || 0,
                currentBwA4: item.initialBwCount || 0,
                currentBwA3: item.initialBwA3Count || 0,
                currentColorA4: item.initialColorCount || 0,
                currentColorA3: item.initialColorA3Count || 0,
              },
            );
          }
        }
      }

      // Final Activation
      invoice.financeApprovedAt = new Date();
      invoice.financeApprovedBy = userId;

      if (invoice.saleType === SaleType.SALE) {
        invoice.type = InvoiceType.FINAL;
        invoice.status = InvoiceStatus.PAID;
        invoice.contractStatus = ContractStatus.ACTIVE; // Set to Active for consistency
      } else {
        invoice.contractStatus = ContractStatus.ACTIVE;
        this.setEffectiveDates(invoice);
      }

      const savedInvoice = await queryRunner.manager.save(invoice);
      await queryRunner.commitTransaction();

      // Emit status updates
      this.emitProductStatusUpdates(savedInvoice, userId);

      return savedInvoice;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  private setEffectiveDates(invoice: Invoice) {
    if (!invoice.effectiveFrom) invoice.effectiveFrom = new Date();

    if (!invoice.effectiveTo) {
      if (invoice.leaseTenureMonths) {
        const leaseEnd = new Date(invoice.effectiveFrom);
        leaseEnd.setMonth(leaseEnd.getMonth() + invoice.leaseTenureMonths);
        invoice.effectiveTo = leaseEnd;
      } else {
        const startDate = new Date(invoice.effectiveFrom);
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
    }
  }

  private async emitProductStatusUpdates(
    invoice: Invoice,
    userId: string,
    overrideStatus?: 'SALE' | 'RENT' | 'LEASE' | 'RETURNED' | 'PRODUCT_SALE' | 'SPAREPART_SALE',
  ) {
    if (!invoice.items) return;

    for (const item of invoice.items) {
      if (item.productId && item.itemType === 'PRODUCT') {
        try {
          // Type-safe mapping for the inventory event
          const rawType = overrideStatus || invoice.saleType;
          let billType: 'SALE' | 'RENT' | 'LEASE' | 'RETURNED' = 'SALE';
          if (rawType === 'RENT') billType = 'RENT';
          else if (rawType === 'LEASE') billType = 'LEASE';
          else if (rawType === 'RETURNED') billType = 'RETURNED';
          else billType = 'SALE';

          await emitProductStatusUpdate({
            productId: item.productId,
            billType,
            invoiceId: invoice.id,
            approvedBy: userId,
            approvedAt: invoice.financeApprovedAt || new Date(),
          });
        } catch (error) {
          logger.error('Failed to emit product status update', {
            error,
            invoiceId: invoice.id,
            productId: item.productId,
          });
        }
      }
    }
  }

  /**
   * Finance rejects the quotation.
   */
  /**
   * Finance rejects the quotation.
   */
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

    await this.invoiceRepo.save(invoice);

    // Release any product allocations back to AVAILABLE
    const allocations = await this.invoiceRepo.manager.find(ProductAllocation, {
      where: { contractId: invoice.id, status: AllocationStatus.ALLOCATED },
    });

    if (allocations.length > 0) {
      // Mark all allocations as RETURNED in our DB
      await this.invoiceRepo.manager.update(
        ProductAllocation,
        { contractId: invoice.id, status: AllocationStatus.ALLOCATED },
        { status: AllocationStatus.RETURNED },
      );

      // Emit status-update events so ven_inv_service marks products as AVAILABLE
      for (const allocation of allocations) {
        if (!allocation.productId) continue;
        try {
          await emitProductStatusUpdate({
            productId: allocation.productId,
            billType: 'RETURNED',
            invoiceId: invoice.id,
            approvedBy: userId,
            approvedAt: invoice.financeApprovedAt,
          });
        } catch (e) {
          logger.error('Failed to emit product status update on finance reject', {
            productId: allocation.productId,
            error: e,
          });
        }
      }
    }

    return invoice;
  }

  /**
   * Retrieves all invoices, optionally filtered by branch.
   */
  /**
   * Retrieves all invoices, optionally filtered by branch.
   */
  async getAllInvoices(branchId?: string) {
    const invoices = await this.invoiceRepo.findAll(branchId);
    return Promise.all(
      invoices.map(async (invoice) => {
        const history = await this.usageRepo.getUsageHistory(invoice.id);
        const usageRevenue = history.reduce(
          (sum, u) => sum + (Number(u.monthlyRent || 0) + Number(u.exceededCharge || 0)),
          0,
        );
        const discountAmount = history.reduce((sum, u) => sum + Number(u.discountAmount || 0), 0);
        return {
          ...invoice,
          usageRevenue,
          discountAmount: Number(invoice.discountAmount || 0) || discountAmount,
        };
      }),
    );
  }

  /**
   * Retrieves invoices created by a specific user.
   */
  async getInvoicesByCreator(creatorId: string) {
    const invoices = await this.invoiceRepo.findByCreatorId(creatorId);
    return Promise.all(
      invoices.map(async (invoice) => {
        const history = await this.usageRepo.getUsageHistory(invoice.id);
        const usageRevenue = history.reduce(
          (sum, u) => sum + (Number(u.monthlyRent || 0) + Number(u.exceededCharge || 0)),
          0,
        );
        const discountAmount = history.reduce((sum, u) => sum + Number(u.discountAmount || 0), 0);
        return {
          ...invoice,
          usageRevenue,
          discountAmount: Number(invoice.discountAmount || 0) || discountAmount,
        };
      }),
    );
  }

  /**
   * Retrieves invoices for a specific branch.
   */
  /**
   * Retrieves invoices for a specific branch.
   */
  async getBranchInvoices(branchId: string) {
    const invoices = await this.invoiceRepo.findByBranchId(branchId);

    // Enrich with usageRevenue and discountAmount for stats accuracy
    const enriched = await Promise.all(
      invoices.map(async (invoice) => {
        const history = await this.usageRepo.getUsageHistory(invoice.id);
        const usageRevenue = history.reduce(
          (sum, u) => sum + (Number(u.monthlyRent || 0) + Number(u.exceededCharge || 0)),
          0,
        );
        const discountAmount = history.reduce((sum, u) => sum + Number(u.discountAmount || 0), 0);

        return {
          ...invoice,
          usageRevenue,
          discountAmount: Number(invoice.discountAmount || 0) || discountAmount,
        };
      }),
    );

    return enriched;
  }

  /**
   * Retrieves a single invoice by ID.
   */
  /**
   * Retrieves a single invoice by ID.
   */
  async getInvoiceById(id: string) {
    try {
      const invoice = await this.invoiceRepo.findById(id);
      if (!invoice) {
        throw new AppError('Invoice not found', 404);
      }

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

          const isFirstMonth = history.length === 1;
          if (isFirstMonth && invoice.advanceAmount && invoice.advanceAmount > 0) {
            invoice.advanceAdjusted = invoice.advanceAmount;
          }
        }
      }

      if (
        invoice.type === InvoiceType.FINAL &&
        invoice.referenceContractId &&
        (!invoice.items || !invoice.items.some((i) => i.itemType === ItemType.PRICING_RULE))
      ) {
        const contract = await this.invoiceRepo.findById(invoice.referenceContractId);
        if (contract) {
          if (contract.items) {
            const rules = contract.items.filter((i) => i.itemType === ItemType.PRICING_RULE);
            if (!invoice.items) invoice.items = [];
            invoice.items.push(...rules);
          }
          if (contract.productAllocations) {
            invoice.productAllocations = contract.productAllocations;
          }
        }
      }

      if (invoice.type === InvoiceType.FINAL && invoice.referenceContractId) {
        (invoice as Invoice & { invoiceHistory?: Invoice[] }).invoiceHistory =
          await this.invoiceRepo.findFinalInvoicesByContractId(invoice.referenceContractId);
      } else if (
        invoice.type === InvoiceType.PROFORMA ||
        invoice.status === InvoiceStatus.ACTIVE_LEASE
      ) {
        (invoice as Invoice & { invoiceHistory?: Invoice[] }).invoiceHistory =
          await this.invoiceRepo.findFinalInvoicesByContractId(invoice.id);

        const usageHistory = await this.usageRepo.getUsageHistory(invoice.id);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (invoice as Invoice & { usageHistory?: any[] }).usageHistory = usageHistory;
      }

      return invoice;
    } catch (error) {
      logger.error('Error in BillingService.getInvoiceById', {
        id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async completeContract(contractId: string) {
    const queryRunner = this.invoiceRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const contract = await queryRunner.manager.findOne(Invoice, { where: { id: contractId } });
      if (!contract) throw new AppError('Contract not found', 404);

      const allocations = await queryRunner.manager.find(ProductAllocation, {
        where: { contractId: contract.id, status: AllocationStatus.ALLOCATED },
      });

      if (contract.saleType === SaleType.RENT && allocations.length > 0) {
        await queryRunner.manager.update(
          ProductAllocation,
          { contractId: contract.id, status: AllocationStatus.ALLOCATED },
          { status: AllocationStatus.RETURNED },
        );
      }

      contract.contractStatus = ContractStatus.COMPLETED;
      contract.completedAt = new Date();
      await queryRunner.manager.save(contract);

      await queryRunner.commitTransaction();

      // Emit product status updates AFTER committing the transaction
      // Only revert to AVAILABLE for RENT contracts (LEASE contracts retain their status)
      if (contract.saleType === SaleType.RENT && allocations.length > 0) {
        for (const allocation of allocations) {
          if (!allocation.productId) continue;
          try {
            await emitProductStatusUpdate({
              productId: allocation.productId,
              billType: 'RETURNED',
              invoiceId: contract.id,
              approvedBy: 'SYSTEM',
              approvedAt: new Date(),
            });
          } catch (e) {
            logger.error('Failed to emit product status update for allocation', {
              productId: allocation.productId,
              error: e,
            });
          }
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
      <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 24px; color: #1e293b; line-height: 1.5;">
        <h2 style="color: #0f172a; margin-top: 0;">Quotation / Invoice Details</h2>
        <div style="font-size: 15px; color: #475569; margin-bottom: 24px;">
          ${body}
        </div>
        
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 24px; border: 1px solid #f1f5f9;">
          <h3 style="margin-top: 0; color: #dc2626; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Contract Overview</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            ${showRow('Invoice Number', contract.invoiceNumber)}
            ${showRow('Date', new Date(contract.createdAt).toLocaleDateString())}
            ${showRow('Type', contract.saleType)}
            ${showRow('Advance Amount', contract.advanceAmount ? `QAR ${contract.advanceAmount}` : undefined)}
            ${showRow('Monthly Rent', contract.monthlyRent ? `QAR ${contract.monthlyRent}` : undefined)}
            ${showRow('Rent Period', contract.rentPeriod)}
            ${showRow('Billing Cycle', contract.billingCycleInDays ? `${contract.billingCycleInDays} Days` : undefined)}
          </table>
        </div>

        <div style="margin-bottom: 24px;">
          <h3 style="color: #dc2626; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;">Itemized Breakdown</h3>
          <div style="overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; min-width: 500px;">
              <thead style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                <tr>
                  <th style="padding: 12px 8px; text-align: left; color: #64748b;">Description</th>
                  <th style="padding: 12px 8px; text-align: center; color: #64748b;">Qty</th>
                  <th style="padding: 12px 8px; text-align: right; color: #64748b;">Total</th>
                </tr>
              </thead>
              <tbody style="color: #1e293b;">
                ${
                  contract.items
                    ?.map(
                      (item) => `
                  <tr>
                    <td style="border-bottom: 1px solid #f1f5f9; padding: 12px 8px;">
                      <div style="font-weight: bold;">${item.description}</div>
                      ${item.bwIncludedLimit ? `<div style="font-size: 10px; color: #94a3b8;">Limit: ${item.bwIncludedLimit} B&W / ${item.colorIncludedLimit || 0} Color</div>` : ''}
                    </td>
                    <td style="border-bottom: 1px solid #f1f5f9; padding: 12px 8px; text-align: center;">${item.quantity || 1}</td>
                    <td style="border-bottom: 1px solid #f1f5f9; padding: 12px 8px; text-align: right; font-weight: bold;">QAR ${((item.quantity || 1) * (item.unitPrice || 0)).toFixed(2)}</td>
                  </tr>
                `,
                    )
                    .join('') ||
                  '<tr><td colspan="3" style="text-align: center; padding: 20px;">No Items</td></tr>'
                }
              </tbody>
              <tfoot style="background-color: #f8fafc; font-weight: bold; font-size: 14px;">
                 <tr>
                   <td colspan="2" style="padding: 12px 8px; text-align: right;">Total Amount</td>
                   <td style="padding: 12px 8px; text-align: right; color: #dc2626;">QAR ${Number(contract.totalAmount).toFixed(2)}</td>
                 </tr>
              </tfoot>
            </table>
          </div>
          <p style="font-size: 11px; color: #94a3b8; margin-top: 8px; font-style: italic;">* Detailed usage limits and terms are provided in the attached PDF report.</p>
        </div>
        
        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center;">
          <p style="font-size: 14px; font-weight: bold; color: #0f172a; margin-bottom: 4px;">Thank you for choosing XeroCare</p>
          <p style="font-size: 12px; color: #64748b;">This is an automated notification. Please do not reply directly to this email.</p>
        </div>
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

  /**
   * Replaces a device allocation mid-contract, effectively splitting the allocation timeline
   * and tracking meter readings correctly so usage is calculated per-allocation window.
   */
  async replaceDeviceAllocation(payload: {
    allocationId: string;
    replacementTimestamp: string;
    oldMeter: { bwA4?: number; bwA3?: number; colorA4?: number; colorA3?: number };
    newProductId: string;
    newSerialNumber: string;
    newInitialMeter: { bwA4?: number; bwA3?: number; colorA4?: number; colorA3?: number };
    reason?: string;
  }) {
    const queryRunner = this.invoiceRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const {
        allocationId,
        replacementTimestamp,
        oldMeter = {},
        newProductId,
        newSerialNumber,
        newInitialMeter = {},
        reason,
      } = payload;

      const oldAllocation = await queryRunner.manager.findOne(ProductAllocation, {
        where: { id: allocationId, status: AllocationStatus.ALLOCATED },
      });

      if (!oldAllocation) {
        throw new AppError('Active product allocation not found', 404);
      }

      // 0. Validate oldMeter reading against the latest usage record for this contract
      const latestUsageRecord = await queryRunner.manager
        .getRepository(UsageRecord)
        .createQueryBuilder('ur')
        .where('ur.contractId = :contractId', { contractId: oldAllocation.contractId })
        .orderBy('ur.billingPeriodEnd', 'DESC')
        .getOne();

      if (latestUsageRecord) {
        if (oldMeter.bwA4 !== undefined && oldMeter.bwA4 < (latestUsageRecord.bwA4Count || 0)) {
          throw new AppError(
            `Old B&W A4 meter (${oldMeter.bwA4}) cannot be lower than previously billed (${latestUsageRecord.bwA4Count})`,
            400,
          );
        }
        if (oldMeter.bwA3 !== undefined && oldMeter.bwA3 < (latestUsageRecord.bwA3Count || 0)) {
          throw new AppError(
            `Old B&W A3 meter (${oldMeter.bwA3}) cannot be lower than previously billed (${latestUsageRecord.bwA3Count})`,
            400,
          );
        }
        if (
          oldMeter.colorA4 !== undefined &&
          oldMeter.colorA4 < (latestUsageRecord.colorA4Count || 0)
        ) {
          throw new AppError(
            `Old Color A4 meter (${oldMeter.colorA4}) cannot be lower than previously billed (${latestUsageRecord.colorA4Count})`,
            400,
          );
        }
        if (
          oldMeter.colorA3 !== undefined &&
          oldMeter.colorA3 < (latestUsageRecord.colorA3Count || 0)
        ) {
          throw new AppError(
            `Old Color A3 meter (${oldMeter.colorA3}) cannot be lower than previously billed (${latestUsageRecord.colorA3Count})`,
            400,
          );
        }
      }

      const ts = new Date(replacementTimestamp);

      // 1. Close old allocation
      oldAllocation.endTimestamp = ts;
      oldAllocation.status = AllocationStatus.REPLACED;
      oldAllocation.replacementReason = reason;
      oldAllocation.currentBwA4 =
        oldMeter.bwA4 !== undefined ? oldMeter.bwA4 : oldAllocation.currentBwA4;
      oldAllocation.currentBwA3 =
        oldMeter.bwA3 !== undefined ? oldMeter.bwA3 : oldAllocation.currentBwA3;
      oldAllocation.currentColorA4 =
        oldMeter.colorA4 !== undefined ? oldMeter.colorA4 : oldAllocation.currentColorA4;
      oldAllocation.currentColorA3 =
        oldMeter.colorA3 !== undefined ? oldMeter.colorA3 : oldAllocation.currentColorA3;
      await queryRunner.manager.save(ProductAllocation, oldAllocation);

      // 2. Record final meter reading for old device
      const oldReading = queryRunner.manager.create(DeviceMeterReading, {
        serialNumber: oldAllocation.serialNumber,
        timestamp: ts,
        bwA4: oldMeter.bwA4 || 0,
        bwA3: oldMeter.bwA3 || 0,
        colorA4: oldMeter.colorA4 || 0,
        colorA3: oldMeter.colorA3 || 0,
        source: ReadingSource.MANUAL, // ReadingSource enum handles this
        invoiceId: oldAllocation.contractId,
      });
      await queryRunner.manager.save(DeviceMeterReading, oldReading);

      // 3. Create new allocation
      const newAllocation = queryRunner.manager.create(ProductAllocation, {
        contractId: oldAllocation.contractId,
        modelId: oldAllocation.modelId,
        productId: newProductId,
        serialNumber: newSerialNumber,
        status: AllocationStatus.ALLOCATED,
        startTimestamp: ts,
        initialBwA4: newInitialMeter.bwA4 || 0,
        initialBwA3: newInitialMeter.bwA3 || 0,
        initialColorA4: newInitialMeter.colorA4 || 0,
        initialColorA3: newInitialMeter.colorA3 || 0,
        currentBwA4: newInitialMeter.bwA4 || 0,
        currentBwA3: newInitialMeter.bwA3 || 0,
        currentColorA4: newInitialMeter.colorA4 || 0,
        currentColorA3: newInitialMeter.colorA3 || 0,
        replacementOfAllocationId: oldAllocation.id,
      });
      await queryRunner.manager.save(ProductAllocation, newAllocation);

      // 4. Record initial meter reading for new device
      const newReading = queryRunner.manager.create(DeviceMeterReading, {
        serialNumber: newSerialNumber,
        timestamp: ts,
        bwA4: newInitialMeter.bwA4 || 0,
        bwA3: newInitialMeter.bwA3 || 0,
        colorA4: newInitialMeter.colorA4 || 0,
        colorA3: newInitialMeter.colorA3 || 0,
        source: ReadingSource.MANUAL,
        invoiceId: oldAllocation.contractId,
      });
      await queryRunner.manager.save(DeviceMeterReading, newReading);

      // Fetch invoice for updating InvoiceItems
      const invoice = await queryRunner.manager.findOne(Invoice, {
        where: { id: oldAllocation.contractId },
        relations: ['items'],
      });

      if (invoice && invoice.items) {
        // Find the item that matches the old product
        const itemIndex = invoice.items.findIndex((i) => i.productId === oldAllocation.productId);
        if (itemIndex !== -1) {
          const item = invoice.items[itemIndex];
          item.productId = newProductId;
          // Note: serialNumber is not a property of InvoiceItem, we only update productId and modelId
          // If the new product has a different model, update it
          item.modelId = oldAllocation.modelId; // Assuming model stays same for now, but we can update if needed
          // Description might need update if it contains the old Serial Number
          if (item.description.includes(oldAllocation.serialNumber)) {
            item.description = item.description.replace(
              oldAllocation.serialNumber,
              newSerialNumber,
            );
          }
          await queryRunner.manager.save(InvoiceItem, item);
        }
      }

      await queryRunner.commitTransaction();

      // Emit events to update inventory status (Return old, Allocate new)
      // We do this AFTER commit to ensure database consistency
      if (oldAllocation.productId) {
        emitProductStatusUpdate({
          productId: oldAllocation.productId,
          billType: 'RETURNED',
          invoiceId: oldAllocation.contractId,
          approvedBy: 'SYSTEM',
          approvedAt: ts,
        }).catch((err) => logger.error('Failed to emit RETURNED event', err));
      }
      if (newAllocation.productId) {
        emitProductStatusUpdate({
          productId: newAllocation.productId,
          billType: invoice?.saleType === 'LEASE' ? 'LEASE' : 'RENT',
          invoiceId: newAllocation.contractId,
          approvedBy: 'SYSTEM',
          approvedAt: ts,
        }).catch((err) => logger.error('Failed to emit LEASE/RENT event', err));
      }

      return newAllocation;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
