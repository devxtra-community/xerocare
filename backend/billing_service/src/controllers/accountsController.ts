import { Request, Response, NextFunction } from 'express';
import { Source } from '../config/dataSource';
import { CashBankAccount } from '../entities/cashBankAccountEntity';
import { CashbookEntry } from '../entities/cashbookEntryEntity';
import { ExpenseEntry } from '../entities/expenseEntryEntity';
import { DepreciationBrandRule } from '../entities/depreciationBrandRuleEntity';
import { DepreciationModelRule } from '../entities/depreciationModelRuleEntity';
import { AssetDepreciationRegister } from '../entities/assetDepreciationRegisterEntity';
import { DepreciationJournalEntry } from '../entities/depreciationJournalEntryEntity';
import { ManualReceivable } from '../entities/manualReceivableEntity';
import { ReceivablePayment } from '../entities/receivablePaymentEntity';
import { ManualPayable } from '../entities/manualPayableEntity';
import { PayablePayment } from '../entities/payablePaymentEntity';
import { EquityEntry } from '../entities/equityEntryEntity';
import { Invoice } from '../entities/invoiceEntity';
import { PaymentTransaction } from '../entities/paymentTransactionEntity';
import { ExchangeRate } from '../entities/exchangeRateEntity';
import { AccountReconciliation } from '../entities/accountReconciliationEntity';
import { AppError } from '../errors/appError';
import { calculateDepreciation, generateDepreciationSchedule } from '../utils/depreciation';
import { applyBranchQB } from '../middlewares/branchFilterMiddleware';
import { postCashbookEntry } from '../services/cashbookService';
import { logger } from '../config/logger';

// ─── PERIOD HELPER ─────────────────────────────────────────────────────────────

function getPeriodRange(period?: string): { fromDate: string; toDate: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (period) {
    case 'this_month': {
      const from = new Date(y, m, 1).toISOString().slice(0, 10);
      const to = new Date(y, m + 1, 0).toISOString().slice(0, 10);
      return { fromDate: from, toDate: to };
    }
    case 'last_month': {
      const from = new Date(y, m - 1, 1).toISOString().slice(0, 10);
      const to = new Date(y, m, 0).toISOString().slice(0, 10);
      return { fromDate: from, toDate: to };
    }
    case 'this_quarter': {
      const q = Math.floor(m / 3);
      const from = new Date(y, q * 3, 1).toISOString().slice(0, 10);
      const to = new Date(y, q * 3 + 3, 0).toISOString().slice(0, 10);
      return { fromDate: from, toDate: to };
    }
    case 'last_year':
      return { fromDate: `${y - 1}-01-01`, toDate: `${y - 1}-12-31` };
    case 'this_year':
    default:
      return { fromDate: `${y}-01-01`, toDate: `${y}-12-31` };
  }
}

// ─── CASH & BANK ACCOUNTS ────────────────────────────────────────────────────

export const getCashBankAccounts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = Source.getRepository(CashBankAccount);
    const qb = repo.createQueryBuilder('a').where('a.isActive = :active', { active: true });
    applyBranchQB(qb as never, 'a', req.branchFilter ?? []);
    qb.orderBy('a.name', 'ASC');
    const accounts = await qb.getMany();
    res.json({ success: true, data: accounts });
  } catch (err) {
    next(err);
  }
};

export const createCashBankAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = Source.getRepository(CashBankAccount);
    const account = repo.create({
      ...req.body,
      currentBalance: req.body.openingBalance ?? 0,
    }) as unknown as CashBankAccount;
    const saved = await repo.save(account);
    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
};

export const updateCashBankAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = Source.getRepository(CashBankAccount);
    const id = req.params.id as string;
    const account = await repo.findOne({ where: { id } });
    if (!account) throw new AppError('Account not found', 404);
    Object.assign(account, req.body);
    const saved = await repo.save(account);
    res.json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
};

export const deleteCashBankAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = Source.getRepository(CashBankAccount);
    const id = req.params.id as string;
    await repo.update(id, { isActive: false });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// ─── CASHBOOK ENTRIES ─────────────────────────────────────────────────────────

export const getCashbookEntries = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = Source.getRepository(CashbookEntry);
    const { accountId, fromDate, toDate, entryType } = req.query;
    const qb = repo.createQueryBuilder('e');
    applyBranchQB(qb as never, 'e', req.branchFilter ?? []);
    if (accountId) qb.andWhere('e.accountId = :accountId', { accountId });
    if (entryType) qb.andWhere('e.entryType = :entryType', { entryType });
    if (fromDate) qb.andWhere('e.date >= :fromDate', { fromDate });
    if (toDate) qb.andWhere('e.date <= :toDate', { toDate });
    qb.orderBy('e.date', 'DESC').addOrderBy('e.createdAt', 'DESC');
    const entries = await qb.getMany();
    res.json({ success: true, data: entries });
  } catch (err) {
    next(err);
  }
};

export const createCashbookEntry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Generate reference before transaction to avoid holding lock during count
    if (!req.body.referenceNo) {
      const count = await Source.getRepository(CashbookEntry).count();
      req.body.referenceNo = `CB-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    }

    const saved = await postCashbookEntry({
      referenceNo: req.body.referenceNo,
      date: req.body.date,
      entryType: req.body.entryType,
      amount: Number(req.body.amount),
      category: req.body.category,
      branchId: req.body.branchId,
      createdBy: req.user?.userId ?? req.body.createdBy,
      paymentMode: req.body.paymentMode,
      accountId: req.body.accountId,
      linkedInvoiceId: req.body.linkedInvoiceId,
      linkedPoId: req.body.linkedPoId,
      linkedExpenseId: req.body.linkedExpenseId,
      description: req.body.description,
      chequeNo: req.body.chequeNo,
      notes: req.body.notes,
      // manual entries only move an explicitly chosen account (preserve prior behavior)
    });

    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
};

// ─── DAY BOOK ─────────────────────────────────────────────────────────────────

function toYmd(d: Date | string): string {
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
}

interface DayBookDay {
  date: string;
  totalReceipts: number;
  totalPayments: number;
  net: number;
  transactionCount: number;
  entries: CashbookEntry[];
}

// Cash day book: per-day total earnings (receipts), total expenses (payments) and transactions,
// built from real cashbook entries (auto-posted invoice receipts + expense payments + manual).
export const getDayBook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = Source.getRepository(CashbookEntry);
    const { fromDate, toDate, accountId } = req.query;
    const today = new Date().toISOString().slice(0, 10);
    const from = (fromDate as string) || today;
    const to = (toDate as string) || from;

    const qb = repo.createQueryBuilder('e');
    applyBranchQB(qb as never, 'e', req.branchFilter ?? []);
    qb.andWhere('e.date >= :from', { from }).andWhere('e.date <= :to', { to });
    if (accountId) qb.andWhere('e.accountId = :accountId', { accountId });
    qb.orderBy('e.date', 'DESC').addOrderBy('e.createdAt', 'DESC');
    const entries = await qb.getMany();

    const dayMap = new Map<string, DayBookDay>();
    let grandReceipts = 0;
    let grandPayments = 0;
    for (const e of entries) {
      const key = toYmd(e.date);
      let day = dayMap.get(key);
      if (!day) {
        day = {
          date: key,
          totalReceipts: 0,
          totalPayments: 0,
          net: 0,
          transactionCount: 0,
          entries: [],
        };
        dayMap.set(key, day);
      }
      const amt = Number(e.amount);
      if (e.entryType === 'RECEIPT') {
        day.totalReceipts += amt;
        grandReceipts += amt;
      } else {
        day.totalPayments += amt;
        grandPayments += amt;
      }
      day.transactionCount += 1;
      day.entries.push(e);
    }

    const days = Array.from(dayMap.values())
      .map((d) => ({ ...d, net: d.totalReceipts - d.totalPayments }))
      .sort((a, b) => (a.date < b.date ? 1 : -1));

    res.json({
      success: true,
      data: {
        fromDate: from,
        toDate: to,
        days,
        totals: {
          totalReceipts: grandReceipts,
          totalPayments: grandPayments,
          net: grandReceipts - grandPayments,
          transactionCount: entries.length,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── EXPENSE ENTRIES ──────────────────────────────────────────────────────────

// Posts a PAID expense into the cashbook (day book) as a PAYMENT. Best-effort + idempotent.
async function postExpensePayment(expense: ExpenseEntry, userId?: string): Promise<void> {
  try {
    await postCashbookEntry({
      date: expense.paymentDate ?? expense.date,
      entryType: 'PAYMENT',
      amount: Number(expense.netAmount),
      category: expense.category,
      branchId: expense.branchId,
      createdBy: userId ?? expense.createdBy ?? 'SYSTEM',
      paymentMode: expense.paymentMode,
      accountId: expense.paidFrom,
      autoResolveAccount: true,
      linkedExpenseId: expense.id,
      description: expense.description,
      chequeNo: expense.referenceNo,
      notes: expense.notes,
      sourceType: 'EXPENSE',
      sourceId: expense.id,
    });
  } catch (err) {
    logger.error('Failed to post expense payment to cashbook', err);
  }
}

export const getExpenseEntries = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = Source.getRepository(ExpenseEntry);
    const { category, status, fromDate, toDate } = req.query;
    const qb = repo.createQueryBuilder('e');
    applyBranchQB(qb as never, 'e', req.branchFilter ?? []);
    if (category) qb.andWhere('e.category = :category', { category });
    if (status) qb.andWhere('e.status = :status', { status });
    if (fromDate) qb.andWhere('e.date >= :fromDate', { fromDate });
    if (toDate) qb.andWhere('e.date <= :toDate', { toDate });
    qb.orderBy('e.date', 'DESC');
    const entries = await qb.getMany();
    res.json({ success: true, data: entries });
  } catch (err) {
    next(err);
  }
};

export const createExpenseEntry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = Source.getRepository(ExpenseEntry);
    if (!req.body.expenseNo) {
      const count = await repo.count();
      req.body.expenseNo = `EXP-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    }
    const entry = repo.create({
      ...req.body,
      createdBy: req.user?.userId ?? req.body.createdBy,
    }) as unknown as ExpenseEntry;
    const saved = await repo.save(entry);
    // If created already-paid, mirror it into the day book.
    if (saved.status === 'PAID') {
      await postExpensePayment(saved, req.user?.userId);
    }
    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
};

export const updateExpenseEntry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = Source.getRepository(ExpenseEntry);
    const id = req.params.id as string;
    const entry = await repo.findOne({ where: { id } });
    if (!entry) throw new AppError('Expense not found', 404);
    const wasPaid = entry.status === 'PAID';
    Object.assign(entry, req.body);
    const saved = await repo.save(entry);
    // Post to the day book only on the transition into PAID (idempotent guard also protects).
    if (saved.status === 'PAID' && !wasPaid) {
      await postExpensePayment(saved, req.user?.userId);
    }
    res.json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
};

// Mark an expense PAID (records payment details) and post it to the cashbook / day book.
export const payExpenseEntry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = Source.getRepository(ExpenseEntry);
    const id = req.params.id as string;
    const entry = await repo.findOne({ where: { id } });
    if (!entry) throw new AppError('Expense not found', 404);
    if (entry.status === 'PAID') throw new AppError('Expense is already paid', 400);

    const { paidFrom, paymentMode, paymentDate, referenceNo } = req.body as {
      paidFrom?: string;
      paymentMode?: string;
      paymentDate?: string;
      referenceNo?: string;
    };

    entry.status = 'PAID';
    entry.paidFrom = paidFrom ?? entry.paidFrom;
    entry.paymentMode = paymentMode ?? entry.paymentMode;
    entry.paymentDate = paymentDate ? new Date(paymentDate) : (entry.paymentDate ?? new Date());
    entry.referenceNo = referenceNo ?? entry.referenceNo;
    const saved = await repo.save(entry);

    await postExpensePayment(saved, req.user?.userId);
    res.json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
};

export const approveExpenseEntry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = Source.getRepository(ExpenseEntry);
    const id = req.params.id as string;
    const entry = await repo.findOne({ where: { id } });
    if (!entry) throw new AppError('Expense not found', 404);
    entry.status = 'APPROVED';
    entry.approvedBy = req.user?.userId;
    const saved = await repo.save(entry);
    res.json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
};

export const deleteExpenseEntry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = Source.getRepository(ExpenseEntry);
    const id = req.params.id as string;
    await repo.delete(id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// ─── DEPRECIATION BRAND RULES ─────────────────────────────────────────────────

export const getDepreciationBrandRules = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const rules = await Source.getRepository(DepreciationBrandRule).find({
      order: { createdAt: 'DESC' },
    });
    res.json({ success: true, data: rules });
  } catch (err) {
    next(err);
  }
};

export const upsertDepreciationBrandRule = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const repo = Source.getRepository(DepreciationBrandRule);
    const existing = await repo.findOne({ where: { brandId: req.body.brandId as string } });
    let rule: DepreciationBrandRule;
    if (existing) {
      Object.assign(existing, req.body);
      rule = existing;
    } else {
      rule = repo.create({
        ...req.body,
        createdBy: req.user?.userId ?? req.body.createdBy,
      }) as unknown as DepreciationBrandRule;
    }
    const saved = await repo.save(rule);
    res.json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
};

export const deleteDepreciationBrandRule = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = req.params.id as string;
    await Source.getRepository(DepreciationBrandRule).delete(id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// ─── DEPRECIATION MODEL RULES ─────────────────────────────────────────────────

export const getDepreciationModelRules = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const repo = Source.getRepository(DepreciationModelRule);
    const { brandId } = req.query;
    const where = brandId ? { brandId: brandId as string } : {};
    const rules = await repo.find({ where, order: { createdAt: 'DESC' } });
    res.json({ success: true, data: rules });
  } catch (err) {
    next(err);
  }
};

export const upsertDepreciationModelRule = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const repo = Source.getRepository(DepreciationModelRule);
    const existing = await repo.findOne({ where: { modelId: req.body.modelId as string } });
    let rule: DepreciationModelRule;
    if (existing) {
      Object.assign(existing, req.body);
      rule = existing;
    } else {
      rule = repo.create({
        ...req.body,
        createdBy: req.user?.userId ?? req.body.createdBy,
      }) as unknown as DepreciationModelRule;
    }
    const saved = await repo.save(rule);
    res.json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
};

export const deleteDepreciationModelRule = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = req.params.id as string;
    await Source.getRepository(DepreciationModelRule).delete(id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// ─── ASSET DEPRECIATION REGISTER ──────────────────────────────────────────────

export const getAssetRegister = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = Source.getRepository(AssetDepreciationRegister);
    const { branchId, brandId, status } = req.query;
    const qb = repo.createQueryBuilder('a');
    if (branchId) qb.andWhere('a.branchId = :branchId', { branchId });
    if (brandId) qb.andWhere('a.brandId = :brandId', { brandId });
    if (status) qb.andWhere('a.status = :status', { status });
    qb.orderBy('a.purchaseDate', 'DESC');
    const assets = await qb.getMany();

    const enriched = assets.map((a) => {
      const result = calculateDepreciation({
        purchasePrice: Number(a.purchasePrice),
        salvageValue: Number(a.salvageValue),
        usefulLifeMonths: a.usefulLifeMonths,
        annualDepreciationPct: Number(a.annualDepreciationPct),
        method: a.method as 'STRAIGHT_LINE' | 'DECLINING_BALANCE',
        purchaseDate: new Date(a.purchaseDate),
      });
      return { ...a, ...result };
    });

    res.json({ success: true, data: enriched });
  } catch (err) {
    next(err);
  }
};

export const addAssetToRegister = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = Source.getRepository(AssetDepreciationRegister);
    const existing = await repo.findOne({ where: { productId: req.body.productId as string } });
    if (existing) throw new AppError('Product already registered for depreciation', 400);

    const { purchasePrice, salvageValuePct } = req.body;
    const salvageValue = (Number(purchasePrice) * Number(salvageValuePct)) / 100;

    const asset = repo.create({
      ...req.body,
      salvageValue,
      createdBy: req.user?.userId ?? req.body.createdBy,
    }) as unknown as AssetDepreciationRegister;
    const saved = await repo.save(asset);
    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
};

export const updateAssetInRegister = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = Source.getRepository(AssetDepreciationRegister);
    const id = req.params.id as string;
    const asset = await repo.findOne({ where: { id } });
    if (!asset) throw new AppError('Asset not found', 404);

    if (req.body.purchasePrice !== undefined || req.body.salvageValuePct !== undefined) {
      const price = req.body.purchasePrice ?? Number(asset.purchasePrice);
      const pct = req.body.salvageValuePct ?? Number(asset.salvageValuePct);
      req.body.salvageValue = (Number(price) * Number(pct)) / 100;
    }

    Object.assign(asset, req.body);
    const saved = await repo.save(asset);
    res.json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
};

export const disposeAsset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = Source.getRepository(AssetDepreciationRegister);
    const id = req.params.id as string;
    const asset = await repo.findOne({ where: { id } });
    if (!asset) throw new AppError('Asset not found', 404);
    asset.status = 'DISPOSED';
    asset.disposalDate = req.body.disposalDate ?? new Date();
    asset.disposalValue = req.body.disposalValue ?? 0;
    const saved = await repo.save(asset);
    res.json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
};

export const getDepreciationSchedule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = Source.getRepository(AssetDepreciationRegister);
    const id = req.params.id as string;
    const asset = await repo.findOne({ where: { id } });
    if (!asset) throw new AppError('Asset not found', 404);

    const schedule = generateDepreciationSchedule({
      purchasePrice: Number(asset.purchasePrice),
      salvageValue: Number(asset.salvageValue),
      usefulLifeMonths: asset.usefulLifeMonths,
      annualDepreciationPct: Number(asset.annualDepreciationPct),
      method: asset.method as 'STRAIGHT_LINE' | 'DECLINING_BALANCE',
      purchaseDate: new Date(asset.purchaseDate),
    });

    res.json({ success: true, data: schedule });
  } catch (err) {
    next(err);
  }
};

// ─── DEPRECIATION JOURNAL ─────────────────────────────────────────────────────

export const getDepreciationJournals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = Source.getRepository(DepreciationJournalEntry);
    const { branchId } = req.query;
    const where = branchId ? { branchId: branchId as string } : {};
    const journals = await repo.find({ where, order: { periodYear: 'DESC', periodMonth: 'DESC' } });
    res.json({ success: true, data: journals });
  } catch (err) {
    next(err);
  }
};

export const postDepreciationJournal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const journalRepo = Source.getRepository(DepreciationJournalEntry);
    const expenseRepo = Source.getRepository(ExpenseEntry);
    const assetRepo = Source.getRepository(AssetDepreciationRegister);

    const { periodYear, periodMonth, branchId } = req.body as {
      periodYear: number;
      periodMonth: number;
      branchId: string;
    };

    const existing = await journalRepo.findOne({ where: { periodYear, periodMonth, branchId } });
    if (existing?.status === 'POSTED') {
      throw new AppError('Depreciation already posted for this period', 400);
    }

    const assets = await assetRepo.find({ where: { branchId, status: 'ACTIVE' } });
    let totalAmount = 0;
    for (const a of assets) {
      const result = calculateDepreciation({
        purchasePrice: Number(a.purchasePrice),
        salvageValue: Number(a.salvageValue),
        usefulLifeMonths: a.usefulLifeMonths,
        annualDepreciationPct: Number(a.annualDepreciationPct),
        method: a.method as 'STRAIGHT_LINE' | 'DECLINING_BALANCE',
        purchaseDate: new Date(a.purchaseDate),
      });
      totalAmount += result.monthlyDep;
    }

    const expCount = await expenseRepo.count();
    const expense = expenseRepo.create({
      expenseNo: `EXP-DEP-${periodYear}-${String(periodMonth).padStart(2, '0')}-${String(expCount + 1).padStart(4, '0')}`,
      date: new Date(`${periodYear}-${String(periodMonth).padStart(2, '0')}-28`),
      category: 'DEPRECIATION',
      description: `Depreciation for ${periodYear}-${String(periodMonth).padStart(2, '0')}`,
      branchId,
      amount: totalAmount,
      vatAmount: 0,
      netAmount: totalAmount,
      currency: 'AED',
      status: 'PAID',
      createdBy: req.user?.userId ?? (req.body.createdBy as string),
    }) as unknown as ExpenseEntry;
    const savedExpense = await expenseRepo.save(expense);

    const journal: DepreciationJournalEntry =
      existing ??
      (journalRepo.create({ periodYear, periodMonth, branchId }) as DepreciationJournalEntry);
    journal.totalAmount = totalAmount;
    journal.status = 'POSTED';
    journal.postedBy = req.user?.userId;
    journal.postedAt = new Date();
    journal.expenseEntryId = savedExpense.id;
    const saved = await journalRepo.save(journal);

    res.json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
};

// ─── MANUAL RECEIVABLES ───────────────────────────────────────────────────────

export const getManualReceivables = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = Source.getRepository(ManualReceivable);
    const { type, status, customerId } = req.query;
    const qb = repo.createQueryBuilder('r').leftJoinAndSelect('r.payments', 'p');
    applyBranchQB(qb as never, 'r', req.branchFilter ?? []);
    if (type) qb.andWhere('r.type = :type', { type });
    if (status) qb.andWhere('r.status = :status', { status });
    if (customerId) qb.andWhere('r.customerId = :customerId', { customerId });
    qb.orderBy('r.createdAt', 'DESC');
    const receivables = await qb.getMany();

    const today = new Date();
    const enriched = receivables.map((r) => {
      const outstanding = Number(r.amount) - Number(r.amountPaid);
      const due = new Date(r.dueDate);
      const diffDays = Math.floor((today.getTime() - due.getTime()) / 86400000);
      let aging = 'Current';
      if (diffDays > 90) aging = '90+ days';
      else if (diffDays > 60) aging = '61-90 days';
      else if (diffDays > 30) aging = '31-60 days';
      else if (diffDays > 0) aging = '1-30 days';
      return { ...r, outstanding, aging };
    });

    res.json({ success: true, data: enriched });
  } catch (err) {
    next(err);
  }
};

export const createManualReceivable = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = Source.getRepository(ManualReceivable);
    if (!req.body.referenceNo) {
      const count = await repo.count();
      req.body.referenceNo = `RCV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    }
    const receivable = repo.create({
      ...req.body,
      outstanding: req.body.amount,
      amountPaid: 0,
      createdBy: req.user?.userId ?? req.body.createdBy,
    }) as unknown as ManualReceivable;
    const saved = await repo.save(receivable);
    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
};

export const updateManualReceivable = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = Source.getRepository(ManualReceivable);
    const id = req.params.id as string;
    const item = await repo.findOne({ where: { id } });
    if (!item) throw new AppError('Receivable not found', 404);
    Object.assign(item, req.body);
    const saved = await repo.save(item);
    res.json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
};

export const recordReceivablePayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    // Pre-fetch to validate existence before acquiring transaction lock
    const receivable = await Source.getRepository(ManualReceivable).findOne({ where: { id } });
    if (!receivable) throw new AppError('Receivable not found', 404);

    let saved!: ManualReceivable;
    await Source.transaction(async (em) => {
      const receivableRepo = em.getRepository(ManualReceivable);
      const paymentRepo = em.getRepository(ReceivablePayment);

      const payment = paymentRepo.create({
        ...req.body,
        receivableId: receivable.id,
        createdBy: req.user?.userId ?? req.body.createdBy,
      }) as unknown as ReceivablePayment;
      await paymentRepo.save(payment);

      receivable.amountPaid = Number(receivable.amountPaid) + Number(req.body.amount);
      receivable.outstanding = Number(receivable.amount) - Number(receivable.amountPaid);
      if (receivable.outstanding <= 0) receivable.status = 'PAID';
      else if (Number(receivable.amountPaid) > 0) receivable.status = 'PARTIAL';
      saved = await receivableRepo.save(receivable);
    });

    res.json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
};

// ─── MANUAL PAYABLES ──────────────────────────────────────────────────────────

export const getManualPayables = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = Source.getRepository(ManualPayable);
    const { type, status, vendorId } = req.query;
    const qb = repo.createQueryBuilder('p').leftJoinAndSelect('p.payments', 'pay');
    applyBranchQB(qb as never, 'p', req.branchFilter ?? []);
    if (type) qb.andWhere('p.type = :type', { type });
    if (status) qb.andWhere('p.status = :status', { status });
    if (vendorId) qb.andWhere('p.vendorId = :vendorId', { vendorId });
    qb.orderBy('p.createdAt', 'DESC');
    const payables = await qb.getMany();

    const today = new Date();
    const enriched = payables.map((p) => {
      const outstanding = Number(p.amount) - Number(p.amountPaid);
      const due = new Date(p.dueDate);
      const diffDays = Math.floor((today.getTime() - due.getTime()) / 86400000);
      let aging = 'Current';
      if (diffDays > 90) aging = '90+ days';
      else if (diffDays > 60) aging = '61-90 days';
      else if (diffDays > 30) aging = '31-60 days';
      else if (diffDays > 0) aging = '1-30 days';
      return { ...p, outstanding, aging };
    });

    res.json({ success: true, data: enriched });
  } catch (err) {
    next(err);
  }
};

export const createManualPayable = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = Source.getRepository(ManualPayable);
    if (!req.body.referenceNo) {
      const count = await repo.count();
      req.body.referenceNo = `PAY-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    }
    const payable = repo.create({
      ...req.body,
      outstanding: req.body.amount,
      amountPaid: 0,
      createdBy: req.user?.userId ?? req.body.createdBy,
    }) as unknown as ManualPayable;
    const saved = await repo.save(payable);
    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
};

export const updateManualPayable = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = Source.getRepository(ManualPayable);
    const id = req.params.id as string;
    const item = await repo.findOne({ where: { id } });
    if (!item) throw new AppError('Payable not found', 404);
    Object.assign(item, req.body);
    const saved = await repo.save(item);
    res.json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
};

export const recordPayablePayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    // Pre-fetch to validate existence before acquiring transaction lock
    const payable = await Source.getRepository(ManualPayable).findOne({ where: { id } });
    if (!payable) throw new AppError('Payable not found', 404);

    let saved!: ManualPayable;
    await Source.transaction(async (em) => {
      const payableRepo = em.getRepository(ManualPayable);
      const paymentRepo = em.getRepository(PayablePayment);

      const payment = paymentRepo.create({
        ...req.body,
        payableId: payable.id,
        createdBy: req.user?.userId ?? req.body.createdBy,
      }) as unknown as PayablePayment;
      await paymentRepo.save(payment);

      payable.amountPaid = Number(payable.amountPaid) + Number(req.body.amount);
      payable.outstanding = Number(payable.amount) - Number(payable.amountPaid);
      if (payable.outstanding <= 0) payable.status = 'PAID';
      else if (Number(payable.amountPaid) > 0) payable.status = 'PARTIAL';
      saved = await payableRepo.save(payable);
    });

    res.json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
};

// ─── EQUITY ENTRIES ───────────────────────────────────────────────────────────

export const getEquityEntries = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = Source.getRepository(EquityEntry);
    const { type, fromDate, toDate } = req.query;
    const qb = repo.createQueryBuilder('e');
    applyBranchQB(qb as never, 'e', req.branchFilter ?? []);
    if (type) qb.andWhere('e.type = :type', { type });
    if (fromDate) qb.andWhere('e.date >= :fromDate', { fromDate });
    if (toDate) qb.andWhere('e.date <= :toDate', { toDate });
    qb.orderBy('e.date', 'DESC').addOrderBy('e.createdAt', 'DESC');
    const entries = await qb.getMany();
    res.json({ success: true, data: entries });
  } catch (err) {
    next(err);
  }
};

export const createEquityEntry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = Source.getRepository(EquityEntry);

    if (!req.body.entryNo) {
      const count = await repo.count();
      req.body.entryNo = `EQ-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    }

    let savedEntry!: EquityEntry;
    await Source.transaction(async (em) => {
      const txRepo = em.getRepository(EquityEntry);
      const txCashRepo = em.getRepository(CashBankAccount);
      const txCbRepo = em.getRepository(CashbookEntry);

      const entry = txRepo.create({
        ...req.body,
        createdBy: req.user?.userId ?? req.body.createdBy,
      }) as unknown as EquityEntry;
      savedEntry = await txRepo.save(entry);

      if (req.body.linkedCashAccountId) {
        const acct = await txCashRepo.findOne({
          where: { id: req.body.linkedCashAccountId as string },
        });
        if (acct) {
          const isInflow = ['SHARE_CAPITAL', 'OWNER_CONTRIBUTION', 'RETAINED_EARNINGS'].includes(
            req.body.type,
          );
          const entryType = isInflow ? 'RECEIPT' : 'PAYMENT';
          const cbCount = await txCbRepo.count();
          const cb = txCbRepo.create({
            referenceNo: `CB-EQ-${String(cbCount + 1).padStart(4, '0')}`,
            date: req.body.date,
            accountId: acct.id,
            entryType,
            amount: Number(req.body.amount),
            category: 'EQUITY',
            description: `Equity: ${req.body.description}`,
            branchId: req.body.branchId,
            createdBy: req.user?.userId ?? req.body.createdBy,
          }) as unknown as CashbookEntry;
          await txCbRepo.save(cb);
          const delta = isInflow ? Number(req.body.amount) : -Number(req.body.amount);
          acct.currentBalance = Number(acct.currentBalance) + delta;
          await txCashRepo.save(acct);
        }
      }
    });

    res.status(201).json({ success: true, data: savedEntry });
  } catch (err) {
    next(err);
  }
};

export const updateEquityEntry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = Source.getRepository(EquityEntry);
    const id = req.params.id as string;
    const entry = await repo.findOne({ where: { id } });
    if (!entry) throw new AppError('Equity entry not found', 404);
    Object.assign(entry, req.body);
    const savedEntry = await repo.save(entry);
    res.json({ success: true, data: savedEntry });
  } catch (err) {
    next(err);
  }
};

export const deleteEquityEntry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = Source.getRepository(EquityEntry);
    const id = req.params.id as string;
    await repo.delete(id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

export const getEquitySummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = Source.getRepository(EquityEntry);
    const qb = repo.createQueryBuilder('e');
    applyBranchQB(qb as never, 'e', req.branchFilter ?? []);
    const rows = await qb.getMany();

    let shareCapital = 0,
      retainedEarnings = 0,
      reserves = 0,
      ownerContribution = 0,
      dividends = 0;
    for (const r of rows) {
      const amt = Number(r.amount);
      if (r.type === 'SHARE_CAPITAL') shareCapital += amt;
      if (r.type === 'RETAINED_EARNINGS' || r.type === 'PROFIT_TRANSFER') retainedEarnings += amt;
      if (r.type === 'LOSS_TRANSFER') retainedEarnings -= amt;
      if (r.type === 'RESERVES') reserves += amt;
      if (r.type === 'OWNER_CONTRIBUTION') ownerContribution += amt;
      if (r.type === 'DIVIDEND') dividends += amt;
    }
    const netEquity = shareCapital + retainedEarnings + reserves + ownerContribution - dividends;

    const assetRepo = Source.getRepository(AssetDepreciationRegister);
    const assetQb = assetRepo.createQueryBuilder('a').where('a.status = :s', { s: 'ACTIVE' });
    applyBranchQB(assetQb as never, 'a', req.branchFilter ?? []);
    const assets = await assetQb.getMany();
    let fixedNBV = 0;
    for (const a of assets) {
      const dep = calculateDepreciation({
        purchasePrice: Number(a.purchasePrice),
        salvageValue: Number(a.salvageValue),
        usefulLifeMonths: a.usefulLifeMonths,
        annualDepreciationPct: Number(a.annualDepreciationPct),
        method: a.method as 'STRAIGHT_LINE' | 'DECLINING_BALANCE',
        purchaseDate: new Date(a.purchaseDate),
      });
      fixedNBV += dep.nbv;
    }
    const cbRepo2 = Source.getRepository(CashBankAccount);
    const cbQbEq = cbRepo2.createQueryBuilder('a').where('a.isActive = :active', { active: true });
    applyBranchQB(cbQbEq as never, 'a', req.branchFilter ?? []);
    const cashAccts = await cbQbEq.getMany();
    const cashTotal = cashAccts.reduce((s, a) => s + Number(a.currentBalance), 0);
    const totalAssets = fixedNBV + cashTotal;

    const monthlyMap: Record<string, number> = {};
    const positive = [
      'SHARE_CAPITAL',
      'RETAINED_EARNINGS',
      'RESERVES',
      'OWNER_CONTRIBUTION',
      'PROFIT_TRANSFER',
    ];
    for (const r of rows) {
      const key = r.date.slice(0, 7);
      const delta = positive.includes(r.type) ? Number(r.amount) : -Number(r.amount);
      monthlyMap[key] = (monthlyMap[key] ?? 0) + delta;
    }
    let running = 0;
    const growthLine = Object.keys(monthlyMap)
      .sort()
      .map((month) => {
        running += monthlyMap[month];
        return { month, equity: running };
      });

    res.json({
      success: true,
      data: {
        shareCapital,
        retainedEarnings,
        reserves,
        ownerContribution,
        dividends,
        netEquity,
        totalAssets,
        growthLine,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getEquityStatement = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = Source.getRepository(EquityEntry);
    const { branchId, year } = req.query;
    const targetYear = year ? String(year) : String(new Date().getFullYear());
    const prevYear = String(Number(targetYear) - 1);
    const qb = repo.createQueryBuilder('e');
    if (branchId) qb.andWhere('e.branchId = :branchId', { branchId });
    qb.orderBy('e.date', 'ASC');
    const all = await qb.getMany();

    const opening = { shareCapital: 0, retainedEarnings: 0, reserves: 0, total: 0 };
    const closing = { shareCapital: 0, retainedEarnings: 0, reserves: 0, total: 0 };
    const movements: Array<{
      date: string;
      type: string;
      description: string;
      shareCapital: number;
      retainedEarnings: number;
      reserves: number;
      total: number;
    }> = [];

    const apply = (
      type: string,
      amount: number,
      cols: { shareCapital: number; retainedEarnings: number; reserves: number; total: number },
    ) => {
      const a = amount;
      if (type === 'SHARE_CAPITAL' || type === 'OWNER_CONTRIBUTION') {
        cols.shareCapital += a;
        cols.total += a;
      } else if (['RETAINED_EARNINGS', 'PROFIT_TRANSFER'].includes(type)) {
        cols.retainedEarnings += a;
        cols.total += a;
      } else if (type === 'LOSS_TRANSFER') {
        cols.retainedEarnings -= a;
        cols.total -= a;
      } else if (type === 'RESERVES') {
        cols.reserves += a;
        cols.total += a;
      } else if (type === 'DIVIDEND') {
        cols.retainedEarnings -= a;
        cols.total -= a;
      } else {
        cols.total += a;
      }
    };

    for (const e of all) {
      if (e.date <= `${prevYear}-12-31`) {
        apply(e.type, Number(e.amount), opening);
      } else if (e.date.startsWith(targetYear)) {
        const row = {
          date: e.date,
          type: e.type,
          description: e.description,
          shareCapital: 0,
          retainedEarnings: 0,
          reserves: 0,
          total: 0,
        };
        apply(e.type, Number(e.amount), row);
        movements.push(row);
      }
    }
    closing.shareCapital = opening.shareCapital + movements.reduce((s, m) => s + m.shareCapital, 0);
    closing.retainedEarnings =
      opening.retainedEarnings + movements.reduce((s, m) => s + m.retainedEarnings, 0);
    closing.reserves = opening.reserves + movements.reduce((s, m) => s + m.reserves, 0);
    closing.total = closing.shareCapital + closing.retainedEarnings + closing.reserves;

    res.json({ success: true, data: { year: targetYear, opening, movements, closing } });
  } catch (err) {
    next(err);
  }
};

export const getBalanceSheet = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchF = req.branchFilter ?? [];
    const cbRepo3 = Source.getRepository(CashBankAccount);
    const cbQb3 = cbRepo3.createQueryBuilder('a').where('a.isActive = :active', { active: true });
    applyBranchQB(cbQb3 as never, 'a', branchF);
    const cashAccts = await cbQb3.getMany();
    const cashTotal = cashAccts
      .filter((a) => a.type === 'CASH')
      .reduce((s, a) => s + Number(a.currentBalance), 0);
    const bankTotal = cashAccts
      .filter((a) => a.type === 'BANK')
      .reduce((s, a) => s + Number(a.currentBalance), 0);

    const assetRepo2 = Source.getRepository(AssetDepreciationRegister);
    const assetQb2 = assetRepo2.createQueryBuilder('a').where('a.status = :s', { s: 'ACTIVE' });
    applyBranchQB(assetQb2 as never, 'a', branchF);
    const assets = await assetQb2.getMany();
    let fixedGross = 0,
      fixedNBV = 0,
      accumDep = 0;
    for (const a of assets) {
      const dep = calculateDepreciation({
        purchasePrice: Number(a.purchasePrice),
        salvageValue: Number(a.salvageValue),
        usefulLifeMonths: a.usefulLifeMonths,
        annualDepreciationPct: Number(a.annualDepreciationPct),
        method: a.method as 'STRAIGHT_LINE' | 'DECLINING_BALANCE',
        purchaseDate: new Date(a.purchaseDate),
      });
      fixedGross += Number(a.purchasePrice);
      fixedNBV += dep.nbv;
      accumDep += dep.accumulated;
    }

    const rcvRepo = Source.getRepository(ManualReceivable);
    const rcvQb = rcvRepo.createQueryBuilder('r').where('r.status != :s', { s: 'PAID' });
    applyBranchQB(rcvQb as never, 'r', branchF);
    const receivables = await rcvQb.getMany();
    const manualReceivablesTotal = receivables.reduce((s, r) => s + Number(r.outstanding ?? 0), 0);

    // Invoice AR: INVOICED (unpaid/partially paid) invoices minus payments received
    const invArRepo = Source.getRepository(Invoice);
    const invArQb = invArRepo
      .createQueryBuilder('i')
      .where('i.status = :invStatus', { invStatus: 'INVOICED' })
      .andWhere('i.totalAmount > 0');
    applyBranchQB(invArQb as never, 'i', branchF);
    const arInvoices = await invArQb.getMany();
    let invoiceAR = 0;
    if (arInvoices.length > 0) {
      const invIds = arInvoices.map((i) => i.id);
      const ptRepo = Source.getRepository(PaymentTransaction);
      const paymentSums = await ptRepo
        .createQueryBuilder('pt')
        .select('pt.invoiceId', 'invoiceId')
        .addSelect('SUM(pt.amount)', 'totalPaid')
        .where('pt.invoiceId IN (:...invIds)', { invIds })
        .groupBy('pt.invoiceId')
        .getRawMany();
      const paidMap: Record<string, number> = {};
      for (const p of paymentSums) {
        paidMap[p.invoiceId] = Number(p.totalPaid);
      }
      invoiceAR = arInvoices.reduce(
        (s, inv) => s + Math.max(0, Number(inv.totalAmount) - (paidMap[inv.id] ?? 0)),
        0,
      );
    }
    const receivablesTotal = manualReceivablesTotal + invoiceAR;
    const totalAssets = cashTotal + bankTotal + fixedNBV + receivablesTotal;

    const payRepo2 = Source.getRepository(ManualPayable);
    const payQb2 = payRepo2.createQueryBuilder('p').where('p.status != :s', { s: 'PAID' });
    applyBranchQB(payQb2 as never, 'p', branchF);
    const payables = await payQb2.getMany();
    const payablesTotal = payables.reduce((s, p) => s + Number(p.outstanding ?? 0), 0);

    const expRepo = Source.getRepository(ExpenseEntry);
    const expQb = expRepo.createQueryBuilder('e').where('e.status = :s', { s: 'PENDING' });
    applyBranchQB(expQb as never, 'e', branchF);
    const pendingExp = await expQb.getMany();
    const accruedExpenses = pendingExp.reduce((s, e) => s + Number(e.netAmount), 0);

    // VAT Payable: tax from PAID/PARTIAL (INVOICED with payments) invoices — collected but not yet remitted
    const vatInvRepo = Source.getRepository(Invoice);
    const vatQb = vatInvRepo
      .createQueryBuilder('i')
      .where('i.status IN (:...vatStatuses)', { vatStatuses: ['PAID', 'INVOICED'] })
      .andWhere('i.taxAmount > 0');
    applyBranchQB(vatQb as never, 'i', branchF);
    const vatInvoices = await vatQb.getMany();
    const vatPayable = vatInvoices.reduce((s, i) => s + Number(i.taxAmount ?? 0), 0);

    const totalLiabilities = payablesTotal + accruedExpenses + vatPayable;

    const eqRepo2 = Source.getRepository(EquityEntry);
    const eqQb2 = eqRepo2.createQueryBuilder('e');
    applyBranchQB(eqQb2 as never, 'e', branchF);
    const eqEntries = await eqQb2.getMany();
    const positive2 = [
      'SHARE_CAPITAL',
      'RETAINED_EARNINGS',
      'RESERVES',
      'OWNER_CONTRIBUTION',
      'PROFIT_TRANSFER',
    ];
    let netEquity = 0;
    for (const e of eqEntries) {
      if (positive2.includes(e.type)) netEquity += Number(e.amount);
      else netEquity -= Number(e.amount);
    }

    const totalLiabilitiesAndEquity = totalLiabilities + netEquity;
    const difference = Math.abs(totalAssets - totalLiabilitiesAndEquity);
    const balanced = difference < 0.01;

    res.json({
      success: true,
      data: {
        assets: {
          cash: cashTotal,
          bank: bankTotal,
          cashAndBank: cashTotal + bankTotal,
          fixedAssetsGross: fixedGross,
          accumulatedDepreciation: accumDep,
          fixedAssetsNet: fixedNBV,
          receivables: receivablesTotal,
          manualReceivables: manualReceivablesTotal,
          invoiceAR,
          total: totalAssets,
        },
        liabilities: {
          payables: payablesTotal,
          accruedExpenses,
          vatPayable,
          total: totalLiabilities,
        },
        equity: { netEquity, total: netEquity },
        totalLiabilitiesAndEquity,
        difference,
        balanced,
        // flat fields for backward compat
        totalAssets,
        totalLiabilities,
        totalEquity: netEquity,
        cashAndBank: cashTotal + bankTotal,
        receivables: receivablesTotal,
        payables: payablesTotal,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── CHART DATA ENDPOINTS ─────────────────────────────────────────────────────

export const getExpenseCharts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = Source.getRepository(ExpenseEntry);
    const { branchId } = req.query;
    const qb = repo.createQueryBuilder('e');
    if (branchId) qb.andWhere('e.branchId = :branchId', { branchId });
    const rows = await qb.getMany();

    const monthlyMap: Record<string, Record<string, number>> = {};
    const catMap: Record<string, number> = {};
    const statusMap: Record<string, number> = {};

    for (const r of rows) {
      const month = String(r.date).slice(0, 7);
      if (!monthlyMap[month]) monthlyMap[month] = {};
      monthlyMap[month][r.category] = (monthlyMap[month][r.category] ?? 0) + Number(r.netAmount);
      catMap[r.category] = (catMap[r.category] ?? 0) + Number(r.netAmount);
      statusMap[r.status] = (statusMap[r.status] ?? 0) + Number(r.netAmount);
    }

    const monthlyTrend = Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, cats]) => ({ month, ...cats }));
    const categoryDonut = Object.entries(catMap).map(([name, value]) => ({ name, value }));
    const statusDistribution = Object.entries(statusMap).map(([name, value]) => ({ name, value }));
    const topMonths = Object.entries(monthlyMap)
      .map(([month, cats]) => ({ month, total: Object.values(cats).reduce((s, v) => s + v, 0) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);

    res.json({
      success: true,
      data: {
        monthlyTrend,
        categories: Object.keys(catMap),
        categoryDonut,
        statusDistribution,
        topMonths,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getReceivableCharts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = Source.getRepository(ManualReceivable);
    const { branchId } = req.query;
    const qb = repo.createQueryBuilder('r');
    if (branchId) qb.andWhere('r.branchId = :branchId', { branchId });
    const rows = await qb.getMany();

    const typeMap: Record<string, number> = {};
    const customerMap: Record<string, number> = {};
    const monthlyIssued: Record<string, number> = {};
    const monthlyPaid: Record<string, number> = {};

    for (const r of rows) {
      typeMap[r.type] = (typeMap[r.type] ?? 0) + Number(r.amount);
      if (r.customerName)
        customerMap[r.customerName] = (customerMap[r.customerName] ?? 0) + Number(r.amount);
      const month = String(r.issueDate).slice(0, 7);
      monthlyIssued[month] = (monthlyIssued[month] ?? 0) + Number(r.amount);
      monthlyPaid[month] = (monthlyPaid[month] ?? 0) + Number(r.amountPaid ?? 0);
    }

    const collectionRate = Object.keys({ ...monthlyIssued, ...monthlyPaid })
      .sort()
      .map((month) => ({
        month,
        issued: monthlyIssued[month] ?? 0,
        collected: monthlyPaid[month] ?? 0,
        rate: monthlyIssued[month]
          ? Math.round(((monthlyPaid[month] ?? 0) / monthlyIssued[month]) * 100)
          : 0,
      }));
    const byType = Object.entries(typeMap).map(([name, value]) => ({ name, value }));
    const topCustomers = Object.entries(customerMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));

    res.json({ success: true, data: { collectionRate, byType, topCustomers } });
  } catch (err) {
    next(err);
  }
};

export const getPayableCharts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = Source.getRepository(ManualPayable);
    const { branchId } = req.query;
    const qb = repo.createQueryBuilder('p');
    if (branchId) qb.andWhere('p.branchId = :branchId', { branchId });
    const rows = await qb.getMany();

    const typeMap: Record<string, number> = {};
    const vendorMap: Record<string, number> = {};
    const monthlyPayments: Record<string, number> = {};

    for (const p of rows) {
      typeMap[p.type] = (typeMap[p.type] ?? 0) + Number(p.amount);
      vendorMap[p.payableTo] = (vendorMap[p.payableTo] ?? 0) + Number(p.amount);
      const month = String(p.issueDate).slice(0, 7);
      monthlyPayments[month] = (monthlyPayments[month] ?? 0) + Number(p.amountPaid ?? 0);
    }

    const byType = Object.entries(typeMap).map(([name, value]) => ({ name, value }));
    const topVendors = Object.entries(vendorMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));
    const monthly = Object.entries(monthlyPayments)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, paid]) => ({ month, paid }));

    res.json({ success: true, data: { byType, topVendors, monthly } });
  } catch (err) {
    next(err);
  }
};

export const getDepreciationCharts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const assetRepo3 = Source.getRepository(AssetDepreciationRegister);
    const { branchId } = req.query;
    const qb = assetRepo3.createQueryBuilder('a');
    if (branchId) qb.andWhere('a.branchId = :branchId', { branchId });
    const assets = await qb.getMany();

    const brandMap: Record<string, { cost: number; nbv: number }> = {};
    const statusMap: Record<string, number> = {};

    for (const a of assets) {
      const dep = calculateDepreciation({
        purchasePrice: Number(a.purchasePrice),
        salvageValue: Number(a.salvageValue),
        usefulLifeMonths: a.usefulLifeMonths,
        annualDepreciationPct: Number(a.annualDepreciationPct),
        method: a.method as 'STRAIGHT_LINE' | 'DECLINING_BALANCE',
        purchaseDate: new Date(a.purchaseDate),
      });
      const bid = a.brandId ?? 'Unknown';
      if (!brandMap[bid]) brandMap[bid] = { cost: 0, nbv: 0 };
      brandMap[bid].cost += Number(a.purchasePrice);
      brandMap[bid].nbv += dep.nbv;
      statusMap[a.status] = (statusMap[a.status] ?? 0) + 1;
    }

    const costVsNBV = Object.entries(brandMap).map(([brand, v]) => ({
      brand,
      cost: v.cost,
      nbv: v.nbv,
    }));
    const statusPie = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

    const journalRepo2 = Source.getRepository(DepreciationJournalEntry);
    const journals = await journalRepo2.find({
      where: { status: 'POSTED' },
      order: { periodYear: 'ASC', periodMonth: 'ASC' },
    });
    const monthlyCharge = journals.map((j) => ({
      month: `${j.periodYear}-${String(j.periodMonth).padStart(2, '0')}`,
      amount: Number(j.totalAmount),
    }));

    res.json({ success: true, data: { costVsNBV, statusPie, monthlyCharge } });
  } catch (err) {
    next(err);
  }
};

export const getEquityCharts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = Source.getRepository(EquityEntry);
    const { branchId } = req.query;
    const qb = repo.createQueryBuilder('e');
    if (branchId) qb.andWhere('e.branchId = :branchId', { branchId });
    qb.orderBy('e.date', 'ASC');
    const rows = await qb.getMany();

    const typeMap: Record<string, number> = {};
    const positive3 = [
      'SHARE_CAPITAL',
      'RETAINED_EARNINGS',
      'RESERVES',
      'OWNER_CONTRIBUTION',
      'PROFIT_TRANSFER',
    ];
    for (const r of rows) {
      const sign = positive3.includes(r.type) ? 1 : -1;
      typeMap[r.type] = (typeMap[r.type] ?? 0) + Number(r.amount) * sign;
    }
    const composition = Object.entries(typeMap)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }));

    let running = 0;
    const waterfall = rows.map((r) => {
      const sign = positive3.includes(r.type) ? 1 : -1;
      const delta = Number(r.amount) * sign;
      const start = delta >= 0 ? running : running + delta;
      running += delta;
      return {
        name: r.type,
        value: Math.abs(delta),
        start,
        fill: delta >= 0 ? '#10b981' : '#ef4444',
      };
    });

    running = 0;
    const monthMap2: Record<string, number> = {};
    for (const r of rows) {
      const month = r.date.slice(0, 7);
      const sign = positive3.includes(r.type) ? 1 : -1;
      monthMap2[month] = (monthMap2[month] ?? 0) + Number(r.amount) * sign;
    }
    const growthLine = Object.keys(monthMap2)
      .sort()
      .map((month) => {
        running += monthMap2[month];
        return { month, equity: running };
      });

    res.json({ success: true, data: { composition, waterfall, growthTrend: growthLine } });
  } catch (err) {
    next(err);
  }
};

// ─── PROFIT & LOSS ────────────────────────────────────────────────────────────

export const getProfitLoss = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fromDate, toDate, period } = req.query;
    const branchF = req.branchFilter ?? [];

    let dateFrom: string, dateTo: string;
    if (fromDate && toDate) {
      dateFrom = fromDate as string;
      dateTo = toDate as string;
    } else {
      const range = getPeriodRange(period as string);
      dateFrom = range.fromDate;
      dateTo = range.toDate;
    }

    const invoiceRepo = Source.getRepository(Invoice);
    const invQb = invoiceRepo
      .createQueryBuilder('i')
      .where('CAST(i.createdAt AS DATE) >= :from', { from: dateFrom })
      .andWhere('CAST(i.createdAt AS DATE) <= :to', { to: dateTo })
      .andWhere('i.status NOT IN (:...excl)', { excl: ['DRAFT', 'CANCELLED'] });
    applyBranchQB(invQb as never, 'i', branchF);
    const invoices = await invQb.getMany();

    const revenueByType: Record<string, number> = {};
    let totalRevenue = 0,
      totalTax = 0;
    const monthlyRevMap: Record<string, number> = {};
    for (const inv of invoices) {
      const taxAmt = Number(inv.taxAmount ?? 0);
      const amt = Number(inv.totalAmount) - taxAmt; // accrual: revenue excludes VAT
      revenueByType[inv.saleType] = (revenueByType[inv.saleType] ?? 0) + amt;
      totalRevenue += amt;
      totalTax += taxAmt;
      const key = String(inv.createdAt).slice(0, 7);
      monthlyRevMap[key] = (monthlyRevMap[key] ?? 0) + amt;
    }

    const expRepo = Source.getRepository(ExpenseEntry);
    const expQb = expRepo
      .createQueryBuilder('e')
      .where('e.date >= :from', { from: dateFrom })
      .andWhere('e.date <= :to', { to: dateTo })
      .andWhere('e.status IN (:...statuses)', { statuses: ['APPROVED', 'PAID'] });
    applyBranchQB(expQb as never, 'e', branchF);
    const expenses = await expQb.getMany();

    const expByCategory: Record<string, number> = {};
    let totalExpenses = 0;
    const monthlyExpMap: Record<string, number> = {};
    for (const exp of expenses) {
      const amt = Number(exp.amount);
      expByCategory[exp.category] = (expByCategory[exp.category] ?? 0) + amt;
      totalExpenses += amt;
      const key = String(exp.date).slice(0, 7);
      monthlyExpMap[key] = (monthlyExpMap[key] ?? 0) + amt;
    }

    const allMonths = new Set([...Object.keys(monthlyRevMap), ...Object.keys(monthlyExpMap)]);
    const monthly = Array.from(allMonths)
      .sort()
      .map((month) => ({
        month,
        revenue: monthlyRevMap[month] ?? 0,
        expenses: monthlyExpMap[month] ?? 0,
        net: (monthlyRevMap[month] ?? 0) - (monthlyExpMap[month] ?? 0),
      }));

    const netProfit = totalRevenue - totalExpenses;
    const margin = totalRevenue > 0 ? +((netProfit / totalRevenue) * 100).toFixed(2) : 0;

    res.json({
      success: true,
      data: {
        fromDate: dateFrom,
        toDate: dateTo,
        totalRevenue,
        totalExpenses,
        netProfit,
        margin,
        totalTax,
        totalIncome: totalRevenue,
        revenueByType,
        expByCategory,
        monthly,
        invoiceCount: invoices.length,
        expenseCount: expenses.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── EXCHANGE RATES ───────────────────────────────────────────────────────────

export const getExchangeRates = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rates = await Source.getRepository(ExchangeRate).find({ order: { createdAt: 'DESC' } });
    res.json({ success: true, data: rates });
  } catch (err) {
    next(err);
  }
};

export const setExchangeRate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = Source.getRepository(ExchangeRate);
    const { fromCurrency, toCurrency, rate } = req.body;
    const existing = await repo.findOne({ where: { fromCurrency, toCurrency } });
    if (existing) {
      existing.rate = Number(rate);
      existing.setBy = req.user?.userId ?? 'system';
      const saved = await repo.save(existing);
      return res.json({ success: true, data: saved });
    }
    const newRate = repo.create({
      fromCurrency,
      toCurrency,
      rate: Number(rate),
      setBy: req.user?.userId ?? 'system',
    }) as unknown as ExchangeRate;
    const saved = await repo.save(newRate);
    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
};

// ─── ADMIN CONSOLIDATED ENDPOINTS ─────────────────────────────────────────────

export const getConsolidatedKPIs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { period } = req.query;
    const bFilter = req.branchFilter ?? [];
    const { fromDate, toDate } = getPeriodRange(period as string);

    const cbRepo = Source.getRepository(CashBankAccount);
    const cbQb = cbRepo.createQueryBuilder('a').where('a.isActive = :active', { active: true });
    applyBranchQB(cbQb as never, 'a', bFilter);
    const cashAccts = await cbQb.getMany();
    const totalCash = cashAccts
      .filter((a) => a.type === 'CASH')
      .reduce((s, a) => s + Number(a.currentBalance), 0);
    const totalBank = cashAccts
      .filter((a) => a.type === 'BANK')
      .reduce((s, a) => s + Number(a.currentBalance), 0);

    const rcvRepo = Source.getRepository(ManualReceivable);
    const rcvQb = rcvRepo.createQueryBuilder('r').where('r.status != :s', { s: 'PAID' });
    applyBranchQB(rcvQb as never, 'r', bFilter);
    const receivables = await rcvQb.getMany();
    const totalReceivable = receivables.reduce((s, r) => s + Number(r.outstanding ?? 0), 0);
    const today = new Date();
    const overdueReceivables = receivables
      .filter((r) => {
        const diff = (today.getTime() - new Date(r.dueDate).getTime()) / 86400000;
        return diff > 90;
      })
      .reduce((s, r) => s + Number(r.outstanding ?? 0), 0);

    const payRepo = Source.getRepository(ManualPayable);
    const payQb = payRepo.createQueryBuilder('p').where('p.status != :s', { s: 'PAID' });
    applyBranchQB(payQb as never, 'p', bFilter);
    const payables = await payQb.getMany();
    const totalPayable = payables.reduce((s, p) => s + Number(p.outstanding ?? 0), 0);

    const invoiceRepo = Source.getRepository(Invoice);
    const invQb = invoiceRepo
      .createQueryBuilder('i')
      .where('CAST(i.createdAt AS DATE) >= :from', { from: fromDate })
      .andWhere('CAST(i.createdAt AS DATE) <= :to', { to: toDate })
      .andWhere('i.status NOT IN (:...excl)', { excl: ['DRAFT', 'CANCELLED'] });
    applyBranchQB(invQb as never, 'i', bFilter);
    const invoices = await invQb.getMany();
    const totalRevenue = invoices.reduce(
      (s, i) => s + Number(i.totalAmount) - Number(i.taxAmount ?? 0),
      0,
    );

    const expRepo = Source.getRepository(ExpenseEntry);
    const expQb = expRepo
      .createQueryBuilder('e')
      .where('e.date >= :from', { from: fromDate })
      .andWhere('e.date <= :to', { to: toDate })
      .andWhere('e.status IN (:...statuses)', { statuses: ['APPROVED', 'PAID'] });
    applyBranchQB(expQb as never, 'e', bFilter);
    const expEntries = await expQb.getMany();
    const totalExpenses = expEntries.reduce((s, e) => s + Number(e.amount), 0);
    const netProfit = totalRevenue - totalExpenses;

    const branchSet = new Set([
      ...cashAccts.map((a) => a.branchId),
      ...receivables.map((r) => r.branchId),
      ...payables.map((p) => p.branchId),
    ]);
    const perBranch = Array.from(branchSet).map((bid) => ({
      branchId: bid,
      cash: cashAccts
        .filter((a) => a.branchId === bid && a.type === 'CASH')
        .reduce((s, a) => s + Number(a.currentBalance), 0),
      bank: cashAccts
        .filter((a) => a.branchId === bid && a.type === 'BANK')
        .reduce((s, a) => s + Number(a.currentBalance), 0),
      receivable: receivables
        .filter((r) => r.branchId === bid)
        .reduce((s, r) => s + Number(r.outstanding ?? 0), 0),
      payable: payables
        .filter((p) => p.branchId === bid)
        .reduce((s, p) => s + Number(p.outstanding ?? 0), 0),
      expenses: expEntries
        .filter((e) => e.branchId === bid)
        .reduce((s, e) => s + Number(e.amount), 0),
      total: cashAccts
        .filter((a) => a.branchId === bid)
        .reduce((s, a) => s + Number(a.currentBalance), 0),
    }));

    res.json({
      success: true,
      data: {
        totalCash,
        totalBank,
        totalReceivable,
        totalPayable,
        netProfit,
        overdueReceivables,
        perBranch,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getBranchPerformance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { period } = req.query;
    const bFilter = req.branchFilter ?? [];
    const { fromDate, toDate } = getPeriodRange(period as string);

    const invoiceRepo = Source.getRepository(Invoice);
    const invQb = invoiceRepo
      .createQueryBuilder('i')
      .where('CAST(i.createdAt AS DATE) >= :from', { from: fromDate })
      .andWhere('CAST(i.createdAt AS DATE) <= :to', { to: toDate })
      .andWhere('i.status NOT IN (:...excl)', { excl: ['DRAFT', 'CANCELLED'] });
    applyBranchQB(invQb as never, 'i', bFilter);
    const invoices = await invQb.getMany();

    const expRepo = Source.getRepository(ExpenseEntry);
    const expQb = expRepo
      .createQueryBuilder('e')
      .where('e.date >= :from', { from: fromDate })
      .andWhere('e.date <= :to', { to: toDate })
      .andWhere('e.status IN (:...statuses)', { statuses: ['APPROVED', 'PAID'] });
    applyBranchQB(expQb as never, 'e', bFilter);
    const expEntries = await expQb.getMany();

    const rcvRepo = Source.getRepository(ManualReceivable);
    const rcvQb = rcvRepo.createQueryBuilder('r').where('r.status != :s', { s: 'PAID' });
    applyBranchQB(rcvQb as never, 'r', bFilter);
    const receivables = await rcvQb.getMany();

    const payRepo = Source.getRepository(ManualPayable);
    const payQb = payRepo.createQueryBuilder('p').where('p.status != :s', { s: 'PAID' });
    applyBranchQB(payQb as never, 'p', bFilter);
    const payables = await payQb.getMany();

    const cbRepo = Source.getRepository(CashBankAccount);
    const cbQb = cbRepo.createQueryBuilder('a').where('a.isActive = :active', { active: true });
    applyBranchQB(cbQb as never, 'a', bFilter);
    const accounts = await cbQb.getMany();

    const branchSet = new Set([
      ...invoices.map((i) => i.branchId),
      ...expEntries.map((e) => e.branchId),
      ...receivables.map((r) => r.branchId),
      ...payables.map((p) => p.branchId),
    ]);

    const today = new Date();
    const rows = Array.from(branchSet).map((bid) => {
      const revenue = invoices
        .filter((i) => i.branchId === bid)
        .reduce((s, i) => s + Number(i.totalAmount) - Number(i.taxAmount ?? 0), 0);
      const expenses = expEntries
        .filter((e) => e.branchId === bid)
        .reduce((s, e) => s + Number(e.amount), 0);
      const netProfit = revenue - expenses;
      const marginPct = revenue > 0 ? +((netProfit / revenue) * 100).toFixed(1) : 0;
      const rcv = receivables.filter((r) => r.branchId === bid);
      const receivablesAmt = rcv.reduce((s, r) => s + Number(r.outstanding ?? 0), 0);
      const payablesAmt = payables
        .filter((p) => p.branchId === bid)
        .reduce((s, p) => s + Number(p.outstanding ?? 0), 0);
      const cash = accounts
        .filter((a) => a.branchId === bid)
        .reduce((s, a) => s + Number(a.currentBalance), 0);
      const overdueCount = rcv.filter(
        (r) => (today.getTime() - new Date(r.dueDate).getTime()) / 86400000 > 30,
      ).length;
      const status: 'HEALTHY' | 'WATCH' | 'ALERT' =
        marginPct >= 20 ? 'HEALTHY' : marginPct >= 5 ? 'WATCH' : 'ALERT';
      return {
        branchId: bid,
        revenue,
        expenses,
        grossProfit: netProfit,
        netProfit,
        marginPct,
        receivables: receivablesAmt,
        payables: payablesAmt,
        cash,
        overdueCount,
        status,
      };
    });

    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

export const getBranchComparison = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { period } = req.query;
    const bFilter = req.branchFilter ?? [];
    const { fromDate, toDate } = getPeriodRange(period as string);

    const invoiceRepo = Source.getRepository(Invoice);
    const invQb = invoiceRepo
      .createQueryBuilder('i')
      .where('CAST(i.createdAt AS DATE) >= :from', { from: fromDate })
      .andWhere('CAST(i.createdAt AS DATE) <= :to', { to: toDate })
      .andWhere('i.status NOT IN (:...excl)', { excl: ['DRAFT', 'CANCELLED'] });
    applyBranchQB(invQb as never, 'i', bFilter);
    const invoices = await invQb.getMany();

    const expRepo = Source.getRepository(ExpenseEntry);
    const expQb = expRepo
      .createQueryBuilder('e')
      .where('e.date >= :from', { from: fromDate })
      .andWhere('e.date <= :to', { to: toDate })
      .andWhere('e.status IN (:...statuses)', { statuses: ['APPROVED', 'PAID'] });
    applyBranchQB(expQb as never, 'e', bFilter);
    const expEntries = await expQb.getMany();

    const branchSet = new Set([
      ...invoices.map((i) => i.branchId),
      ...expEntries.map((e) => e.branchId),
    ]);
    const rows = Array.from(branchSet)
      .map((bid) => {
        const revenue = invoices
          .filter((i) => i.branchId === bid)
          .reduce((s, i) => s + Number(i.totalAmount) - Number(i.taxAmount ?? 0), 0);
        const expenses = expEntries
          .filter((e) => e.branchId === bid)
          .reduce((s, e) => s + Number(e.amount), 0);
        return { branchId: bid, name: bid.slice(0, 8), revenue, expenses, net: revenue - expenses };
      })
      .sort((a, b) => b.revenue - a.revenue);

    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

export const getConsolidatedPL = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { period, fromDate: fd, toDate: td } = req.query;
    const bFilter = req.branchFilter ?? [];
    let dateFrom: string, dateTo: string;
    if (fd && td) {
      dateFrom = fd as string;
      dateTo = td as string;
    } else {
      const r = getPeriodRange(period as string);
      dateFrom = r.fromDate;
      dateTo = r.toDate;
    }

    const invoiceRepo = Source.getRepository(Invoice);
    const invQb = invoiceRepo
      .createQueryBuilder('i')
      .where('CAST(i.createdAt AS DATE) >= :from', { from: dateFrom })
      .andWhere('CAST(i.createdAt AS DATE) <= :to', { to: dateTo })
      .andWhere('i.status NOT IN (:...excl)', { excl: ['DRAFT', 'CANCELLED'] });
    applyBranchQB(invQb as never, 'i', bFilter);
    const invoices = await invQb.getMany();

    const expRepo = Source.getRepository(ExpenseEntry);
    const expQb = expRepo
      .createQueryBuilder('e')
      .where('e.date >= :from', { from: dateFrom })
      .andWhere('e.date <= :to', { to: dateTo })
      .andWhere('e.status IN (:...statuses)', { statuses: ['APPROVED', 'PAID'] });
    applyBranchQB(expQb as never, 'e', bFilter);
    const expEntries = await expQb.getMany();

    const monthRevMap: Record<string, number> = {};
    const monthExpMap: Record<string, number> = {};
    let totalIncome = 0,
      totalExpenses = 0;
    for (const inv of invoices) {
      const key = String(inv.createdAt).slice(0, 7);
      const netAmt = Number(inv.totalAmount) - Number(inv.taxAmount ?? 0);
      monthRevMap[key] = (monthRevMap[key] ?? 0) + netAmt;
      totalIncome += netAmt;
    }
    for (const exp of expEntries) {
      const key = String(exp.date).slice(0, 7);
      monthExpMap[key] = (monthExpMap[key] ?? 0) + Number(exp.amount);
      totalExpenses += Number(exp.amount);
    }

    const allMonths = new Set([...Object.keys(monthRevMap), ...Object.keys(monthExpMap)]);
    const monthly = Array.from(allMonths)
      .sort()
      .map((month) => ({
        month,
        revenue: monthRevMap[month] ?? 0,
        expenses: monthExpMap[month] ?? 0,
        net: (monthRevMap[month] ?? 0) - (monthExpMap[month] ?? 0),
      }));

    const netProfit = totalIncome - totalExpenses;
    const margin = totalIncome > 0 ? +((netProfit / totalIncome) * 100).toFixed(2) : 0;

    res.json({
      success: true,
      data: {
        fromDate: dateFrom,
        toDate: dateTo,
        totalIncome,
        totalExpenses,
        netProfit,
        margin,
        monthly,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getConsolidatedBalanceSheet = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const bFilter = req.branchFilter ?? [];

    const cbRepo = Source.getRepository(CashBankAccount);
    const cbQb = cbRepo.createQueryBuilder('a').where('a.isActive = :active', { active: true });
    applyBranchQB(cbQb as never, 'a', bFilter);
    const cashAccts = await cbQb.getMany();
    const cashAndBank = cashAccts.reduce((s, a) => s + Number(a.currentBalance), 0);

    const assetRepo = Source.getRepository(AssetDepreciationRegister);
    const aQb = assetRepo.createQueryBuilder('a').where('a.status = :s', { s: 'ACTIVE' });
    applyBranchQB(aQb as never, 'a', bFilter);
    const depAssets = await aQb.getMany();
    let fixedNBV = 0;
    for (const a of depAssets) {
      const dep = calculateDepreciation({
        purchasePrice: Number(a.purchasePrice),
        salvageValue: Number(a.salvageValue),
        usefulLifeMonths: a.usefulLifeMonths,
        annualDepreciationPct: Number(a.annualDepreciationPct),
        method: a.method as 'STRAIGHT_LINE' | 'DECLINING_BALANCE',
        purchaseDate: new Date(a.purchaseDate),
      });
      fixedNBV += dep.nbv;
    }

    const rcvRepo = Source.getRepository(ManualReceivable);
    const rcvQb = rcvRepo.createQueryBuilder('r').where('r.status != :s', { s: 'PAID' });
    applyBranchQB(rcvQb as never, 'r', bFilter);
    const receivables = await rcvQb.getMany();
    const receivablesTotal = receivables.reduce((s, r) => s + Number(r.outstanding ?? 0), 0);

    const payRepo = Source.getRepository(ManualPayable);
    const payQb = payRepo.createQueryBuilder('p').where('p.status != :s', { s: 'PAID' });
    applyBranchQB(payQb as never, 'p', bFilter);
    const payables = await payQb.getMany();
    const payablesTotal = payables.reduce((s, p) => s + Number(p.outstanding ?? 0), 0);

    const eqRepo = Source.getRepository(EquityEntry);
    const eqQb = eqRepo.createQueryBuilder('e');
    applyBranchQB(eqQb as never, 'e', bFilter);
    const eqEntries = await eqQb.getMany();
    const positive = [
      'SHARE_CAPITAL',
      'RETAINED_EARNINGS',
      'RESERVES',
      'OWNER_CONTRIBUTION',
      'PROFIT_TRANSFER',
    ];
    let totalEquity = 0;
    for (const e of eqEntries) {
      if (positive.includes(e.type)) totalEquity += Number(e.amount);
      else totalEquity -= Number(e.amount);
    }

    const totalAssets = cashAndBank + fixedNBV + receivablesTotal;
    const totalLiabilities = payablesTotal;

    res.json({
      success: true,
      data: {
        totalAssets,
        totalLiabilities,
        totalEquity,
        cashAndBank,
        receivables: receivablesTotal,
        payables: payablesTotal,
        fixedAssets: fixedNBV,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── CASH & BANK — EXTENDED CRUD ─────────────────────────────────────────────

function genRef(prefix = 'CB'): string {
  return `${prefix}-${new Date().getFullYear()}-${Date.now().toString().slice(-7)}`;
}

export const deactivateCashBankAccount = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = req.params.id as string;
    const repo = Source.getRepository(CashBankAccount);
    const account = await repo.findOne({ where: { id } });
    if (!account) throw new AppError('Account not found', 404);
    if (Number(account.currentBalance) !== 0) {
      throw new AppError(
        `Cannot deactivate. Please withdraw remaining balance of ${account.currency} ${Number(account.currentBalance).toFixed(2)} first.`,
        400,
      );
    }
    await repo.update(id, { isActive: false });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

export const getCashBankSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = Source.getRepository(CashBankAccount);
    const qb = repo.createQueryBuilder('a').where('a.isActive = :active', { active: true });
    applyBranchQB(qb as never, 'a', req.branchFilter ?? []);
    const accounts = await qb.getMany();

    const totalCash = accounts
      .filter((a) => a.type === 'CASH')
      .reduce((s, a) => s + Number(a.currentBalance), 0);
    const totalBank = accounts
      .filter((a) => a.type === 'BANK')
      .reduce((s, a) => s + Number(a.currentBalance), 0);

    const byCurrency: Record<string, number> = {};
    for (const a of accounts) {
      byCurrency[a.currency] = (byCurrency[a.currency] ?? 0) + Number(a.currentBalance);
    }

    const byBranch: Record<string, number> = {};
    for (const a of accounts) {
      byBranch[a.branchId] = (byBranch[a.branchId] ?? 0) + Number(a.currentBalance);
    }

    res.json({
      success: true,
      data: {
        totalCash,
        totalBank,
        totalCombined: totalCash + totalBank,
        accountCount: accounts.length,
        byCurrency,
        byBranch,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const depositToCashBank = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { date, amount, source, referenceNo, description, notes, linkedCashAccountId } = req.body;
    const userId = req.user?.userId ?? '';

    if (!amount || Number(amount) <= 0) throw new AppError('Amount must be positive', 400);

    await Source.transaction(async (em) => {
      const accountRepo = em.getRepository(CashBankAccount);
      const entryRepo = em.getRepository(CashbookEntry);

      const account = await accountRepo.findOne({ where: { id } });
      if (!account) throw new AppError('Account not found', 404);

      const ref = referenceNo || genRef('DEP');
      await entryRepo.save(
        entryRepo.create({
          referenceNo: ref,
          date: date || new Date().toISOString().slice(0, 10),
          accountId: id,
          entryType: 'RECEIPT',
          amount: Number(amount),
          category: source || 'DEPOSIT',
          description: description || 'Deposit',
          notes,
          createdBy: userId,
          branchId: account.branchId,
        }) as unknown as CashbookEntry,
      );

      account.currentBalance = Number(account.currentBalance) + Number(amount);
      await accountRepo.save(account);

      if (linkedCashAccountId) {
        const linkedId = linkedCashAccountId as string;
        const cashAcc = await accountRepo.findOne({ where: { id: linkedId } });
        if (cashAcc) {
          const newBalance = Number(cashAcc.currentBalance) - Number(amount);
          if (newBalance < 0)
            throw new AppError('Insufficient cash balance in linked cash account', 400);
          await entryRepo.save(
            entryRepo.create({
              referenceNo: genRef('PAY'),
              date: date || new Date().toISOString().slice(0, 10),
              accountId: linkedId,
              entryType: 'PAYMENT',
              amount: Number(amount),
              category: 'BANK_DEPOSIT',
              description: `Transfer to bank: ${account.name}`,
              notes,
              createdBy: userId,
              branchId: cashAcc.branchId,
            }) as unknown as CashbookEntry,
          );
          cashAcc.currentBalance = newBalance;
          await accountRepo.save(cashAcc);
        }
      }
    });

    const updated = await Source.getRepository(CashBankAccount).findOne({ where: { id } });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

export const withdrawFromCashBank = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const {
      date,
      amount,
      purpose,
      referenceNo,
      chequeNo,
      description,
      notes,
      linkedCashAccountId,
    } = req.body;
    const userId = req.user?.userId ?? '';

    if (!amount || Number(amount) <= 0) throw new AppError('Amount must be positive', 400);

    await Source.transaction(async (em) => {
      const accountRepo = em.getRepository(CashBankAccount);
      const entryRepo = em.getRepository(CashbookEntry);

      const account = await accountRepo.findOne({ where: { id } });
      if (!account) throw new AppError('Account not found', 404);

      if (Number(account.currentBalance) < Number(amount)) {
        throw new AppError(
          `Insufficient balance. Available: ${account.currency} ${Number(account.currentBalance).toFixed(2)}`,
          400,
        );
      }

      const ref = referenceNo || genRef('WDR');
      await entryRepo.save(
        entryRepo.create({
          referenceNo: ref,
          date: date || new Date().toISOString().slice(0, 10),
          accountId: id,
          entryType: 'PAYMENT',
          amount: Number(amount),
          category: purpose || 'WITHDRAWAL',
          description: description || 'Withdrawal',
          notes,
          chequeNo,
          createdBy: userId,
          branchId: account.branchId,
        }) as unknown as CashbookEntry,
      );

      account.currentBalance = Number(account.currentBalance) - Number(amount);
      await accountRepo.save(account);

      if (linkedCashAccountId) {
        const linkedId = linkedCashAccountId as string;
        const cashAcc = await accountRepo.findOne({ where: { id: linkedId } });
        if (cashAcc) {
          await entryRepo.save(
            entryRepo.create({
              referenceNo: genRef('REC'),
              date: date || new Date().toISOString().slice(0, 10),
              accountId: linkedId,
              entryType: 'RECEIPT',
              amount: Number(amount),
              category: 'CASH_WITHDRAWAL',
              description: `Cash from bank: ${account.name}`,
              notes,
              createdBy: userId,
              branchId: cashAcc.branchId,
            }) as unknown as CashbookEntry,
          );
          cashAcc.currentBalance = Number(cashAcc.currentBalance) + Number(amount);
          await accountRepo.save(cashAcc);
        }
      }
    });

    const updated = await Source.getRepository(CashBankAccount).findOne({ where: { id } });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

export const transferBetweenAccounts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      fromAccountId,
      toAccountId,
      amount,
      date,
      referenceNo,
      description,
      notes,
      exchangeRate,
    } = req.body;
    const userId = req.user?.userId ?? '';

    if (!fromAccountId || !toAccountId)
      throw new AppError('Both from and to account are required', 400);
    if (fromAccountId === toAccountId)
      throw new AppError('From and To accounts must be different', 400);
    if (!amount || Number(amount) <= 0) throw new AppError('Amount must be positive', 400);

    await Source.transaction(async (em) => {
      const accountRepo = em.getRepository(CashBankAccount);
      const entryRepo = em.getRepository(CashbookEntry);

      const fromAcc = await accountRepo.findOne({ where: { id: fromAccountId } });
      const toAcc = await accountRepo.findOne({ where: { id: toAccountId } });
      if (!fromAcc) throw new AppError('Source account not found', 404);
      if (!toAcc) throw new AppError('Destination account not found', 404);

      if (Number(fromAcc.currentBalance) < Number(amount)) {
        throw new AppError(
          `Insufficient balance in source account. Available: ${fromAcc.currency} ${Number(fromAcc.currentBalance).toFixed(2)}`,
          400,
        );
      }

      const ref = referenceNo || genRef('TRF');
      const transferDate = date || new Date().toISOString().slice(0, 10);
      const desc = description || `Transfer to ${toAcc.name}`;

      await entryRepo.save(
        entryRepo.create({
          referenceNo: ref,
          date: transferDate,
          accountId: fromAccountId as string,
          entryType: 'PAYMENT',
          amount: Number(amount),
          category: 'TRANSFER',
          description: desc,
          notes,
          createdBy: userId,
          branchId: fromAcc.branchId,
        }) as unknown as CashbookEntry,
      );

      const receiveAmt = exchangeRate ? Number(amount) * Number(exchangeRate) : Number(amount);
      await entryRepo.save(
        entryRepo.create({
          referenceNo: `${ref}-R`,
          date: transferDate,
          accountId: toAccountId as string,
          entryType: 'RECEIPT',
          amount: receiveAmt,
          category: 'TRANSFER',
          description: `Transfer from ${fromAcc.name}`,
          notes,
          createdBy: userId,
          branchId: toAcc.branchId,
        }) as unknown as CashbookEntry,
      );

      fromAcc.currentBalance = Number(fromAcc.currentBalance) - Number(amount);
      toAcc.currentBalance = Number(toAcc.currentBalance) + receiveAmt;
      await accountRepo.save(fromAcc);
      await accountRepo.save(toAcc);
    });

    const [from, to] = await Promise.all([
      Source.getRepository(CashBankAccount).findOne({ where: { id: fromAccountId } }),
      Source.getRepository(CashBankAccount).findOne({ where: { id: toAccountId } }),
    ]);

    res.json({ success: true, data: { from, to } });
  } catch (err) {
    next(err);
  }
};

export const getCashBankTransactions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { fromDate, toDate, entryType, page = '1', limit = '50' } = req.query;

    const accountRepo = Source.getRepository(CashBankAccount);
    const entryRepo = Source.getRepository(CashbookEntry);

    const account = await accountRepo.findOne({ where: { id } });
    if (!account) throw new AppError('Account not found', 404);

    // Get ALL entries sorted by date ASC to compute running balance
    const allQb = entryRepo
      .createQueryBuilder('e')
      .where('e.accountId = :id', { id })
      .orderBy('e.date', 'ASC')
      .addOrderBy('e.createdAt', 'ASC');
    const allEntries = await allQb.getMany();

    // Compute running balance from opening
    let running = Number(account.openingBalance);
    const withBalance = allEntries.map((e) => {
      const delta = e.entryType === 'RECEIPT' ? Number(e.amount) : -Number(e.amount);
      running += delta;
      return { ...e, runningBalance: running };
    });

    // Filter and paginate
    let filtered = withBalance;
    if (fromDate) filtered = filtered.filter((e) => String(e.date) >= String(fromDate));
    if (toDate) filtered = filtered.filter((e) => String(e.date) <= String(toDate));
    if (entryType) filtered = filtered.filter((e) => e.entryType === entryType);

    const total = filtered.length;
    const pageNum = parseInt(String(page), 10);
    const limitNum = parseInt(String(limit), 10);
    const paginated = filtered.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    res.json({
      success: true,
      data: {
        account,
        entries: paginated,
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
};

export const reconcileAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { reconciliationDate, statementDate, statementBalance, notes } = req.body;
    const userId = req.user?.userId ?? '';

    const account = await Source.getRepository(CashBankAccount).findOne({ where: { id } });
    if (!account) throw new AppError('Account not found', 404);

    const bookBalance = Number(account.currentBalance);
    const stmtBal = Number(statementBalance);
    const difference = Math.abs(bookBalance - stmtBal);
    const isBalanced = difference < 0.01;

    const repo = Source.getRepository(AccountReconciliation);
    const rec = repo.create({
      accountId: id,
      reconciliationDate,
      statementDate,
      bookBalance,
      statementBalance: stmtBal,
      difference,
      isBalanced,
      notes,
      createdBy: userId,
    }) as unknown as AccountReconciliation;
    const saved = await repo.save(rec);

    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
};

export const getReconciliations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const repo = Source.getRepository(AccountReconciliation);
    const recs = await repo.find({
      where: { accountId: id },
      order: { createdAt: 'DESC' },
    });
    res.json({ success: true, data: recs });
  } catch (err) {
    next(err);
  }
};
