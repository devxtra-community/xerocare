import { EntityManager } from 'typeorm';
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
import { ContractStatus } from '../entities/enums/contractStatus';
import { ProductAllocation, AllocationStatus } from '../entities/productAllocationEntity';

interface ItemUpdate {
  id: string;
  productId?: string;
  initialBwCount?: number;
  initialColorCount?: number;
  initialBwA3Count?: number;
  initialColorA3Count?: number;
}

export class BillingService {
  private invoiceRepo = new InvoiceRepository();
  private usageRepo = new UsageRepository();
  private calculator = new BillingCalculationService();

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
    const finalTotal = totalMonthlyRent + totalExceededCharge;

    // 4. Update Contract to become the FINAL Invoice
    contract.contractStatus = ContractStatus.COMPLETED;
    contract.type = InvoiceType.FINAL;
    contract.status = InvoiceStatus.ISSUED;
    contract.completedAt = new Date();

    contract.grossAmount = finalTotal;
    contract.totalAmount = finalTotal;

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
   * Finance approves the quotation, finalizing it for contract creation.
   */
  async financeApprove(
    id: string,
    userId: string,
    token: string,
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

      await this.validateAllocations(invoice, itemUpdates, deposit);

      if (itemUpdates && itemUpdates.length > 0) {
        await this.processItemUpdates(queryRunner.manager, invoice, itemUpdates, token);
      }

      // Security Deposit
      if (deposit) {
        invoice.securityDepositAmount = deposit.amount;
        invoice.securityDepositMode = deposit.mode;
        invoice.securityDepositReference = deposit.reference;
        if (deposit.receivedDate) {
          invoice.securityDepositReceivedDate = new Date(deposit.receivedDate);
        }
      }

      invoice.status = InvoiceStatus.FINANCE_APPROVED;
      invoice.financeApprovedBy = userId;
      invoice.financeApprovedAt = new Date();

      // Final Transition
      if (invoice.saleType === SaleType.SALE) {
        invoice.type = InvoiceType.FINAL;
        invoice.status = InvoiceStatus.ISSUED;
      } else {
        // Rent or Lease
        invoice.type = InvoiceType.PROFORMA;
        invoice.contractStatus = ContractStatus.ACTIVE;
        this.setEffectiveDates(invoice);
      }

      const savedInvoice = await queryRunner.manager.save(invoice);
      await queryRunner.commitTransaction();

      // Post-transaction events
      this.emitProductStatusUpdates(savedInvoice, userId);

      return savedInvoice;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // Private Helper Methods

  private async validateAllocations(
    invoice: Invoice,
    itemUpdates: ItemUpdate[] | undefined,
    deposit: { amount?: number } | undefined,
  ) {
    // 1. Ensure Deposit for Non-Lease
    if (invoice.saleType !== SaleType.LEASE) {
      if (!deposit || !deposit.amount || deposit.amount <= 0) {
        throw new AppError('Security Deposit is mandatory for Rent and Sale contracts', 400);
      }
    }

    // 2. Validate Product Allocations
    const productItems = invoice.items.filter((item) => item.itemType === 'PRODUCT');
    const updatesMap = new Map<
      string,
      { id: string; productId?: string; initialBwCount?: number }
    >();
    if (Array.isArray(itemUpdates)) {
      itemUpdates.forEach((u) => updatesMap.set(String(u.id).toLowerCase().trim(), u));
    }

    for (const item of productItems) {
      const itemKey = String(item.id).toLowerCase().trim();
      const update = updatesMap.get(itemKey);
      const isAllocated = !!(item.productId || update?.productId);

      if (!isAllocated && item.modelId) {
        throw new AppError(
          `Machine allocation (Serial Number) is required for: ${item.description}`,
          400,
        );
      }

      const bwCount =
        update?.initialBwCount !== undefined ? update.initialBwCount : item.initialBwCount;
      if (bwCount === undefined || bwCount === null) {
        throw new AppError(`Initial B&W reading missing for item: ${item.description}`, 400);
      }
    }
  }

  private async processItemUpdates(
    manager: EntityManager,
    invoice: Invoice,
    itemUpdates: ItemUpdate[],
    token: string,
  ) {
    const inventoryServiceUrl = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3003';

    for (const update of itemUpdates) {
      const item = invoice.items.find((i) => i.id === update.id);
      if (item) {
        // Fetch Product
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
        if (!product.print_colour)
          throw new AppError(
            `Product capability undefined for ${product.serial_no || update.productId}`,
            400,
          );

        // Update Item
        item.productId = update.productId;
        if (update.initialBwCount !== undefined) item.initialBwCount = update.initialBwCount;
        if (update.initialBwA3Count !== undefined) item.initialBwA3Count = update.initialBwA3Count;

        if (product.print_colour === 'BLACK_WHITE') {
          item.initialColorCount = 0;
        } else {
          if (update.initialColorCount === undefined) {
            throw new AppError(`Initial Color reading missing for ${product.serial_no}`, 400);
          }
          item.initialColorCount = update.initialColorCount;
          if (update.initialColorA3Count !== undefined)
            item.initialColorA3Count = update.initialColorA3Count;
        }

        // Create Allocation Record
        await manager.insert(ProductAllocation, {
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

  private async emitProductStatusUpdates(invoice: Invoice, userId: string) {
    if (!invoice.items) return;

    for (const item of invoice.items) {
      if (item.productId && item.itemType === 'PRODUCT') {
        try {
          await emitProductStatusUpdate({
            productId: item.productId,
            billType: invoice.saleType,
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

    return this.invoiceRepo.save(invoice);
  }

  /**
   * Retrieves all invoices, optionally filtered by branch.
   */
  /**
   * Retrieves all invoices, optionally filtered by branch.
   */
  async getAllInvoices(branchId?: string) {
    return this.invoiceRepo.findAll(branchId);
  }

  /**
   * Retrieves invoices created by a specific user.
   */
  async getInvoicesByCreator(creatorId: string) {
    return this.invoiceRepo.findByCreatorId(creatorId);
  }

  /**
   * Retrieves invoices for a specific branch.
   */
  /**
   * Retrieves invoices for a specific branch.
   */
  async getBranchInvoices(branchId: string) {
    return this.invoiceRepo.findByBranchId(branchId);
  }

  /**
   * Retrieves a single invoice by ID.
   */
  /**
   * Retrieves a single invoice by ID.
   */
  async getInvoiceById(id: string) {
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
      if (contract && contract.items) {
        const rules = contract.items.filter((i) => i.itemType === ItemType.PRICING_RULE);
        if (!invoice.items) invoice.items = [];
        invoice.items.push(...rules);
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

      if (allocations.length > 0) {
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

      if (allocations.length > 0) {
        try {
          const channel = await getRabbitChannel();
          if (channel) {
            const eventPayload = {
              contractId: contract.id,
              allocations: allocations.map((a: ProductAllocation) => ({
                productId: a.productId,
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
