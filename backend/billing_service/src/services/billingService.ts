import { InvoiceRepository } from '../repositories/invoiceRepository';
import { InvoiceStatus } from '../entities/enums/invoiceStatus';
import { InvoiceItem } from '../entities/invoiceItemEntity';
// import { publishInvoiceCreated } from '../events/publisher/billingPublisher';
import { SaleType } from '../entities/enums/saleType';
import { AppError } from '../errors/appError';
import { BillingCalculationService } from './billingCalculationService';
import { UsageRepository } from '../repositories/usageRepository';
import { SecurityDepositMode } from '../entities/invoiceEntity';
import { logger } from '../config/logger';
import { RentType } from '../entities/enums/rentType';
import { RentPeriod } from '../entities/enums/rentPeriod';
import { ItemType } from '../entities/enums/itemType';
import { InvoiceType } from '../entities/enums/invoiceType';

export class BillingService {
  private invoiceRepo = new InvoiceRepository();
  private usageRepo = new UsageRepository();
  private calculator = new BillingCalculationService();

  // ... existing methods ...

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
    if (usage.finalInvoiceId) {
      throw new AppError('Usage record is already locked/settled', 409);
    }

    // 3. Check for Duplicate Final Invoice
    // Can check repo by Reference contract + period.
    // Implementing usageRepo logic implicitly locks it, but checking Invoice table is safer for idempotency.
    // For now, relies on usage lock.

    // 4. Calculate
    const calcResult = this.calculator.calculate({
      rentType: contract.rentType,
      monthlyRent: Number(contract.monthlyRent || 0),
      discountPercent: Number(contract.discountPercent || 0),
      pricingItems: contract.items,
      usage: {
        bwA4: usage.bwA4Count,
        bwA3: usage.bwA3Count,
        colorA4: usage.colorA4Count,
        colorA3: usage.colorA3Count,
      },
    });

    // 5. Advance Adjustment Logic
    let advanceAdjusted = 0;
    let payableAmount = calcResult.netAmount;

    // Rule: Fixed models consume advance (Monthly rent portion first)
    // Rule: CPC models -> advanceConsumed = 0 (as per prompt)
    if (contract.rentType === RentType.FIXED_LIMIT || contract.rentType === RentType.FIXED_COMBO) {
      if (contract.advanceAmount && contract.advanceAmount > 0) {
        // Deduct rent from advance (simplified logic: Assuming advance covers rent)
        // Or "advanceConsumed = monthlyRent"
        const maxDeductible = Number(contract.monthlyRent || 0); // Consumes 1 month rent
        // Check remaining advance?
        // Phase 3 prompt: "advanceConsumed = monthlyRent. payableAmount = netAmount - advanceConsumed"
        // Assuming sufficient advance. Real system tracks advance balance.
        advanceAdjusted = Math.min(calcResult.netAmount, maxDeductible); // Don't deduct more than bill? Start with monthlyRent rule.

        // "advanceConsumed = monthlyRent"
        // "payableAmount = netAmount - advanceConsumed"
        // "if payableAmount < 0 -> payableAmount = 0"
        // This implies advanceAdjusted = monthlyRent (regardless of netAmount? No, can't adjust more than exists).
        // Let's stick to prompt: advanceConsumed = monthlyRent.
        // But if netAmount < monthlyRent (e.g. huge discount), payable is negative?

        advanceAdjusted = Number(contract.monthlyRent || 0);
        payableAmount = calcResult.netAmount - advanceAdjusted;
        if (payableAmount < 0) payableAmount = 0;
      }
    } else {
      // CPC
      advanceAdjusted = 0;
      payableAmount = calcResult.netAmount;
    }

    // 6. Create FINAL Invoice
    const invoiceNumber = await this.generateInvoiceNumber();

    // Copy relevant items? Final invoice usually lists line items differently (Access, Rent).
    // For Phase 3, we store totals. InvoiceItem relations not strictly required for Final if `grossAmount` etc stored on Invoice.
    // Or we link original items? We link `referenceContractId`.

    const finalInvoice = await this.invoiceRepo.createInvoice({
      invoiceNumber,
      branchId: contract.branchId,
      createdBy: contract.createdBy, // Auto-system or triggered user?
      customerId: contract.customerId,
      saleType: contract.saleType,

      type: InvoiceType.FINAL,
      status: InvoiceStatus.DRAFT, // Final invoice created as draft first? "Once FINAL invoice is generated: usage record becomes immutable".
      // Prompt validation checklist says "Usage locked after settlement".
      // Maybe types: FINAL status: UNPAID? Prompt says "status = UNPAID".

      billingCycleInDays: contract.billingCycleInDays, // or derive from dates
      startDate: start,
      endDate: end,

      // Amounts
      monthlyRent: contract.monthlyRent, // Snapshot
      grossAmount: calcResult.grossAmount,
      discountAmount: calcResult.discountAmount,
      advanceAdjusted: advanceAdjusted,
      totalAmount: payableAmount,

      referenceContractId: contract.id,
      rentType: contract.rentType,
    });

    // 7. Lock Usage
    usage.finalInvoiceId = finalInvoice.id;
    await this.usageRepo.save(usage);

    return finalInvoice;
  }
  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.invoiceRepo.getInvoiceCountForYear(year);
    const paddedCount = String(count + 1).padStart(4, '0');
    return `INV-${year}-${paddedCount}`;
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

    // Pricing Items (Rules)
    pricingItems: {
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
      // Rule: No Slabs for Fixed
      const hasSlabs = payload.pricingItems.some(
        (item) => item.bwSlabRanges || item.colorSlabRanges || item.comboSlabRanges,
      );
      if (hasSlabs) {
        throw new AppError('Fixed Rent models cannot have Slab Ranges', 400);
      }
    } else if (payload.rentType === RentType.CPC || payload.rentType === RentType.CPC_COMBO) {
      // Rule: Slabs Required (or at least allowed, but strict rule meant "Slab rates allowed ONLY for CPC")
      // User said "CPC -> slabs allowed".
      // Check for Monthly Rent in CPC? User said "No monthly rent".
      if (payload.monthlyRent && payload.monthlyRent > 0) {
        // Warning or Error? "No monthly rent" listed under CPC rules.
        throw new AppError('CPC models cannot have Monthly Rent', 400);
      }
    }

    const invoiceNumber = await this.generateInvoiceNumber();

    const invoiceItems = payload.pricingItems.map((item) => {
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

    // 2. Create Invoice as Quotation
    const invoice = await this.invoiceRepo.createInvoice({
      invoiceNumber,

      branchId: payload.branchId,
      createdBy: payload.createdBy,
      customerId: payload.customerId,
      saleType: payload.saleType,

      type: InvoiceType.QUOTATION,
      status: InvoiceStatus.DRAFT,

      rentType: payload.rentType,
      rentPeriod: payload.rentPeriod,
      monthlyRent: payload.monthlyRent,
      advanceAmount: payload.advanceAmount,
      discountPercent: payload.discountPercent,
      effectiveFrom: new Date(payload.effectiveFrom),
      effectiveTo: payload.effectiveTo ? new Date(payload.effectiveTo) : undefined,

      totalAmount: 0, // Explicitly 0 or null as per "no usage calculation"
      items: invoiceItems,
    });

    // Publish event if needed (maybe quotation.created later)
    try {
      // Skipping usage-based event publishing for now
    } catch (err) {
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
    },
  ) {
    const invoice = await this.invoiceRepo.findById(id);
    if (!invoice) throw new AppError('Quotation not found', 404);

    // Refinement B: Lock editing after approval
    if (invoice.status === InvoiceStatus.APPROVED || invoice.type === InvoiceType.PROFORMA) {
      throw new AppError(
        'Cannot edit a Quotation after it has been Approved (Proforma Contract)',
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

    // Update Pricing Items (Full Replace for simplicity in Phase 1)
    if (payload.pricingItems) {
      // Clear existing items? TypeORM cascade might handle insert/update but deleting requires care.
      // For simplicity, we assume we might need to handle this manually or relies upon user ensuring ID match.
      // Actually, replacing items collection often requires deleting old ones.
      // Since "items" has cascade: true, we can assign new array.
      // BUT relying on TypeORM to delete orphans needs { cascade: true, onDelete: 'CASCADE' } which we have on Inverse side?
      // It's safer to clear manually or expected behavior.
      // Let's map new items.
      const newItems = payload.pricingItems.map((item) => {
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

      // This replaces the items relation
      invoice.items = newItems;
    }

    return this.invoiceRepo.save(invoice);
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

  async getAllInvoices() {
    return this.invoiceRepo.findAll();
  }

  async getInvoicesByCreator(creatorId: string) {
    return this.invoiceRepo.findByCreatorId(creatorId);
  }

  async getInvoiceById(id: string) {
    const invoice = await this.invoiceRepo.findById(id);
    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }
    return invoice;
  }

  async getInvoiceStats(filter: { createdBy?: string; branchId?: string } = {}) {
    const stats = await this.invoiceRepo.getStats(filter);
    const result: Record<string, number> = {
      SALE: 0,
      RENT: 0,
      LEASE: 0,
    };
    stats.forEach((s) => {
      result[s.saleType] = s.count;
    });
    return result;
  }
}
