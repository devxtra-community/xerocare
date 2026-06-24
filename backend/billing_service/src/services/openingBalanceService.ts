import { Source } from '../config/dataSource';
import { OpeningBalanceEntry, BalanceType } from '../entities/openingBalanceEntryEntity';
import { Invoice } from '../entities/invoiceEntity';
import { InvoiceLedger } from '../entities/invoiceLedgerEntity';
import { InvoiceType } from '../entities/enums/invoiceType';
import { InvoiceStatus } from '../entities/enums/invoiceStatus';
import { SaleType } from '../entities/enums/saleType';
import { BillType } from '../entities/enums/billType';
import { AppError } from '../errors/appError';
import { logger } from '../config/logger';
import { sign } from 'jsonwebtoken';
import { Like } from 'typeorm';
import { getFinanceEmployeesByBranch } from './billingHelpers';
import { NotificationPublisher } from '../events/publisher/notificationPublisher';
import { logAudit } from './auditLogService';

export interface CreateOpeningBalanceEntryDto {
  customerId: string;
  balanceType: BalanceType;
  originalTotalAmount: number;
  alreadyPaidAmount: number;
  monthlyBillingAmount?: number;
  billingCycleInDays?: number;
  nextPaymentDueDate?: string | Date;
  totalContractMonths?: number;
  monthsCompleted?: number;
  productBrand?: string;
  productModel?: string;
  serialNumber?: string;
  productId?: string;
  notes?: string;
  migratedAt?: string | Date;
  contractStartDate?: string | Date;
}

export interface UpdateOpeningBalanceEntryDto {
  monthlyBillingAmount?: number;
  billingCycleInDays?: number;
  nextPaymentDueDate?: string | Date;
  totalContractMonths?: number;
  monthsCompleted?: number;
  productBrand?: string;
  productModel?: string;
  serialNumber?: string;
  productId?: string;
  notes?: string;
  contractStartDate?: string | Date;
}

export interface GetEntriesOptions {
  page?: number;
  limit?: number;
  customerId?: string;
  balanceType?: BalanceType;
  isFullySettled?: boolean;
}

function mapBalanceTypeToBillType(balanceType: BalanceType): BillType {
  switch (balanceType) {
    case BalanceType.SALE_OUTSTANDING:
      return BillType.SALE;
    case BalanceType.RENT_CONTRACT:
      return BillType.RENT;
    case BalanceType.LEASE_CONTRACT:
      return BillType.LEASE;
    case BalanceType.SERVICE_DEBT:
    case BalanceType.OTHER_DEBT:
    default:
      return BillType.SERVICE;
  }
}

function mapBalanceTypeToSaleType(balanceType: BalanceType): SaleType {
  switch (balanceType) {
    case BalanceType.SALE_OUTSTANDING:
      return SaleType.SALE;
    case BalanceType.RENT_CONTRACT:
      return SaleType.RENT;
    case BalanceType.LEASE_CONTRACT:
      return SaleType.LEASE;
    case BalanceType.SERVICE_DEBT:
    case BalanceType.OTHER_DEBT:
    default:
      return SaleType.SERVICE;
  }
}

export interface CustomerValidationResult {
  branch_id?: string;
  [key: string]: unknown;
}

export async function validateCustomerBranch(
  customerId: string,
  userBranchId: string | undefined,
  userRole?: string,
): Promise<CustomerValidationResult> {
  const crmServiceUrl = process.env.CRM_SERVICE_URL || 'http://localhost:3005';
  try {
    const token = sign(
      { userId: 'billing_service', role: 'ADMIN' },
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
      throw new AppError(`Customer validation failed: Customer not found`, 404);
    }

    const json = await response.json();
    const customer = json?.data;
    if (!customer) {
      throw new AppError(`Customer validation failed: Customer data is empty`, 404);
    }

    // Branch isolation validation
    if (userRole !== 'ADMIN' && userRole !== 'FINANCE') {
      if (userBranchId && customer.branch_id && customer.branch_id !== userBranchId) {
        throw new AppError('Access denied: Customer belongs to a different branch', 403);
      }
    }
    return customer;
  } catch (err) {
    if (err instanceof AppError) throw err;
    logger.error('Error during customer branch validation:', err);
    throw new AppError('Failed to validate customer branch', 500);
  }
}

export async function fetchBranchName(branchId: string): Promise<string> {
  const vendorInventoryServiceUrl = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3003';
  try {
    const token = sign(
      { userId: 'billing_service', role: 'ADMIN' },
      process.env.ACCESS_SECRET as string,
      { expiresIn: '1m' },
    );

    const response = await fetch(`${vendorInventoryServiceUrl}/branch/${branchId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return 'Unknown Branch';
    }

    const json = await response.json();
    return json?.data?.name || 'Unknown Branch';
  } catch (err) {
    logger.error('Error fetching branch name:', err);
    return 'Unknown Branch';
  }
}

export class OpeningBalanceService {
  private entryRepo = Source.getRepository(OpeningBalanceEntry);
  private invoiceRepo = Source.getRepository(Invoice);
  private ledgerRepo = Source.getRepository(InvoiceLedger);

  async createEntry(
    dto: CreateOpeningBalanceEntryDto,
    user: { userId: string; role: string; branchId?: string },
  ) {
    // 1. Validate Customer Branch & Retrieve Customer Entity
    const customer = await validateCustomerBranch(dto.customerId, user.branchId, user.role);
    const branchId = customer.branch_id || user.branchId;
    if (!branchId) {
      throw new AppError('Branch assignment could not be resolved for this customer/user', 400);
    }

    // Fetch branch name from Inventory Service
    const branchName = await fetchBranchName(branchId);

    // Calculate derived values
    const openingBalance = Number(dto.originalTotalAmount) - Number(dto.alreadyPaidAmount);
    if (openingBalance < 0) {
      throw new AppError('Already paid amount cannot exceed original total amount', 400);
    }

    const totalMonths = dto.totalContractMonths || 0;
    const completedMonths = dto.monthsCompleted || 0;
    const monthsRemaining = Math.max(0, totalMonths - completedMonths);
    const remainingContractValue = (dto.monthlyBillingAmount || 0) * monthsRemaining;

    // Generate unique serial numbers
    const today = new Date();
    const yearMonth = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;

    // Count entries for sequence
    const count = await this.entryRepo.count({
      where: {
        entryNumber: Like(`OBE-${yearMonth}-%`),
      },
      withDeleted: true,
    });

    const sequenceStr = String(count + 1).padStart(4, '0');
    const entryNumber = `OBE-${yearMonth}-${sequenceStr}`;
    const invoiceNumber = `OPN-${yearMonth}-${sequenceStr}`;

    // Create linked invoice
    const invoiceStatus = openingBalance <= 0 ? InvoiceStatus.PAID : InvoiceStatus.ACTIVE_CONTRACT;
    const invoice = this.invoiceRepo.create({
      invoiceNumber,
      type: InvoiceType.OPENING,
      billType: mapBalanceTypeToBillType(dto.balanceType),
      saleType: mapBalanceTypeToSaleType(dto.balanceType),
      customerId: dto.customerId,
      branchId: branchId,
      createdBy: user.userId,
      status: invoiceStatus,
      totalAmount: openingBalance,
      notes: `Opening balance entry: ${entryNumber}. ${dto.notes || ''}`,
      isOpeningEntry: true,
    });

    const savedInvoice = await this.invoiceRepo.save(invoice);

    // Create linked Invoice Ledger
    const ledger = this.ledgerRepo.create({
      invoiceId: savedInvoice.id,
      totalAmount: openingBalance,
      paidAmount: 0,
      balanceAmount: openingBalance,
    });
    await this.ledgerRepo.save(ledger);

    // Create Opening Balance Entry
    const entry = this.entryRepo.create({
      entryNumber,
      customerId: dto.customerId,
      branchId: branchId,
      branchName: branchName,
      balanceType: dto.balanceType,
      openingBalance,
      remainingBalance: openingBalance,
      originalTotalAmount: Number(dto.originalTotalAmount),
      alreadyPaidAmount: Number(dto.alreadyPaidAmount),
      invoiceId: savedInvoice.id,
      isFullySettled: openingBalance <= 0,
      migratedAt: dto.migratedAt ? new Date(dto.migratedAt) : new Date(),
      monthlyBillingAmount: dto.monthlyBillingAmount,
      billingCycleInDays: dto.billingCycleInDays || 30,
      nextPaymentDueDate: dto.nextPaymentDueDate ? new Date(dto.nextPaymentDueDate) : undefined,
      totalContractMonths: dto.totalContractMonths,
      monthsCompleted: dto.monthsCompleted,
      monthsRemaining,
      remainingContractValue,
      contractStartDate: dto.contractStartDate ? new Date(dto.contractStartDate) : undefined,
      productBrand: dto.productBrand,
      productModel: dto.productModel,
      serialNumber: dto.serialNumber,
      productId: dto.productId,
      notes: dto.notes,
    });

    const savedEntry = await this.entryRepo.save(entry);

    // Audit logs
    await logAudit(
      savedInvoice.id,
      'CREATE',
      user.userId,
      `Created Opening Balance Entry ${entryNumber} for Customer ${dto.customerId}.`,
    );

    // Publish In-App Notifications to Finance Team in the same branch
    try {
      const financeEmployees = await getFinanceEmployeesByBranch(user.branchId);
      for (const empId of financeEmployees) {
        await NotificationPublisher.publishInAppRequest({
          recipientId: empId,
          title: 'Opening Balance Entry Created',
          message: `A new opening balance entry (${entryNumber}) of QAR ${openingBalance} has been registered.`,
          type: 'OPENING_BALANCE_CREATED',
          referenceId: savedEntry.id,
          referenceType: 'OPENING_BALANCE',
        });
      }
    } catch (notifErr) {
      logger.error('Failed to dispatch notifications for opening balance creation', notifErr);
    }

    return savedEntry;
  }

  async getEntries(options: GetEntriesOptions, user: { role: string; branchId?: string }) {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.entryRepo
      .createQueryBuilder('entry')
      .leftJoinAndSelect('entry.invoice', 'invoice')
      .orderBy('entry.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    // Branch isolation filtering for non-ADMIN/non-FINANCE users
    if (user.role !== 'ADMIN' && user.role !== 'FINANCE') {
      if (!user.branchId) {
        throw new AppError('Access denied: User must have a branch assigned', 403);
      }
      queryBuilder.andWhere('entry.branchId = :branchId', { branchId: user.branchId });
    }

    if (options.customerId) {
      queryBuilder.andWhere('entry.customerId = :customerId', { customerId: options.customerId });
    }

    if (options.balanceType) {
      queryBuilder.andWhere('entry.balanceType = :balanceType', {
        balanceType: options.balanceType,
      });
    }

    if (options.isFullySettled !== undefined) {
      queryBuilder.andWhere('entry.isFullySettled = :isFullySettled', {
        isFullySettled: options.isFullySettled,
      });
    }

    const [data, total] = await queryBuilder.getManyAndCount();
    return { data, total, page, limit };
  }

  async getEntryById(id: string, user: { role: string; branchId?: string }) {
    const entry = await this.entryRepo.findOne({
      where: { id },
      relations: ['invoice'],
    });

    if (!entry) {
      throw new AppError('Opening balance entry not found', 404);
    }

    // Branch isolation validation
    if (user.role !== 'ADMIN' && user.role !== 'FINANCE' && entry.branchId !== user.branchId) {
      throw new AppError('Access denied: Entry belongs to a different branch', 403);
    }

    return entry;
  }

  async getCustomerEntries(customerId: string, user: { role: string; branchId?: string }) {
    // Branch isolation check on requested customer
    if (user.role !== 'ADMIN' && user.role !== 'FINANCE') {
      await validateCustomerBranch(customerId, user.branchId, user.role);
    }

    return this.entryRepo.find({
      where: { customerId },
      relations: ['invoice'],
      order: { createdAt: 'DESC' },
    });
  }

  async updateEntry(
    id: string,
    dto: UpdateOpeningBalanceEntryDto,
    user: { userId: string; role: string; branchId?: string },
  ) {
    const entry = await this.entryRepo.findOne({ where: { id } });
    if (!entry) {
      throw new AppError('Opening balance entry not found', 404);
    }

    // Branch isolation validation
    if (user.role !== 'ADMIN' && user.role !== 'FINANCE' && entry.branchId !== user.branchId) {
      throw new AppError('Access denied: Entry belongs to a different branch', 403);
    }

    // Restrict editing billing parameters if payments have been made
    if (entry.invoiceId) {
      const ledger = await this.ledgerRepo.findOne({ where: { invoiceId: entry.invoiceId } });
      if (ledger && Number(ledger.paidAmount) > 0) {
        throw new AppError(
          'Cannot edit opening balance entry: payments have already been received',
          400,
        );
      }
    }

    // Update fields
    if (dto.notes !== undefined) entry.notes = dto.notes;
    if (dto.productBrand !== undefined) entry.productBrand = dto.productBrand;
    if (dto.productModel !== undefined) entry.productModel = dto.productModel;
    if (dto.serialNumber !== undefined) entry.serialNumber = dto.serialNumber;
    if (dto.productId !== undefined) entry.productId = dto.productId;
    if (dto.billingCycleInDays !== undefined) entry.billingCycleInDays = dto.billingCycleInDays;
    if (dto.nextPaymentDueDate !== undefined)
      entry.nextPaymentDueDate = dto.nextPaymentDueDate
        ? new Date(dto.nextPaymentDueDate)
        : undefined;
    if (dto.monthlyBillingAmount !== undefined)
      entry.monthlyBillingAmount = dto.monthlyBillingAmount;
    if (dto.totalContractMonths !== undefined) entry.totalContractMonths = dto.totalContractMonths;
    if (dto.monthsCompleted !== undefined) entry.monthsCompleted = dto.monthsCompleted;
    if (dto.contractStartDate !== undefined)
      entry.contractStartDate = dto.contractStartDate ? new Date(dto.contractStartDate) : undefined;

    // Re-evaluate calculations
    const totalMonths = entry.totalContractMonths || 0;
    const completedMonths = entry.monthsCompleted || 0;
    entry.monthsRemaining = Math.max(0, totalMonths - completedMonths);
    entry.remainingContractValue = (entry.monthlyBillingAmount || 0) * entry.monthsRemaining;

    const updated = await this.entryRepo.save(entry);

    await logAudit(
      entry.invoiceId || entry.id,
      'UPDATE',
      user.userId,
      `Updated Opening Balance Entry ${entry.entryNumber}.`,
    );

    return updated;
  }

  async deleteEntry(id: string, user: { userId: string; role: string; branchId?: string }) {
    const entry = await this.entryRepo.findOne({ where: { id } });
    if (!entry) {
      throw new AppError('Opening balance entry not found', 404);
    }

    // Branch isolation validation
    if (user.role !== 'ADMIN' && user.role !== 'FINANCE' && entry.branchId !== user.branchId) {
      throw new AppError('Access denied: Entry belongs to a different branch', 403);
    }

    // Restrict if payments have been recorded
    if (entry.invoiceId) {
      const ledger = await this.ledgerRepo.findOne({ where: { invoiceId: entry.invoiceId } });
      if (ledger && Number(ledger.paidAmount) > 0) {
        throw new AppError(
          'Cannot delete opening balance entry: payments have already been received',
          400,
        );
      }
    }

    // Soft delete linked Invoice and InvoiceLedger, then the Entry itself
    if (entry.invoiceId) {
      const invoice = await this.invoiceRepo.findOne({ where: { id: entry.invoiceId } });
      if (invoice) {
        await this.invoiceRepo.softRemove(invoice);
      }
      const ledger = await this.ledgerRepo.findOne({ where: { invoiceId: entry.invoiceId } });
      if (ledger) {
        await this.ledgerRepo.softRemove(ledger);
      }
    }

    await this.entryRepo.softRemove(entry);

    await logAudit(
      entry.invoiceId || entry.id,
      'DELETE',
      user.userId,
      `Soft-deleted Opening Balance Entry ${entry.entryNumber} and linked invoice records.`,
    );
  }
}
