import { InvoiceRepository } from '../repositories/invoiceRepository';
import { In, Raw } from 'typeorm';
import { Source } from '../config/dataSource';
import { logAudit } from './auditLogService';
import { QuotationTemplateAssignment } from '../entities/quotationTemplateAssignmentEntity';
import { PaymentTransaction } from '../entities/paymentTransactionEntity';
import { InvoiceLedger } from '../entities/invoiceLedgerEntity';
// import { getRabbitChannel } from '../config/rabbitmq';
import { InvoiceStatus } from '../entities/enums/invoiceStatus';
import { InvoiceItem } from '../entities/invoiceItemEntity';
// import { publishInvoiceCreated } from '../events/publisher/billingPublisher';
import { SaleType } from '../entities/enums/saleType';
import { AppError } from '../errors/appError';
import { BillingCalculationService } from './billingCalculationService';
import { UsageRepository } from '../repositories/usageRepository';
import { SecurityDepositMode, Invoice } from '../entities/invoiceEntity';
import { ReturnCreditRepository } from '../repositories/returnCreditRepository';
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
import { PaymentMode } from '../entities/paymentLedgerEntity';
import {
  emitProductAllocate,
  emitSparePartReduce,
} from '../events/publisher/inventoryEventPublisher';
import { BillType } from '../entities/enums/billType';
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
  private returnCreditRepo = new ReturnCreditRepository();

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
    userId?: string,
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

    const saved = await this.invoiceRepo.saveInvoice(invoice);
    await logAudit(
      invoice.id,
      'STATUS_CHANGE',
      userId || 'SYSTEM',
      `Updated meter readings: BW A4: ${payload.bwA4Count}, BW A3: ${payload.bwA3Count}, Color A4: ${payload.colorA4Count}, Color A3: ${payload.colorA3Count}.`,
    );
    return saved;
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
    contract.status = InvoiceStatus.INVOICED;
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
            customerId: null,
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

  private async validateQuotationDiscounts(
    items?: Array<{
      productId?: string;
      modelId?: string;
      sparePartId?: string;
      discountAmount?: number;
      description?: string;
    }>,
  ) {
    if (!items || items.length === 0) return;

    const inventoryServiceUrl = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3003';

    const { sign } = await import('jsonwebtoken');
    const token = sign(
      { userId: 'billing_service', role: 'ADMIN' },
      process.env.ACCESS_SECRET as string,
      { expiresIn: '1m' },
    );

    for (const item of items) {
      const discount = Number(item.discountAmount || 0);
      if (discount <= 0) continue;

      let maxDiscount = 0;
      let name = item.description || 'Product';

      if (item.productId) {
        try {
          const response = await fetch(`${inventoryServiceUrl}/products/${item.productId}`, {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          });
          if (response.ok) {
            const data = await response.json();
            const product = data.data;
            if (product) {
              maxDiscount = Number(product.max_discount_amount || 0);
              name = product.name || name;
            }
          }
        } catch (error) {
          logger.error(`Product fetch failed for discount validation: ${item.productId}`, error);
        }
      } else if (item.modelId) {
        try {
          const response = await fetch(`${inventoryServiceUrl}/models/${item.modelId}`, {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          });
          if (response.ok) {
            const data = await response.json();
            const model = data.data;
            if (model) {
              maxDiscount = Number(model.maxDiscountableAmount || 0);
              name = model.model_name || model.name || name;
            }
          }
        } catch (error) {
          logger.error(`Model fetch failed for discount validation: ${item.modelId}`, error);
        }
      } else if (item.sparePartId) {
        try {
          const response = await fetch(`${inventoryServiceUrl}/spare-parts/${item.sparePartId}`, {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          });
          if (response.ok) {
            const data = await response.json();
            const sparePart = data.data;
            if (sparePart) {
              maxDiscount = Number(sparePart.maxDiscountableAmount || 0);
              name = sparePart.part_name || sparePart.name || name;
            }
          }
        } catch (error) {
          logger.error(
            `Spare part fetch failed for discount validation: ${item.sparePartId}`,
            error,
          );
        }
      }

      if (discount > maxDiscount) {
        throw new AppError(
          `Discount of QAR ${discount} exceeds maximum allowed discount of QAR ${maxDiscount} for ${name}`,
          400,
        );
      }
    }
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
    validityDays?: number;

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
      discountAmount?: number;
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
    layoutId?: string;
    notes?: string;
  }) {
    if (payload.items) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload.items.forEach((item: any) => {
        if (item.itemType === 'SPAREPART' || item.itemType === 'SPARE_PART') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          item.itemType = 'SPARE_PART' as any;
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          item.itemType = 'PRODUCT' as any;
        }
      });
    }

    // 1. Validation Logic

    await this.validateQuotationDiscounts(payload.items);

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
        invItem.sparePartId = item.sparePartId; // Spare Part reference (if SPAREPART_SALE)

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

    const valDays = payload.validityDays !== undefined ? Number(payload.validityDays) : 30;
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + valDays);

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      layoutId: payload.layoutId || (payload as any).layout_id,
      notes: payload.notes,

      totalAmount: 0, // Placeholder
      items: invoiceItems,

      validityDays: valDays,
      expiryDate: expDate,
      isConverted: false,
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

    await logAudit(
      invoice.id,
      'CREATION',
      payload.createdBy,
      `Created quotation ${invoice.invoiceNumber}`,
    );

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

      // Additional Fields for Templates / Edit Mode
      layoutId?: string;
      notes?: string;
      maxDiscountAllowed?: number;
      branchId?: string;
      saleType?: SaleType;

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
        discountAmount?: number;
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
      invoice.status === InvoiceStatus.FINANCE_APPROVED ||
      (invoice.status as string) === 'APPROVED' ||
      invoice.type === InvoiceType.PROFORMA
    ) {
      throw new AppError(
        'Cannot edit a Quotation after it has been finalized/approved by Finance',
        400,
      );
    }

    await this.validateQuotationDiscounts(payload.items);

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
    if (payload.layoutId !== undefined) invoice.layoutId = payload.layoutId;
    if (payload.notes !== undefined) invoice.notes = payload.notes;
    if (payload.maxDiscountAllowed !== undefined) {
      invoice.maxDiscountAllowed = Number(payload.maxDiscountAllowed);
    }
    if (payload.branchId !== undefined) invoice.branchId = payload.branchId;
    if (payload.saleType !== undefined) invoice.saleType = payload.saleType;

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
    await logAudit(
      invoice.id,
      'UPDATE',
      invoice.createdBy || 'SYSTEM',
      `Updated quotation ${invoice.invoiceNumber}`,
    );

    if (invoice.isTemplate && invoice.createdBy) {
      try {
        const { NotificationPublisher } = await import('../events/publisher/notificationPublisher');
        const { getProductNamesFromInvoice } = await import('./billingHelpers');
        const { TEMPLATE_EDITED } = await import('../constants/notificationTypes');

        await NotificationPublisher.publishInAppRequest({
          recipientId: invoice.createdBy,
          title: 'Quotation Template Updated',
          message: `Your quotation template for ${getProductNamesFromInvoice(invoice)} has been updated successfully.`,
          type: TEMPLATE_EDITED,
          referenceId: invoice.id,
          referenceType: 'TEMPLATE',
        });
      } catch (err) {
        logger.error('Failed to send notification for updateQuotation template edit', err);
      }
    }

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
    userId?: string,
  ) {
    const invoice = await this.invoiceRepo.findById(id);
    if (!invoice) {
      throw new AppError('Quotation not found', 404);
    }

    if (invoice.status !== InvoiceStatus.SENT && invoice.status !== InvoiceStatus.DRAFT) {
      // Can we approve DRAFT directly? Usually DRAFT -> SENT -> APPROVED.
      // User said: "send quotation: update status -> SENT", "approve quotation: update status -> APPROVED, type -> PROFORMA".
    }

    const oldStatus = invoice.status;

    // Update to PROFORMA (Rent Contract)
    invoice.status = InvoiceStatus.FINANCE_APPROVED;
    invoice.type = InvoiceType.PROFORMA;

    if (invoice.saleType === SaleType.LEASE) {
      // LEASE: No Security Deposit Logic
      const saved = await this.invoiceRepo.save(invoice);
      await logAudit(
        invoice.id,
        'STATUS_CHANGE',
        userId || 'CUSTOMER',
        `Approved quotation and converted to Proforma.`,
        oldStatus,
        InvoiceStatus.FINANCE_APPROVED,
      );
      return saved;
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

    const saved = await this.invoiceRepo.save(invoice);
    await logAudit(
      invoice.id,
      'STATUS_CHANGE',
      userId || 'CUSTOMER',
      `Approved quotation and converted to Proforma. Deposit: QAR ${deposit?.amount || 0}.`,
      oldStatus,
      InvoiceStatus.FINANCE_APPROVED,
    );
    return saved;
  }

  async updateStatus(id: string, status: InvoiceStatus, userId?: string) {
    // Generic status update (e.g. DRAFT -> SENT)
    const invoice = await this.invoiceRepo.findById(id);
    if (!invoice) throw new AppError('Invoice not found', 404);

    const oldStatus = invoice.status;
    invoice.status = status;
    const saved = await this.invoiceRepo.save(invoice);
    await logAudit(
      invoice.id,
      'STATUS_CHANGE',
      userId || 'SYSTEM',
      `Updated status to ${status}.`,
      oldStatus,
      status,
    );
    return saved;
  }

  /**
   * Customer accepts or rejects a quotation from email/WhatsApp link.
   * Sets status to CUSTOMER_ACCEPTED or CUSTOMER_REJECTED.
   */
  async customerRespond(id: string, action: 'accept' | 'reject') {
    const invoice = await this.invoiceRepo.findById(id);
    if (!invoice) throw new AppError('Quotation not found', 404);

    // Only allow response on quotations that have been sent to the customer
    const respondableStatuses = [InvoiceStatus.SENT, InvoiceStatus.DRAFT];
    if (
      !respondableStatuses.includes(invoice.status as InvoiceStatus) &&
      (invoice.status as string) !== 'SENT_TO_CUSTOMER'
    ) {
      throw new AppError(
        `This quotation cannot be responded to. Current status: ${invoice.status}`,
        400,
      );
    }

    const oldStatus = invoice.status;
    const newStatus =
      action === 'accept' ? InvoiceStatus.CUSTOMER_ACCEPTED : InvoiceStatus.CUSTOMER_REJECTED;

    invoice.status = newStatus;
    const saved = await this.invoiceRepo.save(invoice);
    await logAudit(
      invoice.id,
      'STATUS_CHANGE',
      'CUSTOMER',
      `Customer responded ${action === 'accept' ? 'ACCEPTED' : 'REJECTED'} to quotation.`,
      oldStatus,
      newStatus,
    );

    if (action === 'accept') {
      // Notify Creator
      if (invoice.createdBy) {
        try {
          const { NotificationPublisher } =
            await import('../events/publisher/notificationPublisher');
          const { CUSTOMER_ACCEPTED } = await import('../constants/notificationTypes');
          const { getCustomerName } = await import('./billingHelpers');

          const customerName = await getCustomerName(invoice.customerId);

          await NotificationPublisher.publishInAppRequest({
            recipientId: invoice.createdBy,
            title: 'Customer Accepts Quotation',
            message: `Great news! Customer ${customerName} has accepted your quotation [${invoice.invoiceNumber}]. You can now convert it to a transaction.`,
            type: CUSTOMER_ACCEPTED,
            referenceId: invoice.id,
            referenceType: 'QUOTATION',
          });
        } catch (err) {
          logger.error('Failed to notify creator on customer acceptance', err);
        }
      }

      // Notify Branch Manager
      if (invoice.branchId) {
        try {
          const { NotificationPublisher } =
            await import('../events/publisher/notificationPublisher');
          const { CUSTOMER_ACCEPTED } = await import('../constants/notificationTypes');
          const { getBranchManager, getCustomerName, getEmployeeDetails } =
            await import('./billingHelpers');

          const managerId = await getBranchManager(invoice.branchId);
          if (managerId) {
            const customerName = await getCustomerName(invoice.customerId);
            const empDetails = await getEmployeeDetails(invoice.createdBy);
            const employeeName = empDetails ? empDetails.name : 'Employee';

            await NotificationPublisher.publishInAppRequest({
              recipientId: managerId,
              title: 'Customer Accepts Quotation',
              message: `Great news! Customer ${customerName} has accepted the quotation [${invoice.invoiceNumber}] created by ${employeeName}.`,
              type: CUSTOMER_ACCEPTED,
              referenceId: invoice.id,
              referenceType: 'QUOTATION',
            });
          }
        } catch (err) {
          logger.error('Failed to notify branch manager on customer acceptance', err);
        }
      }
    }

    return saved;
  }

  /**
   * Employee marks a quotation as ready for Finance review.
   */
  async employeeApprove(id: string, userId: string) {
    const invoice = await this.invoiceRepo.findById(id);
    if (!invoice) throw new AppError('Document not found', 404);

    if (
      invoice.status === InvoiceStatus.EMPLOYEE_APPROVED ||
      invoice.status === InvoiceStatus.FINANCE_APPROVED ||
      invoice.status === InvoiceStatus.CUSTOMER_REJECTED ||
      invoice.status === InvoiceStatus.FINANCE_REJECTED ||
      invoice.status === InvoiceStatus.CANCELLED
    ) {
      throw new AppError('This document is already in a terminal or pending state', 400);
    }

    const oldStatus = invoice.status;
    invoice.status = InvoiceStatus.EMPLOYEE_APPROVED;
    invoice.employeeApprovedBy = userId;
    invoice.employeeApprovedAt = new Date();

    const saved = await this.invoiceRepo.save(invoice);
    await logAudit(
      invoice.id,
      'STATUS_CHANGE',
      userId,
      `Employee approved the quotation for Finance review.`,
      oldStatus,
      InvoiceStatus.EMPLOYEE_APPROVED,
    );

    // Notify Finance Staff
    if (invoice.branchId) {
      try {
        const { NotificationPublisher } = await import('../events/publisher/notificationPublisher');
        const { QUOTATION_SUBMITTED } = await import('../constants/notificationTypes');
        const { getFinanceEmployeesByBranch, getCustomerName } = await import('./billingHelpers');

        const customerName = await getCustomerName(invoice.customerId);
        const financeIds = await getFinanceEmployeesByBranch(invoice.branchId);

        for (const financeId of financeIds) {
          try {
            await NotificationPublisher.publishInAppRequest({
              recipientId: financeId,
              title: 'Quotation Submitted for Review',
              message: `A quotation [${invoice.invoiceNumber}] for ${customerName} has been submitted for review. Please check details and approve/reject.`,
              type: QUOTATION_SUBMITTED,
              referenceId: invoice.id,
              referenceType: 'QUOTATION',
            });
          } catch (err) {
            logger.error(
              `Failed to publish quotation submit notification to finance employee ${financeId}`,
              err,
            );
          }
        }
      } catch (err) {
        logger.error('Failed to notify finance staff about quotation submission', err);
      }
    }

    // Notify Submitting Employee
    try {
      const { NotificationPublisher } = await import('../events/publisher/notificationPublisher');
      const { QUOTATION_SUBMITTED } = await import('../constants/notificationTypes');

      await NotificationPublisher.publishInAppRequest({
        recipientId: userId,
        title: 'Quotation Submitted',
        message: `Your quotation [${invoice.invoiceNumber}] has been submitted for finance review.`,
        type: QUOTATION_SUBMITTED,
        referenceId: invoice.id,
        referenceType: 'QUOTATION',
      });
    } catch (err) {
      logger.error('Failed to publish quotation submit confirmation to submitting employee', err);
    }

    return saved;
  }

  /**
   * Finance approves the quotation pricing.
   */
  async financeApproveQuotation(id: string, userId: string, payload?: { effectiveTo?: Date }) {
    const invoice = await this.invoiceRepo.findById(id);
    if (!invoice) throw new AppError('Quotation not found', 404);

    if (
      invoice.status !== InvoiceStatus.EMPLOYEE_APPROVED &&
      invoice.status !== InvoiceStatus.WAITING_FINANCE_APPROVAL
    ) {
      throw new AppError('Quotation must be in a pending approval state', 400);
    }

    const oldStatus = invoice.status;
    invoice.status = InvoiceStatus.FINANCE_APPROVED;
    invoice.financeApprovedBy = userId;
    invoice.financeApprovedAt = new Date();

    if (payload?.effectiveTo) {
      invoice.effectiveTo = payload.effectiveTo;
    }

    if (invoice.billType === 'SERVICE') {
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 30);
      invoice.estimateValidUntil = validUntil;
      invoice.estimateExpired = false;
    }

    const saved = await this.invoiceRepo.save(invoice);
    await logAudit(
      invoice.id,
      'STATUS_CHANGE',
      userId,
      `Finance approved quotation pricing.`,
      oldStatus,
      InvoiceStatus.FINANCE_APPROVED,
    );

    // Notify Submitting Employee
    if (invoice.createdBy) {
      try {
        const { NotificationPublisher } = await import('../events/publisher/notificationPublisher');
        const { QUOTATION_APPROVED } = await import('../constants/notificationTypes');
        const { getCustomerName } = await import('./billingHelpers');

        const customerName = await getCustomerName(invoice.customerId);

        await NotificationPublisher.publishInAppRequest({
          recipientId: invoice.createdBy,
          title: 'Quotation Approved',
          message: `Great news! Your quotation [${invoice.invoiceNumber}] for ${customerName} has been approved by Finance. You can now send it to the customer.`,
          type: QUOTATION_APPROVED,
          referenceId: invoice.id,
          referenceType: 'QUOTATION',
        });
      } catch (err) {
        logger.error('Failed to notify submitting employee about quotation approval', err);
      }
    }

    // Notify Branch Manager
    if (invoice.branchId) {
      try {
        const { NotificationPublisher } = await import('../events/publisher/notificationPublisher');
        const { QUOTATION_APPROVED } = await import('../constants/notificationTypes');
        const { getBranchManager, getCustomerName } = await import('./billingHelpers');

        const managerId = await getBranchManager(invoice.branchId);
        if (managerId) {
          const customerName = await getCustomerName(invoice.customerId);

          await NotificationPublisher.publishInAppRequest({
            recipientId: managerId,
            title: 'Quotation Approved',
            message: `A quotation [${invoice.invoiceNumber}] for ${customerName} has been approved by Finance.`,
            type: QUOTATION_APPROVED,
            referenceId: invoice.id,
            referenceType: 'QUOTATION',
          });
        }
      } catch (err) {
        logger.error('Failed to notify branch manager about quotation approval', err);
      }
    }

    // Callback to ven_inv_service for Service Tickets
    if (invoice.serviceTicketId) {
      try {
        const { sign } = await import('jsonwebtoken');
        const token = sign(
          { userId: 'billing_service', role: 'ADMIN' },
          process.env.ACCESS_SECRET as string,
          { expiresIn: '1m' },
        );

        const venInvUrl = process.env.VENDOR_INVENTORY_SERVICE_URL || 'http://localhost:3003';
        await globalThis.fetch(
          `${venInvUrl}/service/tickets/${invoice.serviceTicketId}/quotation-link`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              serviceQuotationId: invoice.id,
              status: 'FINANCE_APPROVED',
            }),
          },
        );
        logger.info(
          `[BillingService] Sent finance approval callback for service ticket ${invoice.serviceTicketId}`,
        );

        if (invoice.billType === 'SERVICE') {
          await globalThis.fetch(
            `${venInvUrl}/service/tickets/${invoice.serviceTicketId}/finance-approved`,
            {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
            },
          );
        }
      } catch (callbackErr) {
        logger.error('[BillingService] Failed to call service ticket callback:', callbackErr);
      }
    }

    return saved;
  }

  /**
   * Request validity extension for an expired quotation.
   */
  async requestValidityExtension(id: string): Promise<Invoice> {
    const invoice = await this.invoiceRepo.findById(id);
    if (!invoice) throw new AppError('Quotation not found', 404);

    const oldStatus = invoice.status;
    invoice.status = InvoiceStatus.WAITING_FINANCE_APPROVAL;
    const saved = await this.invoiceRepo.save(invoice);
    await logAudit(
      invoice.id,
      'STATUS_CHANGE',
      invoice.createdBy || 'SYSTEM',
      `Requested validity extension from Finance.`,
      oldStatus,
      InvoiceStatus.WAITING_FINANCE_APPROVAL,
    );

    if (invoice.branchId) {
      try {
        const { NotificationPublisher } = await import('../events/publisher/notificationPublisher');
        const { QUOTATION_EXTENSION_REQUESTED } = await import('../constants/notificationTypes');
        const { getFinanceEmployeesByBranch, getCustomerName } = await import('./billingHelpers');

        const customerName = await getCustomerName(invoice.customerId);
        const financeIds = await getFinanceEmployeesByBranch(invoice.branchId);

        for (const financeId of financeIds) {
          try {
            await NotificationPublisher.publishInAppRequest({
              recipientId: financeId,
              title: 'Quotation Extension Requested',
              message: `A validity extension has been requested for quotation [${invoice.invoiceNumber}] for customer ${customerName}.`,
              type: QUOTATION_EXTENSION_REQUESTED,
              referenceId: invoice.id,
              referenceType: 'QUOTATION',
            });
          } catch (err) {
            logger.error(
              `Failed to publish quotation extension notification to finance employee ${financeId}`,
              err,
            );
          }
        }
      } catch (err) {
        logger.error('Failed to notify finance staff about validity extension request', err);
      }
    }

    return saved;
  }

  /**
   * Employee converts a finance-approved quotation into a transaction (Proforma).
   */
  async convertToTransaction(id: string, userId: string) {
    const invoice = await this.invoiceRepo.findById(id);
    if (!invoice) throw new AppError('Quotation not found', 404);

    if (invoice.effectiveTo && new Date(invoice.effectiveTo) < new Date()) {
      throw new AppError(
        'Quotation validity has expired. Please request a validity extension from Finance.',
        400,
      );
    }

    if (invoice.type !== InvoiceType.QUOTATION) {
      throw new AppError('Only quotations can be converted', 400);
    }

    const oldStatus = invoice.status;
    // Convert to Proforma and set to EMPLOYEE_APPROVED so it shows up on Finance side for Accept/Reject
    invoice.type = InvoiceType.PROFORMA;
    invoice.status = InvoiceStatus.DRAFT;

    const saved = await this.invoiceRepo.save(invoice);
    await logAudit(
      invoice.id,
      'STATUS_CHANGE',
      userId,
      `Converted approved quotation into transaction (Proforma draft).`,
      oldStatus,
      InvoiceStatus.DRAFT,
    );

    if (saved.branchId) {
      try {
        const { NotificationPublisher } = await import('../events/publisher/notificationPublisher');
        const { QUOTATION_CONVERTED } = await import('../constants/notificationTypes');
        const { getBranchManager, getCustomerName, getEmployeeDetails } =
          await import('./billingHelpers');

        const managerId = await getBranchManager(saved.branchId);
        if (managerId) {
          const customerName = await getCustomerName(saved.customerId);
          const empDetails = await getEmployeeDetails(userId);
          const employeeName = empDetails ? empDetails.name : 'Employee';

          await NotificationPublisher.publishInAppRequest({
            recipientId: managerId,
            title: 'Quotation Converted',
            message: `A quotation [${saved.invoiceNumber}] for ${customerName} has been converted into a transaction (Proforma contract) by ${employeeName}.`,
            type: QUOTATION_CONVERTED,
            referenceId: saved.id,
            referenceType: 'CONTRACT',
          });
        }
      } catch (err) {
        logger.error('Failed to notify branch manager about quotation conversion', err);
      }
    }

    return saved;
  }

  /**
   * Step 1: Finance allocates machines for the transaction (Proforma).
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

      if (!invoice) throw new AppError('Quotation/Transaction not found', 404);

      // Ensure we are operating on a PROFORMA (Transaction) that was sent for approval
      if (invoice.type !== InvoiceType.PROFORMA) {
        throw new AppError(
          'Only converted transactions (Proforma) can have machines allocated',
          400,
        );
      }

      if (
        invoice.status !== InvoiceStatus.DRAFT &&
        invoice.status !== InvoiceStatus.EMPLOYEE_APPROVED &&
        (invoice.status as string) !== 'TRANSACTION_COMPLETED' &&
        invoice.status !== InvoiceStatus.FINANCE_APPROVED
      ) {
        throw new AppError('Transaction must be in a valid state for allocation', 400);
      }

      // Check that all machines and spare parts are allocated
      const allocatableItems = invoice.items.filter(
        (item) =>
          (item.itemType === 'PRODUCT' ||
            (item.itemType as unknown) === 'SPARE_PART' ||
            (item.itemType as unknown) === 'SPAREPART') &&
          (item.modelId || item.productId),
      );
      const updatesMap = new Map<string, { id: string; productId: string }>();
      if (itemUpdates) itemUpdates.forEach((u) => updatesMap.set(String(u.id).toLowerCase(), u));

      for (const item of allocatableItems) {
        const update = updatesMap.get(String(item.id).toLowerCase());
        const isAllocated = !!(item.productId || update?.productId);
        if (!isAllocated) {
          throw new AppError(
            `Allocation (Serial/Lot Number) is required for: ${item.description}`,
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
              const endpoint =
                (item.itemType as unknown) === 'SPARE_PART' ||
                (item.itemType as unknown) === 'SPAREPART'
                  ? 'spare-parts'
                  : 'products';
              const response = await fetch(
                `${inventoryServiceUrl}/${endpoint}/${update.productId}`,
                {
                  headers: { Authorization: token, 'Content-Type': 'application/json' },
                },
              );
              if (!response.ok) throw new Error(response.statusText);
              const data = await response.json();
              product = data.data;
            } catch (error) {
              logger.error(`Item validation failed: ${update.productId}`, error);
              throw new AppError(`Failed to validate inventory item ${update.productId}`, 500);
            }

            if (!product) throw new AppError(`Item ${update.productId} not found`, 404);

            item.productId = update.productId;

            // Use serial number for products, lot ID/SKU for spare parts
            const serialNo =
              (item.itemType as unknown) === 'SPARE_PART' ||
              (item.itemType as unknown) === 'SPAREPART'
                ? product.sku || product.lot_id || 'Part'
                : product.serial_no || 'Unknown';

            // Create basic allocation record without meter readings yet
            await queryRunner.manager.insert(ProductAllocation, {
              contractId: invoice.id,
              modelId: item.modelId,
              productId: update.productId,
              serialNumber: serialNo,
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

      await logAudit(
        savedInvoice.id,
        'ALLOCATION',
        userId,
        `Finance allocated inventory machines to Proforma. Status: FINANCE_APPROVED, Contract Status: PENDING_CONFIRMATION.`,
      );

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

            if (
              invoice.saleType !== SaleType.SALE &&
              invoice.saleType !== SaleType.PRODUCT_SALE &&
              invoice.saleType !== SaleType.SPAREPART_SALE
            ) {
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
              if (
                invoice.saleType !== SaleType.SALE &&
                invoice.saleType !== SaleType.PRODUCT_SALE &&
                invoice.saleType !== SaleType.SPAREPART_SALE &&
                update.initialColorCount === undefined
              ) {
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

      if (
        invoice.saleType === SaleType.SALE ||
        invoice.saleType === SaleType.PRODUCT_SALE ||
        invoice.saleType === SaleType.SPAREPART_SALE
      ) {
        invoice.type = InvoiceType.FINAL;
        invoice.status = InvoiceStatus.PAID;
        invoice.contractStatus = ContractStatus.ACTIVE; // Set to Active for consistency
      } else {
        invoice.contractStatus = ContractStatus.ACTIVE;
        this.setEffectiveDates(invoice);
      }

      const savedInvoice = await queryRunner.manager.save(invoice);
      await queryRunner.commitTransaction();

      await logAudit(
        savedInvoice.id,
        'ACTIVATION',
        userId,
        `Activated contract/invoice. Status: ${savedInvoice.status}, Contract Status: ${savedInvoice.contractStatus}.`,
      );

      // Emit status updates
      this.emitProductStatusUpdates(savedInvoice, userId);

      // Notify Creator
      if (savedInvoice.createdBy) {
        try {
          const { NotificationPublisher } =
            await import('../events/publisher/notificationPublisher');
          const { CONTRACT_ACTIVATED } = await import('../constants/notificationTypes');
          const { getCustomerName } = await import('./billingHelpers');

          const customerName = await getCustomerName(savedInvoice.customerId);

          await NotificationPublisher.publishInAppRequest({
            recipientId: savedInvoice.createdBy,
            title: 'Contract Activated',
            message: `The contract for customer ${customerName} has been activated successfully.`,
            type: CONTRACT_ACTIVATED,
            referenceId: savedInvoice.id,
            referenceType: 'CONTRACT',
          });
        } catch (err) {
          logger.error('Failed to notify creator on contract activation', err);
        }
      }

      // Notify Branch Manager
      if (savedInvoice.branchId) {
        try {
          const { NotificationPublisher } =
            await import('../events/publisher/notificationPublisher');
          const { CONTRACT_ACTIVATED } = await import('../constants/notificationTypes');
          const { getBranchManager, getCustomerName, getEmployeeDetails } =
            await import('./billingHelpers');

          const managerId = await getBranchManager(savedInvoice.branchId);
          if (managerId) {
            const customerName = await getCustomerName(savedInvoice.customerId);
            const empDetails = await getEmployeeDetails(userId);
            const employeeName = empDetails ? empDetails.name : 'Employee';

            await NotificationPublisher.publishInAppRequest({
              recipientId: managerId,
              title: 'Contract Activated',
              message: `Contract [${savedInvoice.invoiceNumber}] for customer ${customerName} has been activated by ${employeeName}.`,
              type: CONTRACT_ACTIVATED,
              referenceId: savedInvoice.id,
              referenceType: 'CONTRACT',
            });
          }
        } catch (err) {
          logger.error('Failed to notify branch manager on contract activation', err);
        }
      }

      // Notify Finance Team Members
      if (savedInvoice.branchId) {
        try {
          const { NotificationPublisher } =
            await import('../events/publisher/notificationPublisher');
          const { CONTRACT_ACTIVATED } = await import('../constants/notificationTypes');
          const { getFinanceEmployeesByBranch, getCustomerName } = await import('./billingHelpers');

          const customerName = await getCustomerName(savedInvoice.customerId);
          const financeIds = await getFinanceEmployeesByBranch(savedInvoice.branchId);

          for (const financeId of financeIds) {
            try {
              await NotificationPublisher.publishInAppRequest({
                recipientId: financeId,
                title: 'Contract Activated',
                message: `The contract for customer ${customerName} is now active. Delivery and billing schedules are initialized.`,
                type: CONTRACT_ACTIVATED,
                referenceId: savedInvoice.id,
                referenceType: 'CONTRACT',
              });
            } catch (err) {
              logger.error(
                `Failed to publish contract activation notification to finance employee ${financeId}`,
                err,
              );
            }
          }
        } catch (err) {
          logger.error('Failed to notify finance staff about contract activation', err);
        }
      }

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
            customerId: billType === 'RETURNED' ? null : invoice.customerId,
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

    if (
      invoice.status !== InvoiceStatus.EMPLOYEE_APPROVED &&
      (invoice.status as string) !== 'TRANSACTION_COMPLETED' &&
      invoice.status !== InvoiceStatus.FINANCE_APPROVED &&
      invoice.status !== InvoiceStatus.WAITING_FINANCE_APPROVAL
    ) {
      throw new AppError(
        'Only Employee Approved, Finance Approved, Waiting Finance Approval, or Converted quotations can be rejected by Finance',
        400,
      );
    }

    const oldStatus = invoice.status;
    invoice.status = InvoiceStatus.FINANCE_REJECTED;
    invoice.financeApprovedBy = userId; // Record who rejected
    invoice.financeApprovedAt = new Date();
    invoice.financeRemarks = reason;

    await this.invoiceRepo.save(invoice);
    await logAudit(
      invoice.id,
      'STATUS_CHANGE',
      userId,
      `Finance rejected quotation/invoice. Reason: ${reason}`,
      oldStatus,
      InvoiceStatus.FINANCE_REJECTED,
    );

    // Notify Submitting Employee
    if (invoice.createdBy) {
      try {
        const { NotificationPublisher } = await import('../events/publisher/notificationPublisher');
        const { QUOTATION_REJECTED } = await import('../constants/notificationTypes');
        const { getCustomerName } = await import('./billingHelpers');

        const customerName = await getCustomerName(invoice.customerId);

        await NotificationPublisher.publishInAppRequest({
          recipientId: invoice.createdBy,
          title: 'Quotation Rejected',
          message: `Your quotation [${invoice.invoiceNumber}] for ${customerName} has been rejected by Finance. Reason: ${reason}.`,
          type: QUOTATION_REJECTED,
          referenceId: invoice.id,
          referenceType: 'QUOTATION',
        });
      } catch (err) {
        logger.error('Failed to notify submitting employee about quotation rejection', err);
      }
    }

    // Notify Branch Manager
    if (invoice.branchId) {
      try {
        const { NotificationPublisher } = await import('../events/publisher/notificationPublisher');
        const { QUOTATION_REJECTED } = await import('../constants/notificationTypes');
        const { getBranchManager, getCustomerName } = await import('./billingHelpers');

        const managerId = await getBranchManager(invoice.branchId);
        if (managerId) {
          const customerName = await getCustomerName(invoice.customerId);

          await NotificationPublisher.publishInAppRequest({
            recipientId: managerId,
            title: 'Quotation Rejected',
            message: `A quotation [${invoice.invoiceNumber}] for ${customerName} has been rejected by Finance. Reason: ${reason}.`,
            type: QUOTATION_REJECTED,
            referenceId: invoice.id,
            referenceType: 'QUOTATION',
          });
        }
      } catch (err) {
        logger.error('Failed to notify branch manager about quotation rejection', err);
      }
    }

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
            customerId: null,
          });
        } catch (e) {
          logger.error('Failed to emit product status update on finance reject', {
            productId: allocation.productId,
            error: e,
          });
        }
      }
    }

    // Callback to ven_inv_service for Service Tickets
    if (invoice.serviceTicketId) {
      try {
        const { sign } = await import('jsonwebtoken');
        const token = sign(
          { userId: 'billing_service', role: 'ADMIN' },
          process.env.ACCESS_SECRET as string,
          { expiresIn: '1m' },
        );

        const venInvUrl = process.env.VENDOR_INVENTORY_SERVICE_URL || 'http://localhost:3003';
        await globalThis.fetch(
          `${venInvUrl}/service/tickets/${invoice.serviceTicketId}/quotation-link`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              serviceQuotationId: invoice.id,
              status: 'FINANCE_REJECTED',
            }),
          },
        );
        logger.info(
          `[BillingService] Sent finance rejection callback for service ticket ${invoice.serviceTicketId}`,
        );

        if (invoice.billType === 'SERVICE') {
          await globalThis.fetch(
            `${venInvUrl}/service/tickets/${invoice.serviceTicketId}/finance-rejected`,
            {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ reason }),
            },
          );
        }
      } catch (callbackErr) {
        logger.error('[BillingService] Failed to call service ticket callback:', callbackErr);
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
        (invoice.type === InvoiceType.PROFORMA ||
          invoice.status === InvoiceStatus.ACTIVE_CONTRACT) &&
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
        invoice.status === InvoiceStatus.ACTIVE_CONTRACT
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
              customerId: null,
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
    if (!customerId) return null;
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

    // Build Accept/Reject response URL (public endpoint, no auth needed)
    const billingBaseUrl =
      process.env.BILLING_SERVICE_PUBLIC_URL || `http://localhost:${process.env.PORT || 3004}`;
    const acceptUrl = `${billingBaseUrl}/invoices/${contract.id}/respond?action=accept`;
    const rejectUrl = `${billingBaseUrl}/invoices/${contract.id}/respond?action=reject`;

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

        <!-- ── Customer Response Buttons ───────────────────────────────────── -->
        <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1px solid #e2e8f0; border-radius: 16px; padding: 28px 24px; margin-bottom: 24px; text-align: center;">
          <p style="font-size: 15px; font-weight: 700; color: #0f172a; margin: 0 0 6px 0;">Ready to proceed?</p>
          <p style="font-size: 13px; color: #64748b; margin: 0 0 24px 0;">Please review the quotation and click one of the buttons below to let us know your decision.</p>
          <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
            <a href="${acceptUrl}"
               style="display: inline-block; background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: white; padding: 14px 36px; border-radius: 12px; text-decoration: none; font-size: 15px; font-weight: 800; letter-spacing: 0.02em; box-shadow: 0 4px 14px rgba(22,163,74,0.3);">
              ✅ &nbsp; Accept Quotation
            </a>
            <a href="${rejectUrl}"
               style="display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 14px 36px; border-radius: 12px; text-decoration: none; font-size: 15px; font-weight: 800; letter-spacing: 0.02em; box-shadow: 0 4px 14px rgba(220,38,38,0.3);">
              ❌ &nbsp; Reject Quotation
            </a>
          </div>
          <p style="font-size: 11px; color: #94a3b8; margin: 18px 0 0 0;">Ref: ${contract.invoiceNumber} &nbsp;|&nbsp; This link is valid once only per action.</p>
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

    // Mark quotation as "Sent to Customer" so employees can track it
    if (
      contract.status === InvoiceStatus.DRAFT ||
      contract.status === InvoiceStatus.SENT ||
      (contract.status as string) === 'SENT_TO_CUSTOMER'
    ) {
      contract.status = InvoiceStatus.SENT;
      contract.emailSentAt = new Date();
      await this.invoiceRepo.save(contract);
    }
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

    // Build Accept/Reject response URL (public endpoint, no auth needed)
    const billingBaseUrl =
      process.env.BILLING_SERVICE_PUBLIC_URL || `http://localhost:${process.env.PORT || 3004}`;
    const acceptUrl = `${billingBaseUrl}/invoices/${contract.id}/respond?action=accept`;
    const rejectUrl = `${billingBaseUrl}/invoices/${contract.id}/respond?action=reject`;

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

    const responseSection = `\n✅ *Accept Quotation:*\n${acceptUrl}\n\n❌ *Reject Quotation:*\n${rejectUrl}`;
    const fullBody = `${body}\n\n${details}\n${responseSection}\n\n_Thank you, XeroCare_`;

    await NotificationPublisher.publishWhatsappRequest({
      recipient: finalRecipient,
      body: fullBody,
      invoiceId: contract.id,
    });

    // Mark quotation as "Sent to Customer" so employees can track it
    if (
      contract.status === InvoiceStatus.DRAFT ||
      contract.status === InvoiceStatus.SENT ||
      (contract.status as string) === 'SENT_TO_CUSTOMER'
    ) {
      contract.status = InvoiceStatus.SENT;
      contract.whatsappSentAt = new Date();
      await this.invoiceRepo.save(contract);
    }
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
          if (item.description && item.description.includes(oldAllocation.serialNumber)) {
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
          customerId: null,
        }).catch((err) => logger.error('Failed to emit RETURNED event', err));
      }
      if (newAllocation.productId) {
        emitProductStatusUpdate({
          productId: newAllocation.productId,
          billType: invoice?.saleType === 'LEASE' ? 'LEASE' : 'RENT',
          invoiceId: newAllocation.contractId,
          approvedBy: 'SYSTEM',
          approvedAt: ts,
          customerId: invoice?.customerId || null,
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

  /**
   * Processes a return credit for an invoice item.
   */
  async processReturn(
    invoiceId: string,
    payload: {
      itemId: string;
      itemType: 'PRODUCT' | 'SPARE_PART';
      amount: number;
      note: string;
      createdBy: string;
    },
  ) {
    const invoice = await this.invoiceRepo.findById(invoiceId);
    if (!invoice) throw new AppError('Invoice not found', 404);

    // 1. Create Return Credit record
    const returnCredit = await this.returnCreditRepo.createReturnCredit({
      invoiceId,
      branchId: invoice.branchId,
      amount: payload.amount,
      note: payload.note,
      returnedItemId: payload.itemId,
      returnedItemType: payload.itemType,
      createdBy: payload.createdBy,
    });

    // 2. Call Inventory Service to update status/quantity
    try {
      const inventoryServiceUrl = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3003';
      const { sign } = await import('jsonwebtoken');
      const token = sign(
        { userId: 'billing_service', role: 'ADMIN' },
        process.env.ACCESS_SECRET as string,
        { expiresIn: '5m' },
      );

      const response = await fetch(`${inventoryServiceUrl}/inventory/returns/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          itemType: payload.itemType,
          itemId: payload.itemId,
          quantity: 1, // Currently assumed 1 for sales returns per item
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        logger.error('Inventory service return failed', errData);
        // We still keep the credit record as it represents the financial return
      }
    } catch (err) {
      logger.error('Failed to connect to inventory service for return', err);
    }

    return returnCredit;
  }

  /**
   * Direct Sale: Creates a FINAL invoice bypassing the quotation flow.
   */
  async createDirectSale(payload: {
    branchId: string;
    createdBy: string;
    customerId: string;
    saleType: SaleType;
    items: {
      itemType: 'PRODUCT' | 'SPARE_PART';
      productId?: string;
      sparePartId?: string;
      serialNumber?: string;
      quantity?: number;
      unitPrice: number;
      description: string;
      discount?: number;
      modelId?: string;
      taxRate?: number;
    }[];
    paymentAmount?: number;
    paymentMode?: PaymentMode;
    paymentReference?: string;
    notes?: string;
  }) {
    if (payload.items) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload.items.forEach((item: any) => {
        if (item.itemType === 'SPAREPART' || item.itemType === 'SPARE_PART') {
          item.itemType = 'SPARE_PART';
        } else {
          item.itemType = 'PRODUCT';
        }
      });
    }

    if (!payload.items || payload.items.length === 0) {
      throw new AppError('Direct sale must have at least one item', 400);
    }

    // Determine SaleType based on item composition:
    // Only products -> PRODUCT_SALE
    // Only spare parts -> SPAREPART_SALE
    // Mixed -> SALE
    const hasProducts = payload.items.some((item) => item.itemType === 'PRODUCT');
    const hasSpareParts = payload.items.some((item) => item.itemType === 'SPARE_PART');

    let determinedSaleType: SaleType;
    if (hasProducts && !hasSpareParts) {
      determinedSaleType = SaleType.PRODUCT_SALE;
    } else if (hasSpareParts && !hasProducts) {
      determinedSaleType = SaleType.SPAREPART_SALE;
    } else {
      determinedSaleType = SaleType.SALE;
    }

    // Pre-validation HTTP check before starting transaction
    const { sign } = await import('jsonwebtoken');
    const token = sign(
      { userId: 'billing_service', role: 'ADMIN' },
      process.env.ACCESS_SECRET as string,
      { expiresIn: '5m' },
    );
    const inventoryServiceUrl = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3003';

    for (const item of payload.items) {
      if (!item.itemType) throw new AppError('itemType required', 400);

      if (item.itemType === 'PRODUCT') {
        if (!item.productId) throw new AppError('productId required for PRODUCT', 400);
        if (!item.serialNumber) throw new AppError('serialNumber required for PRODUCT', 400);

        // Fetch products to search by serial_no and check status
        const response = await fetch(
          `${inventoryServiceUrl}/products?search=${encodeURIComponent(item.serialNumber)}&status=AVAILABLE`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (!response.ok) {
          throw new AppError(
            'Failed to communicate with Inventory Service to verify product availability',
            500,
          );
        }
        const resData = await response.json();
        const productsList = resData.data?.data || resData.data || [];
        const matched = productsList.find(
          (p: { serial_no: string; product_status: string }) =>
            p.serial_no === item.serialNumber && p.product_status === 'AVAILABLE',
        );
        if (!matched) {
          throw new AppError(
            `Product with serial number ${item.serialNumber} is not available`,
            400,
          );
        }
      }

      if (item.itemType === 'SPARE_PART') {
        if (!item.sparePartId) throw new AppError('sparePartId required for SPARE_PART', 400);
        if (!item.quantity || item.quantity <= 0) {
          throw new AppError('quantity required and must be > 0 for SPARE_PART', 400);
        }

        // Fetch spare part stock
        const response = await fetch(`${inventoryServiceUrl}/spare-parts/${item.sparePartId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          throw new AppError(
            'Failed to communicate with Inventory Service to verify spare part stock',
            500,
          );
        }
        const resData = await response.json();
        const sparePart = resData.data;
        if (!sparePart || sparePart.quantity < item.quantity) {
          throw new AppError(
            `Insufficient stock for spare part: ${sparePart?.part_name || item.sparePartId}. Available: ${sparePart?.quantity || 0}, Required: ${item.quantity}`,
            400,
          );
        }
      }
    }

    const invoiceNumber = await this.invoiceRepo.generateInvoiceNumber();
    let calculatedTotal = 0;

    const queryRunner = this.invoiceRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const invoice = this.invoiceRepo.manager.create(Invoice, {
        invoiceNumber,
        branchId: payload.branchId,
        createdBy: payload.createdBy,
        customerId: payload.customerId,
        saleType: determinedSaleType,
        type: InvoiceType.FINAL,
        status: InvoiceStatus.DRAFT, // Will update based on payment later
        isDirectSale: true,
        notes: payload.notes,
        grossAmount: 0,
        discountAmount: 0,
        totalAmount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const savedInvoice = await queryRunner.manager.save(invoice);
      const allocationsToEmit: {
        serialNumber: string;
        invoiceId: string;
        invoiceItemId: string;
        action: 'SALE';
      }[] = [];
      const reductionsToEmit: {
        sparePartId: string;
        quantity: number;
        invoiceId: string;
        invoiceItemId: string;
      }[] = [];

      let grossAmount = 0;
      let totalDiscount = 0;

      for (const item of payload.items) {
        const quantity = item.itemType === 'SPARE_PART' ? item.quantity! : 1;
        const discount = item.discount || 0;
        const taxRate = item.taxRate || 0;

        const taxAmount = item.unitPrice * (taxRate / 100) * quantity;
        const subtotalAfterDiscount = (item.unitPrice - discount) * quantity;
        const itemTotal = subtotalAfterDiscount + taxAmount;

        grossAmount += item.unitPrice * quantity;
        totalDiscount += discount * quantity;
        calculatedTotal += itemTotal;

        const invItem = new InvoiceItem();
        invItem.itemType = item.itemType as ItemType;
        invItem.description = item.description;
        invItem.quantity = quantity;
        invItem.unitPrice = item.unitPrice;
        if (item.itemType === 'PRODUCT') {
          invItem.productId = item.productId;
          invItem.serialNumber = item.serialNumber;
          invItem.modelId = item.modelId;
        } else {
          invItem.sparePartId = item.sparePartId;
        }
        invItem.invoice = savedInvoice;

        const savedItem = await queryRunner.manager.save(invItem);

        if (item.itemType === 'PRODUCT') {
          allocationsToEmit.push({
            serialNumber: item.serialNumber!,
            invoiceId: savedInvoice.id,
            invoiceItemId: savedItem.id,
            action: 'SALE',
          });

          // Create ProductAllocation for safety/billing tracking
          await queryRunner.manager.insert(ProductAllocation, {
            contractId: savedInvoice.id,
            modelId: item.modelId,
            productId: item.productId,
            serialNumber: item.serialNumber,
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
        } else if (item.itemType === 'SPARE_PART') {
          reductionsToEmit.push({
            sparePartId: item.sparePartId!,
            quantity: quantity,
            invoiceId: savedInvoice.id,
            invoiceItemId: savedItem.id,
          });
        }
      }

      savedInvoice.grossAmount = grossAmount;
      savedInvoice.discountAmount = totalDiscount;
      savedInvoice.totalAmount = grossAmount - totalDiscount;

      let paymentStatus = InvoiceStatus.SENT;
      if (payload.paymentAmount && payload.paymentAmount > 0) {
        if (payload.paymentAmount >= calculatedTotal - 0.01) {
          paymentStatus = InvoiceStatus.PAID;
        } else {
          paymentStatus = InvoiceStatus.SENT;
        }
      }

      savedInvoice.status = paymentStatus;
      await queryRunner.manager.save(savedInvoice);

      // Handle payment if provided
      if (payload.paymentAmount && payload.paymentAmount > 0) {
        if (!payload.paymentMode)
          throw new AppError('paymentMode required if paymentAmount provided', 400);
        await queryRunner.manager.insert('payment_ledgers', {
          invoiceId: savedInvoice.id,
          amountPaid: payload.paymentAmount,
          paymentMode: payload.paymentMode,
          paymentDate: new Date(),
          referenceNumber: payload.paymentReference,
          remarks: 'Direct Sale Payment',
          recordedBy: payload.createdBy,
        });
      }

      await queryRunner.commitTransaction();

      // Emit Events POST-COMMIT
      for (const allocation of allocationsToEmit) {
        emitProductAllocate(allocation);
      }
      for (const reduction of reductionsToEmit) {
        emitSparePartReduce(reduction);
      }

      return savedInvoice;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // --- Manager Quotation Template & Assignment System ---

  async createQuotationTemplate(
    payload: Record<string, unknown> & { maxDiscountAllowed?: number | string },
  ): Promise<Invoice> {
    const template = await this.createQuotation({
      ...payload,
      customerId: undefined,
    } as unknown as Parameters<BillingService['createQuotation']>[0]);
    template.isTemplate = true;
    template.status = InvoiceStatus.TEMPLATE;
    template.maxDiscountAllowed = payload.maxDiscountAllowed
      ? Number(payload.maxDiscountAllowed)
      : 0;
    await this.invoiceRepo.save(template);

    if (template.createdBy) {
      try {
        const { NotificationPublisher } = await import('../events/publisher/notificationPublisher');
        const { getProductNamesFromInvoice } = await import('./billingHelpers');
        const { TEMPLATE_CREATED } = await import('../constants/notificationTypes');

        await NotificationPublisher.publishInAppRequest({
          recipientId: template.createdBy,
          title: 'Quotation Template Created',
          message: `Your quotation template for ${getProductNamesFromInvoice(template)} has been created successfully with a maximum discount of QAR ${template.maxDiscountAllowed || 0}. You can now assign it to your sales employees.`,
          type: TEMPLATE_CREATED,
          referenceId: template.id,
          referenceType: 'TEMPLATE',
        });
      } catch (err) {
        logger.error('Failed to send notification for createQuotationTemplate', err);
      }
    }

    return template;
  }

  async getQuotationTemplates(): Promise<Invoice[]> {
    const qb = Source.getRepository(Invoice)
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.items', 'items')
      .where('invoice.isTemplate = :isTemplate', { isTemplate: true })
      .orderBy('invoice.createdAt', 'DESC');
    return qb.getMany();
  }

  async assignQuotationTemplate(
    templateId: string,
    employeeIds: string[],
    userId: string,
  ): Promise<void> {
    const template = await this.invoiceRepo.findById(templateId);
    if (!template) {
      throw new AppError('Template not found', 404);
    }

    const assignmentRepo = Source.getRepository(QuotationTemplateAssignment);

    for (const employeeId of employeeIds) {
      // Check if this assignment already exists
      const existingAssignment = await assignmentRepo.findOne({
        where: { templateId, employeeId },
      });

      if (existingAssignment) {
        continue;
      }

      // Create new join record
      const assignment = assignmentRepo.create({
        templateId,
        employeeId,
        assignedBy: userId,
      });
      await assignmentRepo.save(assignment);

      // Clone template to create ASSIGNED invoice for the employee
      const invoiceNumber = await this.invoiceRepo.generateInvoiceNumber();

      // Clone items
      const clonedItems = (template.items || []).map((item) => {
        const newItem = new InvoiceItem();
        newItem.description = item.description;
        newItem.itemType = item.itemType;
        newItem.bwIncludedLimit = item.bwIncludedLimit;
        newItem.colorIncludedLimit = item.colorIncludedLimit;
        newItem.combinedIncludedLimit = item.combinedIncludedLimit;
        newItem.bwExcessRate = item.bwExcessRate;
        newItem.colorExcessRate = item.colorExcessRate;
        newItem.combinedExcessRate = item.combinedExcessRate;
        newItem.bwSlabRanges = item.bwSlabRanges;
        newItem.colorSlabRanges = item.colorSlabRanges;
        newItem.comboSlabRanges = item.comboSlabRanges;
        newItem.quantity = item.quantity;
        newItem.unitPrice = item.unitPrice;
        newItem.productId = item.productId;
        newItem.sparePartId = item.sparePartId;
        newItem.serialNumber = item.serialNumber;
        newItem.modelId = item.modelId;
        return newItem;
      });

      const clone = await this.invoiceRepo.createInvoice({
        invoiceNumber,
        branchId: template.branchId,
        createdBy: employeeId,
        saleType: template.saleType,
        type: InvoiceType.QUOTATION,
        status: InvoiceStatus.ASSIGNED,
        rentType: template.rentType,
        rentPeriod: template.rentPeriod,
        monthlyRent: template.monthlyRent,
        advanceAmount: template.advanceAmount,
        discountPercent: template.discountPercent,
        effectiveFrom: template.effectiveFrom,
        effectiveTo: template.effectiveTo,
        billingCycleInDays: template.billingCycleInDays,
        leaseType: template.leaseType,
        leaseTenureMonths: template.leaseTenureMonths,
        totalLeaseAmount: template.totalLeaseAmount,
        monthlyEmiAmount: template.monthlyEmiAmount,
        monthlyLeaseAmount: template.monthlyLeaseAmount,
        securityDepositAmount: template.securityDepositAmount,
        securityDepositMode: template.securityDepositMode,
        securityDepositReference: template.securityDepositReference,
        securityDepositDate: template.securityDepositDate,
        securityDepositBank: template.securityDepositBank,
        layoutId: template.layoutId,
        notes: template.notes,
        totalAmount: template.totalAmount,
        isTemplate: false,
        templateId,
        assignedEmployeeId: employeeId,
        maxDiscountAllowed: template.maxDiscountAllowed,
        assignedAt: new Date(),
        assignedBy: userId,
        items: clonedItems,
      });

      // 1. Notify the Employee
      try {
        const { NotificationPublisher } = await import('../events/publisher/notificationPublisher');
        const { TEMPLATE_ASSIGNED_EMPLOYEE } = await import('../constants/notificationTypes');
        const { getProductNamesFromInvoice, getInvoicePrice } = await import('./billingHelpers');

        const productName = getProductNamesFromInvoice(template);
        const price = getInvoicePrice(template);

        await NotificationPublisher.publishInAppRequest({
          recipientId: employeeId,
          title: 'New Quotation Template Assigned',
          message: `Your manager has assigned you a quotation template for ${productName} priced at QAR ${price}. You can now customize and send it to customers.`,
          type: TEMPLATE_ASSIGNED_EMPLOYEE,
          referenceId: clone.id,
          referenceType: 'QUOTATION',
        });
      } catch (err) {
        logger.error('Failed to publish assignment notification to employee', err);
      }

      // 2. Notify the Manager (userId)
      try {
        const { NotificationPublisher } = await import('../events/publisher/notificationPublisher');
        const { TEMPLATE_ASSIGNED } = await import('../constants/notificationTypes');
        const { getEmployeeDetails, getProductNamesFromInvoice } = await import('./billingHelpers');

        const empDetails = await getEmployeeDetails(employeeId);
        const employeeName = empDetails ? empDetails.name : 'Employee';
        const productName = getProductNamesFromInvoice(template);

        await NotificationPublisher.publishInAppRequest({
          recipientId: userId,
          title: 'Quotation Template Assigned',
          message: `Your quotation template for ${productName} has been successfully assigned to ${employeeName}.`,
          type: TEMPLATE_ASSIGNED,
          referenceId: template.id,
          referenceType: 'TEMPLATE',
        });
      } catch (err) {
        logger.error('Failed to publish assignment notification to manager', err);
      }
    }
  }

  async getTemplateAssignments(templateId: string): Promise<unknown[]> {
    const assignments = await Source.getRepository(QuotationTemplateAssignment).find({
      where: { templateId },
      order: { assignedAt: 'DESC' },
    });

    const result = [];
    const invoiceRepo = Source.getRepository(Invoice);

    for (const assignment of assignments) {
      const clones = await invoiceRepo.find({
        where: { templateId, assignedEmployeeId: assignment.employeeId },
        order: { createdAt: 'DESC' },
        withDeleted: true,
      });

      let displayStatus = 'Pending Customer';
      let cloneId = null;
      let customerId = null;

      if (clones.length > 0) {
        const latestClone = clones[0];
        cloneId = latestClone.id;
        customerId = latestClone.customerId;

        if (latestClone.deletedAt) {
          displayStatus = 'Deleted';
        } else if (latestClone.status === InvoiceStatus.ASSIGNED && !latestClone.customerId) {
          displayStatus = 'Pending Customer';
        } else if (latestClone.status === InvoiceStatus.DRAFT) {
          displayStatus = 'Draft';
        } else if (latestClone.status === InvoiceStatus.SUPERSEDED) {
          displayStatus = 'Superseded';
        } else if (latestClone.status === InvoiceStatus.RETAKEN) {
          displayStatus = 'Retaken';
        } else {
          displayStatus = latestClone.status;
        }
      }

      result.push({
        id: assignment.id,
        employeeId: assignment.employeeId,
        assignedAt: assignment.assignedAt,
        assignedBy: assignment.assignedBy,
        cloneId,
        customerId,
        status: displayStatus,
      });
    }

    return result;
  }

  async assignCustomerToQuotation(
    id: string,
    customerId: string,
    discountAmount: number | undefined,
    notes: string | undefined,
    user: { role: string; userId: string },
  ): Promise<Invoice> {
    const quotation = await this.invoiceRepo.findById(id);
    if (!quotation) {
      throw new AppError('Quotation not found', 404);
    }

    if (user.role === 'EMPLOYEE' && quotation.assignedEmployeeId !== user.userId) {
      throw new AppError('Forbidden: You can only edit your own assigned quotations', 403);
    }

    if (quotation.templateId && quotation.assignedEmployeeId) {
      const existingActive = await Source.getRepository(Invoice).findOne({
        where: {
          templateId: quotation.templateId,
          assignedEmployeeId: quotation.assignedEmployeeId,
          customerId,
          status: Raw((alias) => `${alias} NOT IN ('SUPERSEDED', 'RETAKEN')`),
        },
      });

      if (existingActive && existingActive.id !== quotation.id) {
        throw new AppError('This customer is already assigned to this template for you.', 400);
      }
    }

    if (discountAmount !== undefined && quotation.maxDiscountAllowed !== undefined) {
      if (Number(discountAmount) > Number(quotation.maxDiscountAllowed)) {
        throw new AppError(
          `Discount exceeds maximum allowed limit of QAR ${quotation.maxDiscountAllowed}.`,
          400,
        );
      }
    }

    const finalDiscount =
      discountAmount !== undefined ? Number(discountAmount) : Number(quotation.discountAmount || 0);

    if (!quotation.customerId) {
      quotation.customerId = customerId;
      quotation.discountAmount = finalDiscount;
      if (notes !== undefined) quotation.notes = notes;
      quotation.status = InvoiceStatus.DRAFT;

      if (
        [SaleType.SALE, SaleType.PRODUCT_SALE, SaleType.SPAREPART_SALE].includes(quotation.saleType)
      ) {
        const grossAmount = Number(quotation.grossAmount || quotation.totalAmount || 0);
        quotation.totalAmount = grossAmount - finalDiscount;
      }

      await this.invoiceRepo.save(quotation);
      return quotation;
    }

    if (quotation.customerId !== customerId) {
      const invoiceNumber = await this.invoiceRepo.generateInvoiceNumber();

      const clonedItems = (quotation.items || []).map((item) => {
        const newItem = new InvoiceItem();
        newItem.description = item.description;
        newItem.itemType = item.itemType;
        newItem.bwIncludedLimit = item.bwIncludedLimit;
        newItem.colorIncludedLimit = item.colorIncludedLimit;
        newItem.combinedIncludedLimit = item.combinedIncludedLimit;
        newItem.bwExcessRate = item.bwExcessRate;
        newItem.colorExcessRate = item.colorExcessRate;
        newItem.combinedExcessRate = item.combinedExcessRate;
        newItem.bwSlabRanges = item.bwSlabRanges;
        newItem.colorSlabRanges = item.colorSlabRanges;
        newItem.comboSlabRanges = item.comboSlabRanges;
        newItem.quantity = item.quantity;
        newItem.unitPrice = item.unitPrice;
        newItem.productId = item.productId;
        newItem.sparePartId = item.sparePartId;
        newItem.serialNumber = item.serialNumber;
        newItem.modelId = item.modelId;
        return newItem;
      });

      const clone = await this.invoiceRepo.createInvoice({
        invoiceNumber,
        branchId: quotation.branchId,
        createdBy: quotation.createdBy,
        customerId,
        saleType: quotation.saleType,
        type: InvoiceType.QUOTATION,
        status: InvoiceStatus.DRAFT,
        rentType: quotation.rentType,
        rentPeriod: quotation.rentPeriod,
        monthlyRent: quotation.monthlyRent,
        advanceAmount: quotation.advanceAmount,
        discountPercent: quotation.discountPercent,
        effectiveFrom: quotation.effectiveFrom,
        effectiveTo: quotation.effectiveTo,
        billingCycleInDays: quotation.billingCycleInDays,
        leaseType: quotation.leaseType,
        leaseTenureMonths: quotation.leaseTenureMonths,
        totalLeaseAmount: quotation.totalLeaseAmount,
        monthlyEmiAmount: quotation.monthlyEmiAmount,
        monthlyLeaseAmount: quotation.monthlyLeaseAmount,
        securityDepositAmount: quotation.securityDepositAmount,
        securityDepositMode: quotation.securityDepositMode,
        securityDepositReference: quotation.securityDepositReference,
        securityDepositDate: quotation.securityDepositDate,
        securityDepositBank: quotation.securityDepositBank,
        layoutId: quotation.layoutId,
        notes: notes !== undefined ? notes : quotation.notes,
        isTemplate: false,
        templateId: quotation.templateId,
        assignedEmployeeId: quotation.assignedEmployeeId,
        maxDiscountAllowed: quotation.maxDiscountAllowed,
        assignedAt: quotation.assignedAt,
        assignedBy: quotation.assignedBy,
        discountAmount: finalDiscount,
        totalAmount: [SaleType.SALE, SaleType.PRODUCT_SALE, SaleType.SPAREPART_SALE].includes(
          quotation.saleType,
        )
          ? Number(quotation.grossAmount || 0) - finalDiscount
          : quotation.totalAmount,
        grossAmount: quotation.grossAmount,
        items: clonedItems,
      });

      quotation.status = InvoiceStatus.SUPERSEDED;
      await this.invoiceRepo.save(quotation);

      try {
        const { NotificationPublisher } = await import('../events/publisher/notificationPublisher');
        const { CUSTOMER_SWAPPED } = await import('../constants/notificationTypes');
        const { getProductNamesFromInvoice } = await import('./billingHelpers');

        const productName = getProductNamesFromInvoice(quotation);

        await NotificationPublisher.publishInAppRequest({
          recipientId: quotation.createdBy,
          title: 'Customer Swapped on Quotation',
          message: `The customer on your quotation for ${productName} has been updated. A new draft has been created: ${clone.invoiceNumber}.`,
          type: CUSTOMER_SWAPPED,
          referenceId: clone.id,
          referenceType: 'QUOTATION',
        });
      } catch (err) {
        logger.error('Failed to publish customer swap notification', err);
      }

      return clone;
    }

    quotation.discountAmount = finalDiscount;
    if (notes !== undefined) quotation.notes = notes;

    if (
      [SaleType.SALE, SaleType.PRODUCT_SALE, SaleType.SPAREPART_SALE].includes(quotation.saleType)
    ) {
      const grossAmount = Number(quotation.grossAmount || quotation.totalAmount || 0);
      quotation.totalAmount = grossAmount - finalDiscount;
    }

    await this.invoiceRepo.save(quotation);
    return quotation;
  }

  async retakeQuotationAssignment(id: string, userId: string): Promise<Invoice> {
    const quotation = await this.invoiceRepo.findById(id);
    if (!quotation) {
      throw new AppError('Quotation not found', 404);
    }

    quotation.status = InvoiceStatus.RETAKEN;
    quotation.retakenAt = new Date();
    quotation.retakenBy = userId;
    await this.invoiceRepo.save(quotation);

    try {
      const { NotificationPublisher } = await import('../events/publisher/notificationPublisher');
      const { TEMPLATE_RETAKEN_EMPLOYEE, TEMPLATE_RETAKEN } =
        await import('../constants/notificationTypes');
      const { getEmployeeDetails, getProductNamesFromInvoice } = await import('./billingHelpers');

      const productName = getProductNamesFromInvoice(quotation);
      const empDetails = await getEmployeeDetails(quotation.createdBy);
      const employeeName = empDetails ? empDetails.name : 'Employee';

      // 1. Notify the Employee
      await NotificationPublisher.publishInAppRequest({
        recipientId: quotation.createdBy,
        title: 'Quotation Assignment Retaken',
        message: `Your manager has retaken the quotation for ${productName}.`,
        type: TEMPLATE_RETAKEN_EMPLOYEE,
        referenceId: quotation.id,
        referenceType: 'QUOTATION',
      });

      // 2. Notify the Manager
      await NotificationPublisher.publishInAppRequest({
        recipientId: userId,
        title: 'Quotation Assignment Retaken',
        message: `You have successfully retaken the quotation for ${productName} from ${employeeName}.`,
        type: TEMPLATE_RETAKEN,
        referenceId: quotation.templateId || quotation.id,
        referenceType: quotation.templateId ? 'TEMPLATE' : 'QUOTATION',
      });
    } catch (err) {
      logger.error('Failed to publish retake notification', err);
    }

    return quotation;
  }

  async bulkRetakeQuotationAssignments(templateId: string, userId: string): Promise<void> {
    const invoices = await Source.getRepository(Invoice).find({
      where: {
        templateId,
        status: In([InvoiceStatus.ASSIGNED, InvoiceStatus.DRAFT]),
      },
      relations: ['items'],
    });

    for (const quotation of invoices) {
      quotation.status = InvoiceStatus.RETAKEN;
      quotation.retakenAt = new Date();
      quotation.retakenBy = userId;
      await this.invoiceRepo.save(quotation);

      try {
        const { NotificationPublisher } = await import('../events/publisher/notificationPublisher');
        const { TEMPLATE_RETAKEN_EMPLOYEE } = await import('../constants/notificationTypes');
        const { getProductNamesFromInvoice } = await import('./billingHelpers');

        const productName = getProductNamesFromInvoice(quotation);

        // Notify the Employee
        await NotificationPublisher.publishInAppRequest({
          recipientId: quotation.createdBy,
          title: 'Quotation Assignment Retaken',
          message: `Your manager has retaken the quotation for ${productName}.`,
          type: TEMPLATE_RETAKEN_EMPLOYEE,
          referenceId: quotation.id,
          referenceType: 'QUOTATION',
        });
      } catch (err) {
        logger.error('Failed to publish bulk retake notification to employee', err);
      }
    }

    // Send single summary notification to the manager
    try {
      const { NotificationPublisher } = await import('../events/publisher/notificationPublisher');
      const { TEMPLATE_RETAKEN } = await import('../constants/notificationTypes');
      const { getProductNamesFromInvoice } = await import('./billingHelpers');

      const template = await this.invoiceRepo.findById(templateId);
      const productName = template ? getProductNamesFromInvoice(template) : 'Product/Spare Part';

      await NotificationPublisher.publishInAppRequest({
        recipientId: userId,
        title: 'Quotation Assignment Retaken',
        message: `You have successfully retaken the quotation template for ${productName} from all assigned sales employees.`,
        type: TEMPLATE_RETAKEN,
        referenceId: templateId,
        referenceType: 'TEMPLATE',
      });
    } catch (err) {
      logger.error('Failed to publish bulk retake summary notification to manager', err);
    }
  }

  async getEmployeeAssignedQuotations(employeeId: string): Promise<Invoice[]> {
    const qb = Source.getRepository(Invoice)
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.items', 'items')
      .where('invoice.assignedEmployeeId = :employeeId', { employeeId })
      .andWhere('invoice.isTemplate = :isTemplate', { isTemplate: false })
      .orderBy('invoice.createdAt', 'DESC');
    return qb.getMany();
  }

  async deleteInvoice(id: string): Promise<void> {
    const invoice = await this.invoiceRepo.findById(id);
    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    if (invoice.isTemplate) {
      const activeClones = await Source.getRepository(Invoice).find({
        where: {
          templateId: id,
          isTemplate: false,
        },
      });

      const progressed = activeClones.filter(
        (clone) =>
          ![
            InvoiceStatus.ASSIGNED,
            InvoiceStatus.DRAFT,
            InvoiceStatus.RETAKEN,
            InvoiceStatus.SUPERSEDED,
          ].includes(clone.status),
      );

      if (progressed.length > 0) {
        throw new AppError(
          'Cannot delete template: assignments have progressed beyond DRAFT stage.',
          400,
        );
      }

      await Source.getRepository(Invoice).softRemove(invoice);

      await Source.getRepository(QuotationTemplateAssignment).delete({ templateId: id });

      if (invoice.createdBy) {
        try {
          const { NotificationPublisher } =
            await import('../events/publisher/notificationPublisher');
          const { getProductNamesFromInvoice } = await import('./billingHelpers');
          const { TEMPLATE_DELETED } = await import('../constants/notificationTypes');

          await NotificationPublisher.publishInAppRequest({
            recipientId: invoice.createdBy,
            title: 'Quotation Template Deleted',
            message: `Your quotation template for ${getProductNamesFromInvoice(invoice)} has been deleted.`,
            type: TEMPLATE_DELETED,
            referenceId: invoice.id,
            referenceType: 'TEMPLATE',
          });
        } catch (err) {
          logger.error('Failed to send notification for deleteInvoice template', err);
        }
      }

      if (activeClones.length > 0) {
        await Source.getRepository(Invoice).softRemove(activeClones);
      }
    } else {
      if (
        ![
          InvoiceStatus.ASSIGNED,
          InvoiceStatus.DRAFT,
          InvoiceStatus.RETAKEN,
          InvoiceStatus.SUPERSEDED,
        ].includes(invoice.status)
      ) {
        throw new AppError('Cannot delete progressed invoices.', 400);
      }
      await Source.getRepository(Invoice).softRemove(invoice);
    }
  }

  async createServiceQuotation(payload: {
    customerId: string | null;
    branchId: string;
    createdBy: string;
    serviceTicketId: string;
    items: {
      description: string;
      quantity: number;
      unitPrice: number;
      isFree?: boolean;
    }[];
    saleType: string;
    status: string;
    visitChargeAmount?: number;
    visitChargeMethod?: string | null;
    totalDiscountAmount?: number;
    technicianNoteToFinance?: string | null;
  }) {
    const invoiceNumber = await this.invoiceRepo.generateInvoiceNumber();
    const invoiceRepo = Source.getRepository(Invoice);
    const itemsTotal = payload.items.reduce(
      (sum, item) => sum + item.quantity * (item.isFree ? 0 : item.unitPrice),
      0,
    );
    const visitCharge = Number(payload.visitChargeAmount) || 0;
    const discount = Number(payload.totalDiscountAmount) || 0;
    const finalTotal =
      itemsTotal + (payload.visitChargeMethod === 'ADDED_TO_ESTIMATE' ? visitCharge : 0) - discount;

    const invoice = invoiceRepo.create({
      invoiceNumber,
      customerId: payload.customerId || undefined,
      branchId: payload.branchId,
      createdBy: payload.createdBy,
      serviceTicketId: payload.serviceTicketId,
      saleType: payload.saleType as SaleType,
      status: payload.status as InvoiceStatus,
      billType: BillType.SERVICE,
      visitChargeAmount: visitCharge,
      visitChargeMethod: payload.visitChargeMethod || null,
      totalDiscountAmount: discount,
      technicianNoteToFinance: payload.technicianNoteToFinance || null,
      totalAmount: finalTotal,
    });

    const savedInvoice = await invoiceRepo.save(invoice);

    const invoiceItemRepo = Source.getRepository(InvoiceItem);
    const invoiceItems = payload.items.map((it) => {
      const invItem = new InvoiceItem();
      invItem.invoice = savedInvoice;
      invItem.itemType = ItemType.PRODUCT;
      invItem.description = it.description;
      invItem.quantity = it.quantity;
      invItem.unitPrice = it.isFree ? 0 : it.unitPrice;
      return invItem;
    });

    await invoiceItemRepo.save(invoiceItems);

    // Break the circular reference to prevent JSON serialization errors
    invoiceItems.forEach((item) => {
      delete (item as { invoice?: unknown }).invoice;
    });

    savedInvoice.items = invoiceItems;
    return savedInvoice;
  }

  async reviseEstimate(
    id: string,
    payload: {
      items: { description: string; quantity: number; unitPrice: number; isFree?: boolean }[];
      visitChargeAmount: number;
      visitChargeMethod: string;
      discountAmount: number;
      technicianNoteToFinance: string;
    },
    userId: string,
  ): Promise<Invoice> {
    logger.info(`Estimate ${id} revised by user ${userId}`);
    const invoice = await this.invoiceRepo.findById(id);
    if (!invoice) throw new AppError('Quotation not found', 404);

    if (invoice.billType !== BillType.SERVICE) {
      throw new AppError('Only service quotations can be revised', 400);
    }

    if (
      invoice.status === InvoiceStatus.CUSTOMER_ACCEPTED ||
      invoice.status === InvoiceStatus.ACTIVE_CONTRACT ||
      invoice.status === InvoiceStatus.PAID
    ) {
      throw new AppError(
        'Cannot revise an estimate that has already been approved by the customer',
        400,
      );
    }

    // Clear existing items
    await this.invoiceRepo.clearItems(invoice.id);

    const invoiceItemRepo = Source.getRepository(InvoiceItem);
    const invoiceItems = payload.items.map((it) => {
      const invItem = new InvoiceItem();
      invItem.invoice = invoice;
      invItem.itemType = ItemType.PRODUCT;
      invItem.description = it.description;
      invItem.quantity = it.quantity;
      invItem.unitPrice = it.isFree ? 0 : it.unitPrice;
      return invItem;
    });
    await invoiceItemRepo.save(invoiceItems);

    const itemsTotal = payload.items.reduce(
      (sum, item) => sum + item.quantity * (item.isFree ? 0 : item.unitPrice),
      0,
    );
    const visitCharge = Number(payload.visitChargeAmount) || 0;
    const discount = Number(payload.discountAmount) || 0;
    const finalTotal =
      itemsTotal + (payload.visitChargeMethod === 'ADDED_TO_ESTIMATE' ? visitCharge : 0) - discount;

    invoice.visitChargeAmount = visitCharge;
    invoice.visitChargeMethod = payload.visitChargeMethod || null;
    invoice.totalDiscountAmount = discount;
    invoice.technicianNoteToFinance = payload.technicianNoteToFinance;
    invoice.totalAmount = finalTotal;

    invoice.status = InvoiceStatus.WAITING_FINANCE_APPROVAL;
    invoice.estimateExpired = false;
    invoice.revisionCount = (invoice.revisionCount || 0) + 1;

    const saved = await this.invoiceRepo.save(invoice);

    // Break circular reference
    invoiceItems.forEach((item) => {
      delete (item as { invoice?: unknown }).invoice;
    });
    saved.items = invoiceItems;

    // Notify Finance Staff
    if (saved.branchId) {
      try {
        const { NotificationPublisher } = await import('../events/publisher/notificationPublisher');
        const { SERVICE_ESTIMATE_REVISED } = await import('../constants/notificationTypes');
        const { getFinanceEmployeesByBranch, getCustomerName } = await import('./billingHelpers');

        const customerName = await getCustomerName(saved.customerId);
        const financeIds = await getFinanceEmployeesByBranch(saved.branchId);

        for (const financeId of financeIds) {
          try {
            await NotificationPublisher.publishInAppRequest({
              recipientId: financeId,
              title: 'Estimate Revision Submitted',
              message: `A revised service estimate for customer ${customerName} (ticket ${invoice.serviceTicketId}) has been submitted for review.`,
              type: SERVICE_ESTIMATE_REVISED,
              referenceId: saved.id,
              referenceType: 'QUOTATION',
            });
          } catch (err) {
            logger.error(
              `Failed to publish service estimate revised notification to finance employee ${financeId}`,
              err,
            );
          }
        }
      } catch (err) {
        logger.error('Failed to notify finance staff about estimate revision', err);
      }
    }

    return saved;
  }

  async financeExtendValidity(
    id: string,
    payload: {
      extensionDays: number;
      extensionFee: number;
    },
    userId: string,
  ): Promise<Invoice> {
    const invoice = await this.invoiceRepo.findById(id);
    if (!invoice) throw new AppError('Quotation not found', 404);

    if (
      invoice.status !== InvoiceStatus.EMPLOYEE_APPROVED &&
      invoice.status !== InvoiceStatus.WAITING_FINANCE_APPROVAL
    ) {
      throw new AppError('Quotation must be in a pending approval state', 400);
    }

    const days = Number(payload.extensionDays) || 0;
    const fee = Number(payload.extensionFee) || 0;

    const baseValidUntil = new Date();
    const totalDays = 30 + days;
    baseValidUntil.setDate(baseValidUntil.getDate() + totalDays);

    invoice.estimateValidUntil = baseValidUntil;
    invoice.estimateExpired = false;
    invoice.validityExtensionDays = days;
    invoice.validityExtensionFee = fee;

    const oldStatus = invoice.status;
    invoice.status = InvoiceStatus.FINANCE_APPROVED;
    invoice.financeApprovedBy = userId;
    invoice.financeApprovedAt = new Date();

    if (fee > 0) {
      invoice.validityExtensionFeeAdded = true;
      const invoiceItemRepo = Source.getRepository(InvoiceItem);
      const feeItem = new InvoiceItem();
      feeItem.invoice = invoice;
      feeItem.itemType = ItemType.PRICING_RULE;
      feeItem.description = `Validity Extension Fee (${days} Days)`;
      feeItem.quantity = 1;
      feeItem.unitPrice = fee;
      await invoiceItemRepo.save(feeItem);

      invoice.totalAmount = Number(invoice.totalAmount || 0) + fee;
    }

    const saved = await this.invoiceRepo.save(invoice);
    await logAudit(
      invoice.id,
      'STATUS_CHANGE',
      userId,
      `Finance approved quotation with validity extension. Days: ${days}, Fee: ${fee}.`,
      oldStatus,
      InvoiceStatus.FINANCE_APPROVED,
    );

    // Callbacks to ven_inv_service
    if (invoice.serviceTicketId) {
      try {
        const { sign } = await import('jsonwebtoken');
        const token = sign(
          { userId: 'billing_service', role: 'ADMIN' },
          process.env.ACCESS_SECRET as string,
          { expiresIn: '1m' },
        );

        const venInvUrl = process.env.VENDOR_INVENTORY_SERVICE_URL || 'http://localhost:3003';
        await globalThis.fetch(
          `${venInvUrl}/service/tickets/${invoice.serviceTicketId}/quotation-link`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              serviceQuotationId: invoice.id,
              status: 'FINANCE_APPROVED',
            }),
          },
        );
        logger.info(
          `[BillingService] Sent finance approval callback for service ticket ${invoice.serviceTicketId}`,
        );

        if (invoice.billType === 'SERVICE') {
          await globalThis.fetch(
            `${venInvUrl}/service/tickets/${invoice.serviceTicketId}/finance-approved`,
            {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
            },
          );
        }
      } catch (callbackErr) {
        logger.error('[BillingService] Failed to call service ticket callback:', callbackErr);
      }
    }

    return saved;
  }

  async reassignCustomer(
    id: string,
    userId: string,
    payload: {
      newCustomerId: string;
      discountAmount?: number;
    },
  ) {
    const originalInvoice = await this.invoiceRepo.findById(id);
    if (!originalInvoice) {
      throw new AppError('Quotation not found', 404);
    }
    if (originalInvoice.type !== InvoiceType.QUOTATION) {
      throw new AppError('Only quotations can be reassigned', 400);
    }

    // Generate new quotation number
    const newInvoiceNumber = await this.invoiceRepo.generateInvoiceNumber();

    // Clone items
    const newItems: InvoiceItem[] = [];
    let calculatedTotal = 0;
    if (originalInvoice.items) {
      for (const item of originalInvoice.items) {
        const clonedItem = new InvoiceItem();
        clonedItem.itemType = item.itemType;
        clonedItem.description = item.description;
        clonedItem.quantity = item.quantity;
        clonedItem.unitPrice = item.unitPrice;
        clonedItem.modelId = item.modelId;
        clonedItem.productId = item.productId;
        clonedItem.sparePartId = item.sparePartId;
        clonedItem.bwIncludedLimit = item.bwIncludedLimit;
        clonedItem.colorIncludedLimit = item.colorIncludedLimit;
        clonedItem.combinedIncludedLimit = item.combinedIncludedLimit;
        clonedItem.bwExcessRate = item.bwExcessRate;
        clonedItem.colorExcessRate = item.colorExcessRate;
        clonedItem.combinedExcessRate = item.combinedExcessRate;
        clonedItem.bwSlabRanges = item.bwSlabRanges;
        clonedItem.colorSlabRanges = item.colorSlabRanges;
        clonedItem.comboSlabRanges = item.comboSlabRanges;
        clonedItem.discountAmount = item.discountAmount;
        newItems.push(clonedItem);

        calculatedTotal += (item.quantity || 0) * (item.unitPrice || 0);
      }
    }

    // Validate discounts
    await this.validateQuotationDiscounts(newItems);

    const valDays =
      originalInvoice.validityDays !== undefined ? Number(originalInvoice.validityDays) : 30;
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + valDays);

    const newQuotation = await this.invoiceRepo.createInvoice({
      invoiceNumber: newInvoiceNumber,
      branchId: originalInvoice.branchId,
      createdBy: userId,
      customerId: payload.newCustomerId,
      saleType: originalInvoice.saleType,
      type: InvoiceType.QUOTATION,
      status: InvoiceStatus.DRAFT,
      rentType: originalInvoice.rentType,
      rentPeriod: originalInvoice.rentPeriod,
      monthlyRent: originalInvoice.monthlyRent,
      advanceAmount: originalInvoice.advanceAmount,
      discountPercent: originalInvoice.discountPercent,
      effectiveFrom: originalInvoice.effectiveFrom,
      effectiveTo: originalInvoice.effectiveTo,
      billingCycleInDays: originalInvoice.billingCycleInDays,
      leaseType: originalInvoice.leaseType,
      leaseTenureMonths: originalInvoice.leaseTenureMonths,
      totalLeaseAmount: originalInvoice.totalLeaseAmount,
      monthlyEmiAmount: originalInvoice.monthlyEmiAmount,
      monthlyLeaseAmount: originalInvoice.monthlyLeaseAmount,
      securityDepositAmount: originalInvoice.securityDepositAmount,
      securityDepositMode: originalInvoice.securityDepositMode,
      securityDepositReference: originalInvoice.securityDepositReference,
      securityDepositDate: originalInvoice.securityDepositDate,
      securityDepositBank: originalInvoice.securityDepositBank,
      layoutId: originalInvoice.layoutId,
      notes: originalInvoice.notes,
      totalAmount: 0,
      items: newItems,
      validityDays: valDays,
      expiryDate: expDate,
      isConverted: false,
    });

    // 3. Finalize Amounts for SALE / LEASE / RENT
    if (
      [SaleType.SALE, SaleType.PRODUCT_SALE, SaleType.SPAREPART_SALE].includes(
        newQuotation.saleType,
      )
    ) {
      const discAmount =
        payload.discountAmount !== undefined
          ? Number(payload.discountAmount)
          : Number(originalInvoice.discountAmount || 0);
      const discPercent = newQuotation.discountPercent ? Number(newQuotation.discountPercent) : 0;

      if (discAmount > 0) {
        newQuotation.discountAmount = discAmount;
        newQuotation.grossAmount = calculatedTotal;
        newQuotation.totalAmount = calculatedTotal - discAmount;
      } else {
        newQuotation.grossAmount = calculatedTotal;
        newQuotation.discountAmount = calculatedTotal * (discPercent / 100);
        newQuotation.totalAmount = calculatedTotal - (newQuotation.discountAmount || 0);
      }
    } else if (newQuotation.saleType === SaleType.LEASE) {
      newQuotation.totalAmount = Number(newQuotation.advanceAmount || 0);
    } else {
      newQuotation.totalAmount =
        calculatedTotal === 0 ? Number(newQuotation.advanceAmount || 0) : calculatedTotal;
    }

    await this.invoiceRepo.save(newQuotation);

    // Audit log for clone creation
    await logAudit(
      newQuotation.id,
      'CREATION',
      userId,
      `Cloned from quotation ${originalInvoice.invoiceNumber} with customer re-assigned to ${payload.newCustomerId}`,
    );

    // Mark original as SUPERSEDED
    const oldStatus = originalInvoice.status;
    originalInvoice.status = InvoiceStatus.SUPERSEDED;
    await this.invoiceRepo.save(originalInvoice);

    // Audit log for old quotation superseded
    await logAudit(
      originalInvoice.id,
      'STATUS_CHANGE',
      userId,
      `Quotation superseded by cloned quotation ${newQuotation.invoiceNumber} for customer reassignment`,
      oldStatus,
      InvoiceStatus.SUPERSEDED,
    );

    return newQuotation;
  }

  async recordPayment(
    invoiceId: string,
    data: {
      paymentMode: string;
      referenceNumber?: string;
      amount: number;
      transactionDate?: string | Date;
      remarks?: string;
      isSecurityDeposit?: boolean;
    },
    userId?: string,
  ): Promise<PaymentTransaction> {
    const invoice = await this.invoiceRepo.findById(invoiceId);
    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    const isActiveOrInvoiced =
      invoice.status === InvoiceStatus.ACTIVE_CONTRACT ||
      invoice.status === InvoiceStatus.INVOICED ||
      invoice.status === InvoiceStatus.PAID;

    const isSecurityDeposit =
      data.isSecurityDeposit === true || data.remarks?.toLowerCase() === 'security deposit';

    if (!isActiveOrInvoiced && !isSecurityDeposit) {
      throw new AppError(
        'Payment is only allowed for active contracts/invoiced sales, unless it is a Security Deposit',
        400,
      );
    }

    // Save transaction
    const transactionRepo = Source.getRepository(PaymentTransaction);
    const transaction = new PaymentTransaction();
    transaction.invoiceId = invoiceId;
    transaction.paymentMode = data.paymentMode;
    transaction.referenceNumber = data.referenceNumber;
    transaction.amount = Number(data.amount);
    transaction.transactionDate = data.transactionDate
      ? new Date(data.transactionDate)
      : new Date();
    transaction.recordedBy = userId;
    transaction.remarks = data.remarks || (isSecurityDeposit ? 'Security Deposit' : undefined);

    await transactionRepo.save(transaction);

    // If active or invoiced or security deposit, we can maintain the ledger.
    const ledgerRepo = Source.getRepository(InvoiceLedger);
    let ledger = await ledgerRepo.findOne({ where: { invoiceId } });

    if (!ledger && (isActiveOrInvoiced || isSecurityDeposit)) {
      ledger = new InvoiceLedger();
      ledger.invoiceId = invoiceId;
      ledger.totalAmount = Number(invoice.totalAmount || 0);
      ledger.paidAmount = 0;
      ledger.balanceAmount = Number(invoice.totalAmount || 0);
    }

    if (ledger) {
      ledger.paidAmount = Number(ledger.paidAmount) + Number(transaction.amount);
      ledger.balanceAmount = Math.max(0, Number(ledger.totalAmount) - Number(ledger.paidAmount));
      await ledgerRepo.save(ledger);

      // Check if invoice is an opening balance entry
      if (invoice.isOpeningEntry || invoice.type === 'OPENING') {
        const { OpeningBalanceEntry } = await import('../entities/openingBalanceEntryEntity');
        const openingBalanceRepo = Source.getRepository(OpeningBalanceEntry);
        const entry = await openingBalanceRepo.findOne({ where: { invoiceId: invoice.id } });
        if (entry) {
          entry.remainingBalance = ledger.balanceAmount;
          entry.isFullySettled = ledger.balanceAmount === 0;
          await openingBalanceRepo.save(entry);

          await logAudit(
            entry.id,
            'UPDATE',
            userId || 'SYSTEM',
            `Updated opening balance entry ${entry.entryNumber}: remaining balance is now QAR ${entry.remainingBalance}.`,
          );
        }
      }

      // Check if invoice is fully paid
      if (ledger.balanceAmount === 0 && invoice.status !== InvoiceStatus.PAID) {
        const oldStatus = invoice.status;
        invoice.status = InvoiceStatus.PAID;
        await this.invoiceRepo.save(invoice);

        // Audit log status change
        await logAudit(
          invoice.id,
          'STATUS_CHANGE',
          userId || 'SYSTEM',
          `Invoice fully paid via payment transaction. Status updated to PAID.`,
          oldStatus,
          InvoiceStatus.PAID,
        );
      }
    }

    // Audit log payment creation
    await logAudit(
      invoice.id,
      'PAYMENT_RECORDED',
      userId || 'SYSTEM',
      `Payment transaction of QAR ${transaction.amount} recorded via ${transaction.paymentMode}.`,
    );

    return transaction;
  }

  async getInvoiceLedger(
    invoiceId: string,
  ): Promise<{ ledger: InvoiceLedger[]; transactions: PaymentTransaction[] }> {
    const ledgerRepo = Source.getRepository(InvoiceLedger);
    const transactionRepo = Source.getRepository(PaymentTransaction);

    const ledger = await ledgerRepo.find({ where: { invoiceId }, order: { createdAt: 'DESC' } });
    const transactions = await transactionRepo.find({
      where: { invoiceId },
      order: { transactionDate: 'DESC' },
    });

    return { ledger, transactions };
  }
}
