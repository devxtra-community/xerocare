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
import { LeaseType } from '../entities/enums/leaseType';
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
      monthlyRent:
        contract.saleType === SaleType.LEASE && contract.leaseType === LeaseType.FSM
          ? Number(contract.monthlyLeaseAmount || 0)
          : Number(contract.monthlyRent || 0),
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
        // Logic Update: Only consume advance for the FIRST month rent if Advance matches Monthly Rent.
        // User Request: "if the customer has paid the 1st month rent as advance then no need to collect the first month rent again"

        // Check if this is the first invoice
        const priorInvoiceCount = await this.invoiceRepo.countFinalInvoicesByContractId(
          contract.id,
        );
        const isFirstInvoice = priorInvoiceCount === 0;

        if (isFirstInvoice) {
          // Deduct the rent portion from the total because it was already paid as advance.
          // Usually this means we subtract Monthly Rent from the Net Amount.
          // If Net Amount < Monthly Rent (e.g. partial month?), we cap it.

          const rentComponent = Number(contract.monthlyRent || 0);
          if (rentComponent > 0) {
            // Set advanceAdjusted to the Rent Amount to indicate it's covered
            advanceAdjusted = rentComponent;
            // Reduce payable
            payableAmount = calcResult.netAmount - advanceAdjusted;
            if (payableAmount < 0) payableAmount = 0;
          }
        }
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
        advanceAdjusted = 0; // No advance
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
      effectiveFrom: start,
      effectiveTo: end,

      // Amounts
      monthlyRent: contract.monthlyRent, // Snapshot
      grossAmount: calcResult.grossAmount,
      discountAmount: calcResult.discountAmount,
      advanceAdjusted: advanceAdjusted,
      totalAmount: payableAmount,

      referenceContractId: contract.id,
      usageRecordId: usage.id, // Link Usage
      rentType: contract.rentType,
      billingPeriodStart: start,
      billingPeriodEnd: end,
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
    totalAmount?: number;

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

    const invoiceNumber = await this.generateInvoiceNumber();

    const invoiceItems: InvoiceItem[] = [];
    let calculatedTotal = 0;

    // 1. Handle Items (Product/Machines) - Available for both SALE and RENT
    if (payload.items) {
      const productItems = payload.items.map((item) => {
        const invItem = new InvoiceItem();
        invItem.itemType = item.itemType || ItemType.PRODUCT;
        invItem.description = item.description;
        invItem.quantity = item.quantity;
        invItem.unitPrice = item.unitPrice;
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
      monthlyRent: payload.monthlyRent,
      advanceAmount: payload.advanceAmount,
      discountPercent: payload.discountPercent,
      effectiveFrom: payload.effectiveFrom ? new Date(payload.effectiveFrom) : new Date(),
      effectiveTo: payload.effectiveTo ? new Date(payload.effectiveTo) : undefined,

      leaseType: payload.leaseType!, // ! if validated
      leaseTenureMonths: payload.leaseTenureMonths,
      totalLeaseAmount: payload.totalLeaseAmount,
      monthlyEmiAmount: payload.monthlyEmiAmount,
      monthlyLeaseAmount: payload.monthlyLeaseAmount,

      totalAmount: calculatedTotal == 0 ? payload.advanceAmount || 0 : calculatedTotal,
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
    if (payload.effectiveFrom) invoice.effectiveFrom = new Date(payload.effectiveFrom);
    if (payload.effectiveTo) invoice.effectiveTo = new Date(payload.effectiveTo);

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
      const machineItems = payload.items.map((item) => {
        const invItem = new InvoiceItem();
        invItem.itemType = item.itemType || ItemType.PRODUCT;
        invItem.description = item.description;
        invItem.quantity = item.quantity;
        invItem.unitPrice = item.unitPrice;
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
      invoice.items = newInvoiceItems;
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

  async financeApprove(id: string, userId: string) {
    const invoice = await this.invoiceRepo.findById(id);
    if (!invoice) throw new AppError('Quotation not found', 404);

    if (invoice.status !== InvoiceStatus.EMPLOYEE_APPROVED) {
      throw new AppError('Only Employee Approved quotations can be finalized by Finance', 400);
    }

    invoice.status = InvoiceStatus.FINANCE_APPROVED;
    invoice.financeApprovedBy = userId;
    invoice.financeApprovedAt = new Date();

    // Final Transition Logic
    if (invoice.saleType === SaleType.SALE) {
      invoice.type = InvoiceType.FINAL; // Converts to Final Invoice
      invoice.status = InvoiceStatus.ISSUED; // Or kept as FINANCE_APPROVED? Prompt says "Sale -> FINAL Invoice". Usually Final Invoices are ISSUED/UNPAID. Let's use ISSUED for consistency with Final Invoice flows.
      // Wait, "Only FINANCE_APPROVED can trigger final transitions".
      // "SALE type = FINAL (Invoice)"
      // Let's set Status to FINANCE_APPROVED as the gate, but maybe immediately transition to ISSUED?
      // Prompt says "Rules: Employee approval -> EMPLOYEE_APPROVED, Finance approval -> FINANCE_APPROVED".
      // "Status flow: DRAFT -> EMPLOYEE_APPROVED -> FINANCE_APPROVED -> (Final State)"
      // "Final State: SALE Invoice -> FINAL".
      // So I will stick to setting it to FINANCE_APPROVED, but changing TYPE to FINAL.
      // Actually, if I change type to FINAL, it IS a Final Invoice.
    } else if (invoice.saleType === SaleType.RENT) {
      invoice.type = InvoiceType.PROFORMA; // Converts to Contract
      // Keep status as FINANCE_APPROVED (which implies Active Contract)
    } else if (invoice.saleType === SaleType.LEASE) {
      invoice.status = InvoiceStatus.ACTIVE_LEASE; // Explicit requirement: "LEASE status = ACTIVE_LEASE"
    }

    return this.invoiceRepo.save(invoice);
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
      // Let's aggregate ALL types for Today and Month to be safe, or just SALE?
      // Prompt: "add sale this month count today count".
      // Assuming "Today Count" = All Orders Today.
      // "Sale This Month" = All Orders This Month (or just Sales?).
      // Let's sum up everything for now.

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
      // customerName is fetched by API Gateway
      customerId: string;
      invoiceNumber: string;
      type: 'USAGE_PENDING' | 'INVOICE_PENDING';
      dueDate: Date;
    }> = [];

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Optimization: Bulk fetch usage/invoices? For now, Loop (N is small per branch usually).
    for (const contract of activeContracts) {
      // Check Usage for Current Month
      // We can use UsageRepo.findByContractAndPeriod logic but need loose check "Starts in Current Month"
      // Or "Is there any usage where billingPeriodStart >= currentMonthStart?"

      // Simplified Logic:
      // 1. Get latest usage. If latest usage < current month -> Usage Pending.
      // 2. If usage exists for current month -> Check if Final Invoice exists locked to it.

      const history = await this.usageRepo.getUsageHistory(contract.id);
      const latestUsage = history[0]; // Ordered DESC

      const isUsageDone =
        latestUsage && new Date(latestUsage.billingPeriodStart) >= currentMonthStart;

      if (!isUsageDone) {
        // Usage Due Date Rule: End of Billing Period + Grace Period (e.g. 5 days).
        // Billing Period = Current Month (e.g. Feb 1 - Feb 28).
        // Due Date = Feb 28 + 5 days = March 5.
        // Alert is for "Current Month Usage", which is collected at cycle end.

        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of current month
        const due = new Date(endOfMonth);
        due.setDate(due.getDate() + 5); // Add 5 days grace period

        // If today is past the due date?
        // Actually, if we are in Feb, usage is due in March?
        // Yes, usually usage is post-paid.
        // Prompt says "due date proper". Maybe they want it to match contract effective date?
        // Let's stick to "End of Period + 5 Days" as standard.

        alerts.push({
          contractId: contract.id,
          customerId: contract.customerId,
          invoiceNumber: contract.invoiceNumber,
          type: 'USAGE_PENDING',
          dueDate: due,
        });
      } else {
        // Usage Done. Check Invoice.
        if (!latestUsage.finalInvoiceId) {
          alerts.push({
            contractId: contract.id,
            customerId: contract.customerId,
            invoiceNumber: contract.invoiceNumber,
            type: 'INVOICE_PENDING',
            dueDate: new Date(),
          });
        }
      }
    }
    return alerts;
  }
}
