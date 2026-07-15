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
import { CountryTaxRule } from '../entities/countryTaxRuleEntity';
import { VatRemittance } from '../entities/vatRemittanceEntity';
import { computeProfitAndLoss, computeBalanceSheet } from '../utils/accountsShared';
import { Cheque } from '../entities/chequeEntity';

// ─── INTERNAL SERVICE HELPER ──────────────────────────────────────────────────

async function internalFetchJSON<T>(
  url: string,
  options?: { method?: string; body?: string },
): Promise<T | null> {
  try {
    const { sign } = await import('jsonwebtoken');
    const token = sign(
      { userId: 'billing_service', role: 'ADMIN' },
      process.env.ACCESS_SECRET as string,
      { expiresIn: '1m' },
    );
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      method: options?.method ?? 'GET',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        'x-internal-service': 'billing',
        'Content-Type': 'application/json',
      },
      body: options?.body,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Billing] internal call failed ${url}:`, msg);
    return null;
  }
}
import { postCashbookEntry } from '../services/cashbookService';
import { logger } from '../config/logger';
import { nowInBusinessTz, todayInBusinessTz } from '../utils/businessDate';

// ─── PERIOD HELPER ─────────────────────────────────────────────────────────────

function getPeriodRange(period?: string): { fromDate: string; toDate: string } {
  // Use business timezone so early-morning UTC moments land on the correct local month/year.
  // NOTE: Avoid toISOString() for date-only values — it converts to UTC which produces
  // off-by-one dates for UTC+ timezones (e.g. July 1 00:00 IST = June 30 18:30 UTC).
  const { year: y, month0: m } = nowInBusinessTz();
  const pad = (n: number) => String(n).padStart(2, '0');
  // lastDayOf: day=0 trick gives the last day of the previous month
  const lastDayOf = (yr: number, mo1: number) => new Date(yr, mo1, 0).getDate();

  switch (period) {
    case 'this_month': {
      const mo = m + 1; // 1-indexed month
      return { fromDate: `${y}-${pad(mo)}-01`, toDate: `${y}-${pad(mo)}-${pad(lastDayOf(y, mo))}` };
    }
    case 'last_month': {
      const mo = m === 0 ? 12 : m; // m is 0-indexed; last month in 1-indexed
      const yr = m === 0 ? y - 1 : y;
      return {
        fromDate: `${yr}-${pad(mo)}-01`,
        toDate: `${yr}-${pad(mo)}-${pad(lastDayOf(yr, mo))}`,
      };
    }
    case 'this_quarter': {
      const q = Math.floor(m / 3); // 0-indexed quarter
      const qStartMo = q * 3 + 1; // 1-indexed start month
      const qEndMo = q * 3 + 3; // 1-indexed end month
      return {
        fromDate: `${y}-${pad(qStartMo)}-01`,
        toDate: `${y}-${pad(qEndMo)}-${pad(lastDayOf(y, qEndMo))}`,
      };
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
    const branchId = req.user?.branchId ?? req.branchFilter?.[0] ?? req.body.branchId;
    const account = repo.create({
      ...req.body,
      branchId,
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
    const qb = repo.createQueryBuilder('e').leftJoinAndSelect('e.account', 'account');
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
    // P2-1: Hard-reject manual entries that reference non-existent same-service records.
    if (req.body.linkedInvoiceId) {
      const exists = await Source.getRepository(Invoice).findOne({
        where: { id: req.body.linkedInvoiceId },
        select: ['id'],
      });
      if (!exists) throw new AppError(`Invoice ${req.body.linkedInvoiceId} not found`, 400);
    }
    if (req.body.linkedExpenseId) {
      const exists = await Source.getRepository(ExpenseEntry).findOne({
        where: { id: req.body.linkedExpenseId },
        select: ['id'],
      });
      if (!exists) throw new AppError(`Expense ${req.body.linkedExpenseId} not found`, 400);
    }

    // Generate reference before transaction to avoid holding lock during count
    if (!req.body.referenceNo) {
      const count = await Source.getRepository(CashbookEntry).count();
      req.body.referenceNo = `CB-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    }
    const branchId = req.user?.branchId ?? req.branchFilter?.[0] ?? req.body.branchId;
    const saved = await postCashbookEntry({
      referenceNo: req.body.referenceNo,
      date: req.body.date,
      entryType: req.body.entryType,
      amount: Number(req.body.amount),
      category: req.body.category,
      branchId,
      createdBy: req.user?.userId ?? req.body.createdBy,
      paymentMode: req.body.paymentMode,
      accountId: req.body.accountId,
      linkedInvoiceId: req.body.linkedInvoiceId,
      linkedPoId: req.body.linkedPoId,
      linkedExpenseId: req.body.linkedExpenseId,
      description: req.body.description,
      chequeNo: req.body.chequeNo,
      notes: req.body.notes,
    });

    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
};

// P2-2: Reverse a MANUAL cashbook entry — creates an offsetting entry and marks the original.
export const reverseCashbookEntry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const repo = Source.getRepository(CashbookEntry);
    const original = await repo.findOne({ where: { id } });
    if (!original) throw new AppError('Cashbook entry not found', 404);
    if (original.sourceType) {
      throw new AppError(
        'Only MANUAL cashbook entries can be reversed. Correct the source record (invoice / expense) to reverse AUTO entries.',
        400,
      );
    }
    if (original.isReversed) throw new AppError('Entry has already been reversed', 400);

    const branchId = original.branchId;
    const userId = req.user?.userId ?? 'SYSTEM';

    // Build the reversing entry — opposite type, same amount, same account
    const reversalRefCount = await repo.count();
    const reversalRef = `REV-${original.referenceNo}-${String(reversalRefCount + 1).padStart(4, '0')}`;
    const reversalType: 'RECEIPT' | 'PAYMENT' =
      original.entryType === 'RECEIPT' ? 'PAYMENT' : 'RECEIPT';

    const reversal = await postCashbookEntry({
      referenceNo: reversalRef,
      date: todayInBusinessTz(),
      entryType: reversalType,
      amount: Number(original.amount),
      category: 'REVERSAL',
      branchId,
      createdBy: userId,
      paymentMode: original.paymentMode,
      accountId: original.accountId,
      description: `Reversal of ${original.referenceNo}`,
      notes: `Auto-generated reversal for entry ${original.referenceNo}`,
    });

    // Mark the original as reversed
    await repo.update(id, { isReversed: true, reversedById: reversal.id });

    res.status(201).json({ success: true, data: reversal });
  } catch (err) {
    next(err);
  }
};

// P2-1: Admin — list cashbook entries where linked_po_id was found orphaned by the nightly cron.
export const getOrphanedCashbookEntries = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (req.user?.role !== 'ADMIN') throw new AppError('Admin access required', 403);
    const repo = Source.getRepository(CashbookEntry);
    const orphans = await repo.find({
      where: { isPoOrphaned: true },
      order: { createdAt: 'DESC' },
      take: 200,
    });
    res.json({ success: true, data: orphans, count: orphans.length });
  } catch (err) {
    next(err);
  }
};

// ─── DAY BOOK ─────────────────────────────────────────────────────────────────

function toYmd(d: Date | string): string {
  // Always use the business timezone so entries near midnight land on the correct local day.
  // A plain DATE column string (e.g. "2026-07-10") passes through unchanged.
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('en-CA', {
    timeZone: process.env.BUSINESS_TIMEZONE ?? 'Asia/Qatar',
  });
}

interface DayBookDay {
  date: string;
  totalReceipts: number;
  totalPayments: number;
  net: number;
  transactionCount: number;
  entries: CashbookEntry[];
}

// Cash day book: per-day total earnings (receipts), total expenses (payments) and transactions.
// Merges data from three sources to guarantee completeness:
//  1. cashbook_entries  — auto-posted + manual entries (primary)
//  2. payment_transactions — invoice receipts not yet mirrored into cashbook
//  3. expense_entries (PAID/APPROVED) — expense payments not yet mirrored into cashbook
export const getDayBook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fromDate, toDate, accountId } = req.query;
    const { toBusinessDate } = await import('../utils/businessDate');
    const today = todayInBusinessTz();
    const from = (fromDate as string) || today;
    const to = (toDate as string) || from;
    const branchFilter = req.branchFilter ?? [];

    // ── 1. Cashbook entries (primary source) ────────────────────────────────
    const cbRepo = Source.getRepository(CashbookEntry);
    const cbQb = cbRepo.createQueryBuilder('e');
    applyBranchQB(cbQb as never, 'e', branchFilter);
    cbQb.andWhere('e.date >= :from', { from }).andWhere('e.date <= :to', { to });
    if (accountId) cbQb.andWhere('e.accountId = :accountId', { accountId });
    cbQb.orderBy('e.date', 'DESC').addOrderBy('e.createdAt', 'DESC');
    const cbEntries = await cbQb.getMany();

    // Track which source IDs are already in cashbook (idempotency)
    const postedInvoiceTxIds = new Set<string>();
    const postedExpenseIds = new Set<string>();
    for (const e of cbEntries) {
      if (e.sourceType === 'INVOICE_PAYMENT' && e.sourceId) postedInvoiceTxIds.add(e.sourceId);
      if (e.sourceType === 'EXPENSE' && e.sourceId) postedExpenseIds.add(e.sourceId);
    }

    // ── 2. Payment transactions not yet in cashbook ─────────────────────────
    // Join with invoices to get branchId for filtering
    const txRepo = Source.getRepository(PaymentTransaction);
    const txQb = txRepo
      .createQueryBuilder('tx')
      .leftJoinAndSelect('tx.invoice', 'inv')
      .where(`CAST(tx.transaction_date AS DATE) >= :from`, { from })
      .andWhere(`CAST(tx.transaction_date AS DATE) <= :to`, { to });

    if (branchFilter.length > 0) {
      txQb.andWhere('inv.branchId IN (:...branches)', { branches: branchFilter });
    }
    const allTxs = await txQb.getMany();
    // Synthetic cashbook-style entries for unmirrored payment transactions
    const synthReceipts: CashbookEntry[] = allTxs
      .filter((tx) => !postedInvoiceTxIds.has(tx.id))
      .map((tx) => {
        const e = new CashbookEntry();
        e.id = tx.id;
        e.referenceNo = tx.referenceNumber ?? `RCPT-${tx.id.slice(0, 8).toUpperCase()}`;
        e.date = new Date(toBusinessDate(tx.transactionDate));
        e.entryType = 'RECEIPT';
        e.amount = Number(tx.amount);
        e.category = 'Customer Payment';
        e.description = tx.invoice
          ? `Receipt for invoice ${tx.invoice.invoiceNumber}`
          : 'Invoice Receipt';
        e.paymentMode = tx.paymentMode;
        e.branchId = tx.invoice?.branchId ?? '';
        e.createdAt = tx.createdAt;
        e.isReversed = false;
        e.sourceType = 'INVOICE_PAYMENT';
        e.sourceId = tx.id;
        return e;
      });

    // ── 3. Paid expense entries not yet in cashbook ──────────────────────────
    const expRepo = Source.getRepository(ExpenseEntry);
    const expQb = expRepo
      .createQueryBuilder('exp')
      .where('exp.status IN (:...statuses)', { statuses: ['PAID', 'APPROVED'] })
      .andWhere(`COALESCE(exp.paymentDate, exp.date) BETWEEN :from AND :to`, { from, to });
    applyBranchQB(expQb as never, 'exp', branchFilter);
    const paidExpenses = await expQb.getMany();
    const synthPayments: CashbookEntry[] = paidExpenses
      .filter((exp) => !postedExpenseIds.has(exp.id))
      .map((exp) => {
        const e = new CashbookEntry();
        e.id = exp.id;
        e.referenceNo = exp.expenseNo ?? `EXP-${exp.id.slice(0, 8).toUpperCase()}`;
        e.date = new Date(exp.paymentDate ?? exp.date);
        e.entryType = 'PAYMENT';
        e.amount = Number(exp.netAmount);
        e.category = exp.category;
        e.description = exp.description;
        e.paymentMode = exp.paymentMode;
        e.branchId = exp.branchId;
        e.createdAt = exp.createdAt;
        e.isReversed = false;
        e.sourceType = 'EXPENSE';
        e.sourceId = exp.id;
        return e;
      });

    // ── Merge & aggregate ────────────────────────────────────────────────────
    const allEntries = [...cbEntries, ...synthReceipts, ...synthPayments].sort((a, b) => {
      const da = toYmd(a.date);
      const db = toYmd(b.date);
      if (da !== db) return da < db ? 1 : -1; // most recent day first
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const dayMap = new Map<string, DayBookDay>();
    let grandReceipts = 0;
    let grandPayments = 0;
    for (const e of allEntries) {
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
          transactionCount: allEntries.length,
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
      branchId: req.user?.branchId ?? req.branchFilter?.[0] ?? req.body.branchId,
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
    if (entry.status !== 'APPROVED')
      throw new AppError('Expense must be APPROVED before payment', 400);

    const {
      paidFrom,
      paymentMode,
      paymentDate,
      referenceNo,
      chequeNumber,
      chequeBankName,
      chequeDueDate,
    } = req.body as {
      paidFrom?: string;
      paymentMode?: string;
      paymentDate?: string;
      referenceNo?: string;
      chequeNumber?: string;
      chequeBankName?: string;
      chequeDueDate?: string;
    };

    const isCheque = (paymentMode ?? '').trim().toLowerCase() === 'cheque';

    entry.status = 'PAID';
    entry.paidFrom = paidFrom ?? entry.paidFrom;
    entry.paymentMode = paymentMode ?? entry.paymentMode;
    entry.paymentDate = paymentDate ? new Date(paymentDate) : (entry.paymentDate ?? new Date());
    entry.referenceNo = isCheque
      ? (chequeNumber ?? referenceNo ?? entry.referenceNo)
      : (referenceNo ?? entry.referenceNo);
    const saved = await repo.save(entry);

    if (isCheque) {
      // Cheque: create PENDING ISSUED cheque record. No cashbook entry until Finance marks it CLEARED.
      if (chequeNumber && chequeDueDate) {
        try {
          const chequeRepo = Source.getRepository(Cheque);
          const existingCheque = await chequeRepo.findOne({
            where: { chequeNo: chequeNumber, branchId: entry.branchId },
          });
          if (!existingCheque) {
            const c = chequeRepo.create({
              chequeNo: chequeNumber,
              bankName: chequeBankName || undefined,
              partyName: entry.description?.slice(0, 100) || entry.category,
              amount: Number(entry.netAmount),
              dueDate: new Date(chequeDueDate),
              issueDate: saved.paymentDate ?? new Date(),
              type: 'ISSUED',
              status: 'PENDING',
              description: `Expense: ${entry.expenseNo} — ${entry.description?.slice(0, 200) || entry.category}`,
              branchId: entry.branchId,
              sourceType: 'EXPENSE',
              sourceReferenceId: entry.id,
              sourceLabel: `Expense ${entry.expenseNo}`,
              createdBy: req.user?.userId ?? 'SYSTEM',
            });
            await chequeRepo.save(c);
          }
        } catch (err) {
          logger.error('[payExpenseEntry] Failed to create ISSUED cheque record', err);
        }
      }
    } else {
      // Direct balance deduction — generate cashbook ref BEFORE transaction (poolSize=1 safety)
      const cbYear = new Date().getFullYear();
      const cbCount = await Source.getRepository(CashbookEntry)
        .createQueryBuilder('c')
        .where(`EXTRACT(YEAR FROM c."createdAt") = :year`, { year: cbYear })
        .getCount();
      const cbRefNo = `CBK-${cbYear}-${String(cbCount + 1).padStart(5, '0')}`;

      await Source.transaction(async (manager) => {
        if (saved.paidFrom) {
          const accountRepo = manager.getRepository(CashBankAccount);
          const account = await accountRepo.findOne({ where: { id: saved.paidFrom } });
          if (account) {
            account.currentBalance = Number(account.currentBalance) - Number(saved.netAmount);
            await manager.save(CashBankAccount, account);
          } else {
            logger.warn(
              `[payExpenseEntry] Account ${saved.paidFrom} not found — balance not deducted`,
            );
          }
        }
        const cbEntry = manager.create(CashbookEntry, {
          referenceNo: cbRefNo,
          date: saved.paymentDate ?? saved.date,
          accountId: saved.paidFrom ?? undefined,
          entryType: 'PAYMENT' as const,
          amount: Number(saved.netAmount),
          category: saved.category,
          description: saved.description ?? undefined,
          linkedExpenseId: saved.id,
          paymentMode: saved.paymentMode ?? undefined,
          notes: saved.notes ?? undefined,
          sourceType: 'EXPENSE',
          sourceId: saved.id,
          createdBy: req.user?.userId ?? 'SYSTEM',
          branchId: saved.branchId,
        });
        await manager.save(CashbookEntry, cbEntry);
      });
    }
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
    if (entry.status === 'PAID') throw new AppError('Cannot approve a paid expense', 400);
    if (entry.status === 'APPROVED') throw new AppError('Expense is already approved', 400);
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
    const entry = await repo.findOne({ where: { id } });
    if (!entry) throw new AppError('Expense not found', 404);
    if (entry.status === 'PAID')
      throw new AppError('Cannot delete a paid expense — reverse the payment first', 400);
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
    const { brandId, status } = req.query;
    const qb = repo.createQueryBuilder('a');
    applyBranchQB(qb as never, 'a', req.branchFilter ?? []);
    if (brandId) qb.andWhere('a.brandId = :brandId', { brandId });
    if (status) qb.andWhere('a.status = :status', { status });
    qb.orderBy('a.purchaseDate', 'DESC');
    const assets = await qb.getMany();

    const withDepreciation = assets.map((a) => {
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

    // Enrich printer assets with product details (serial number, brand name, model name)
    const productIds = withDepreciation
      .filter((a) => a.productId)
      .map((a) => a.productId as string);

    interface ProductBatchItem {
      id: string;
      serial_no: string;
      product_status: string;
      brand: string;
      brand_name?: string;
      model_name?: string;
      purchase_price?: number;
    }

    const productMap: Record<string, ProductBatchItem> = {};

    if (productIds.length > 0) {
      const invUrl = process.env.INVENTORY_SERVICE_URL ?? 'http://localhost:3003';
      const result = await internalFetchJSON<{ data: ProductBatchItem[] }>(
        `${invUrl}/products/batch`,
        { method: 'POST', body: JSON.stringify({ productIds }) },
      );
      if (result?.data) {
        for (const p of result.data) {
          productMap[p.id] = p;
        }
      }
    }

    const enriched = withDepreciation.map((a) => {
      const product = a.productId ? productMap[a.productId] : null;
      return {
        ...a,
        // Product details for printer assets — shown in assets table
        serial_no: product?.serial_no ?? null,
        product_status: product?.product_status ?? null,
        brand_name: product?.brand_name ?? product?.brand ?? null,
        model_name: product?.model_name ?? null,
        product_purchase_price: product?.purchase_price ?? null,
      };
    });

    res.json({ success: true, data: enriched });
  } catch (err) {
    next(err);
  }
};

export const addAssetToRegister = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = Source.getRepository(AssetDepreciationRegister);

    const {
      productId,
      assetType = 'PRINTER_PRODUCT',
      assetCategory = 'PRINTER_EQUIPMENT',
      assetName,
      brandId,
      modelId,
      purchaseDate,
      purchasePrice,
      annualDepreciationPct,
      usefulLifeMonths,
      salvageValuePct,
      method,
      notes,
    } = req.body;

    if (!purchaseDate) throw new AppError('Purchase date is required', 400);
    if (!purchasePrice || Number(purchasePrice) <= 0)
      throw new AppError('Purchase price must be greater than 0', 400);
    if (!usefulLifeMonths || Number(usefulLifeMonths) <= 0)
      throw new AppError('Useful life is required', 400);

    // For printer products, check for duplicate
    if (assetType === 'PRINTER_PRODUCT' && productId) {
      const existing = await repo.findOne({ where: { productId: productId as string } });
      if (existing) throw new AppError('Product already registered for depreciation', 400);
    }

    const salvageValue = (Number(purchasePrice) * Number(salvageValuePct || 10)) / 100;

    const asset = repo.create({
      productId: productId || null,
      assetType,
      assetCategory,
      assetName: assetName || null,
      brandId: brandId || 'MANUAL',
      modelId: modelId || 'MANUAL',
      branchId: req.user?.branchId ?? req.branchFilter?.[0] ?? req.body.branchId,
      purchaseDate,
      purchasePrice: Number(purchasePrice),
      annualDepreciationPct: Number(annualDepreciationPct || 20),
      usefulLifeMonths: Number(usefulLifeMonths),
      salvageValuePct: Number(salvageValuePct || 10),
      salvageValue,
      method: method || 'STRAIGHT_LINE',
      status: 'ACTIVE',
      notes: notes || null,
      createdBy: req.user?.userId ?? req.body.createdBy,
    }) as unknown as AssetDepreciationRegister;

    const saved = await repo.save(asset);
    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    console.error('[addAssetToRegister]', (err as Error).message);
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
    const qb = repo
      .createQueryBuilder('j')
      .orderBy('j.periodYear', 'DESC')
      .addOrderBy('j.periodMonth', 'DESC');
    applyBranchQB(qb as never, 'j', req.branchFilter ?? []);
    const journals = await qb.getMany();
    res.json({ success: true, data: journals });
  } catch (err) {
    next(err);
  }
};

export const postDepreciationJournal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { periodYear, periodMonth, branchId } = req.body as {
      periodYear: number;
      periodMonth: number;
      branchId: string;
    };

    let saved!: DepreciationJournalEntry;
    await Source.transaction(async (em) => {
      const journalRepo = em.getRepository(DepreciationJournalEntry);
      const expenseRepo = em.getRepository(ExpenseEntry);
      const assetRepo = em.getRepository(AssetDepreciationRegister);

      // Pessimistic lock prevents concurrent double-posts for the same period.
      const existing = await journalRepo
        .createQueryBuilder('j')
        .where(
          'j.periodYear = :periodYear AND j.periodMonth = :periodMonth AND j.branchId = :branchId',
          {
            periodYear,
            periodMonth,
            branchId,
          },
        )
        .setLock('pessimistic_write')
        .getOne();
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
      saved = await journalRepo.save(journal);
    });

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
      branchId: req.user?.branchId ?? req.branchFilter?.[0] ?? req.body.branchId,
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
      branchId: req.user?.branchId ?? req.branchFilter?.[0] ?? req.body.branchId,
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
    let paymentId: string | undefined;
    await Source.transaction(async (em) => {
      const payableRepo = em.getRepository(ManualPayable);
      const paymentRepo = em.getRepository(PayablePayment);

      const payment = paymentRepo.create({
        ...req.body,
        payableId: payable.id,
        createdBy: req.user?.userId ?? req.body.createdBy,
      }) as unknown as PayablePayment;
      const savedPayment = await paymentRepo.save(payment);
      paymentId = savedPayment.id;

      payable.amountPaid = Number(payable.amountPaid) + Number(req.body.amount);
      payable.outstanding = Number(payable.amount) - Number(payable.amountPaid);
      if (payable.outstanding <= 0) payable.status = 'PAID';
      else if (Number(payable.amountPaid) > 0) payable.status = 'PARTIAL';
      saved = await payableRepo.save(payable);
    });

    // Post cashbook entry + deduct account balance (pool size 1 — must be outside the transaction above)
    if (req.body.paidFromAccount && paymentId) {
      try {
        await postCashbookEntry({
          date: req.body.paymentDate ?? new Date(),
          entryType: 'PAYMENT',
          amount: Number(req.body.amount),
          category: 'Payable Payment',
          branchId: payable.branchId,
          createdBy: req.user?.userId ?? 'SYSTEM',
          paymentMode: req.body.paymentMode,
          accountId: req.body.paidFromAccount,
          description: `Payable: ${payable.payableTo} — ${payable.type}`,
          notes: req.body.notes,
          sourceType: 'MANUAL_PAYABLE',
          sourceId: paymentId,
        });
      } catch (err) {
        logger.warn('[recordPayablePayment] Failed to post cashbook entry (non-fatal)', err);
      }
    }

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

    const jwtBranchId = req.user?.branchId ?? req.branchFilter?.[0] ?? req.body.branchId;
    let savedEntry!: EquityEntry;
    await Source.transaction(async (em) => {
      const txRepo = em.getRepository(EquityEntry);
      const txCashRepo = em.getRepository(CashBankAccount);
      const txCbRepo = em.getRepository(CashbookEntry);

      const entry = txRepo.create({
        ...req.body,
        branchId: jwtBranchId,
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
            branchId: jwtBranchId,
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
    const { year } = req.query;
    const targetYear = year ? String(year) : String(new Date().getFullYear());
    const prevYear = String(Number(targetYear) - 1);
    const qb = repo.createQueryBuilder('e');
    applyBranchQB(qb as never, 'e', req.branchFilter ?? []);
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
    const INV_URL = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3003';

    // Per-branch base currency; fall back to AED for multi-branch / admin views
    let baseCurrency = 'AED';
    if (branchF.length === 1) {
      const { getBranchCurrencyInfo } = await import('../services/billingHelpers');
      const info = await getBranchCurrencyInfo(branchF[0]);
      baseCurrency = info?.currencyCode ?? 'AED';
    }

    const bs = await computeBalanceSheet(
      Source,
      branchF,
      todayInBusinessTz(),
      baseCurrency,
      INV_URL,
    );

    res.json({
      success: true,
      data: {
        assets: {
          cash: +bs.cashInHand.toFixed(2),
          bank: +bs.cashAtBank.toFixed(2),
          cashAndBank: +(bs.cashInHand + bs.cashAtBank).toFixed(2),
          fixedAssetsGross: +bs.equipmentGrossCost.toFixed(2),
          accumulatedDepreciation: +bs.accumulatedDepreciation.toFixed(2),
          fixedAssetsNet: +bs.equipmentNBV.toFixed(2),
          invoiceAR: +bs.invoiceAR.toFixed(2),
          manualAR: +bs.manualAR.toFixed(2),
          accountsReceivable: +bs.accountsReceivable.toFixed(2),
          securityDepositsReceivable: +bs.securityDepositsReceivable.toFixed(2),
          sparePartsInventory: +bs.sparePartsInventory.toFixed(2),
          inventoryUnavailable: bs.inventoryUnavailable,
          total: +bs.totalAssets.toFixed(2),
        },
        liabilities: {
          accountsPayable: +bs.accountsPayable.toFixed(2),
          accruedExpenses: +bs.accruedExpenses.toFixed(2),
          vatPayable: +bs.vatPayable.toFixed(2),
          securityDepositsReceived: +bs.securityDepositsReceived.toFixed(2),
          total: +bs.totalLiabilities.toFixed(2),
        },
        equity: {
          ownerCapital: +bs.ownerCapital.toFixed(2),
          retainedEarnings: +bs.retainedEarnings.toFixed(2),
          reserves: +bs.reserves.toFixed(2),
          dividends: +bs.dividends.toFixed(2),
          total: +bs.totalEquity.toFixed(2),
        },
        totalAssets: +bs.totalAssets.toFixed(2),
        totalLiabilities: +bs.totalLiabilities.toFixed(2),
        totalEquity: +bs.totalEquity.toFixed(2),
        totalLiabilitiesAndEquity: +bs.totalLiabilitiesAndEquity.toFixed(2),
        difference: +bs.difference.toFixed(2),
        isBalanced: bs.isBalanced,
        currency: baseCurrency,
        currencyWarnings: bs.currencyWarnings,
        dataWarnings: bs.dataWarnings,
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
    const qb = repo.createQueryBuilder('e');
    applyBranchQB(qb as never, 'e', req.branchFilter ?? []);
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
    const qb = repo.createQueryBuilder('r');
    applyBranchQB(qb as never, 'r', req.branchFilter ?? []);
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
    const qb = repo.createQueryBuilder('p');
    applyBranchQB(qb as never, 'p', req.branchFilter ?? []);
    const rows = await qb.getMany();

    const typeMap: Record<string, number> = {};
    const vendorMap: Record<string, number> = {};
    // monthlyData stores { payable: total_amount_owed, paid: amount_paid } per month
    const monthlyData: Record<string, { payable: number; paid: number }> = {};

    for (const p of rows) {
      typeMap[p.type] = (typeMap[p.type] ?? 0) + Number(p.amount);
      vendorMap[p.payableTo] = (vendorMap[p.payableTo] ?? 0) + Number(p.amount);
      const month = String(p.issueDate).slice(0, 7);
      if (!month || month === 'undefined') continue;
      if (!monthlyData[month]) monthlyData[month] = { payable: 0, paid: 0 };
      // Use total amount incurred (not just paid) so chart shows data even with no payments
      monthlyData[month].payable += Number(p.amount) || 0;
      monthlyData[month].paid += Number(p.amountPaid ?? 0) || 0;
    }

    // Also pull purchase orders from inventory service to include in monthly chart
    try {
      const INV_URL = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3003';
      const purchaseRes = await fetch(`${INV_URL}/purchases`);
      if (purchaseRes.ok) {
        const purchaseJson = (await purchaseRes.json()) as {
          success: boolean;
          data: Array<{
            id: string;
            totalAmount: number;
            paidAmount?: number;
            createdAt: string;
            vendor?: { name: string };
            purchaseOrigin?: string;
          }>;
        };
        const purchases = purchaseJson?.data ?? [];
        for (const p of purchases) {
          const month = String(p.createdAt).slice(0, 7);
          if (!month || month === 'undefined') continue;
          if (!monthlyData[month]) monthlyData[month] = { payable: 0, paid: 0 };
          monthlyData[month].payable += Number(p.totalAmount) || 0;
          monthlyData[month].paid += Number(p.paidAmount ?? 0) || 0;

          // Also add to vendor map
          const vendor = p.vendor?.name ?? 'Unknown Vendor';
          vendorMap[vendor] = (vendorMap[vendor] ?? 0) + Number(p.totalAmount);

          // Purchases are VENDOR_INVOICE type
          typeMap['VENDOR_INVOICE'] = (typeMap['VENDOR_INVOICE'] ?? 0) + Number(p.totalAmount);
        }
      }
    } catch {
      // If inventory service is unavailable, proceed with manual payables only
    }

    const byType = Object.entries(typeMap).map(([name, value]) => ({ name, value }));
    const topVendors = Object.entries(vendorMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));
    const monthly = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, v]) => ({ month, payable: v.payable, paid: v.paid, amount: v.payable }));

    res.json({ success: true, data: { byType, topVendors, monthly, monthlyPayments: monthly } });
  } catch (err) {
    next(err);
  }
};

export const getDepreciationCharts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const assetRepo3 = Source.getRepository(AssetDepreciationRegister);
    const qb = assetRepo3.createQueryBuilder('a');
    applyBranchQB(qb as never, 'a', req.branchFilter ?? []);
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
    const qb = repo.createQueryBuilder('e');
    applyBranchQB(qb as never, 'e', req.branchFilter ?? []);
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
    const INV_URL = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3003';

    let dateFrom: string, dateTo: string;
    if (fromDate && toDate) {
      dateFrom = fromDate as string;
      dateTo = toDate as string;
    } else {
      const range = getPeriodRange(period as string);
      dateFrom = range.fromDate;
      dateTo = range.toDate;
    }

    // Determine base currency: prefer the most-used invoice currency in this period
    // (avoids silently dropping all revenue when the branch currency ≠ invoice currency
    // and no exchange rate is configured). Falls back to branch currency, then 'AED'.
    let baseCurrency = 'AED';
    if (branchF.length === 1) {
      const { getBranchCurrencyInfo } = await import('../services/billingHelpers');
      const info = await getBranchCurrencyInfo(branchF[0]);
      baseCurrency = info?.currencyCode ?? 'AED';
    }
    // Override with the dominant invoice currency so revenue is never zeroed by missing FX rates
    const dominantCcyRow = await Source.query<{ currency_code: string; cnt: string }[]>(`
      SELECT COALESCE("currency_code", 'AED') AS currency_code, COUNT(*) AS cnt
      FROM invoices
      WHERE "deletedAt" IS NULL
        AND status NOT IN ('DRAFT','CANCELLED','EXPIRED','RETAKEN','SUPERSEDED')
        AND (type = 'FINAL' OR (type = 'PROFORMA' AND status IN ('ACTIVE_CONTRACT','INVOICED','PAID')))
        AND CAST("createdAt" AS DATE) BETWEEN '${dateFrom}' AND '${dateTo}'
      GROUP BY "currency_code"
      ORDER BY cnt DESC
      LIMIT 1
    `);
    if (dominantCcyRow[0]?.currency_code) {
      baseCurrency = dominantCcyRow[0].currency_code;
    }

    const pl = await computeProfitAndLoss(Source, branchF, dateFrom, dateTo, baseCurrency, INV_URL);

    // Count invoices in period (all non-draft/cancelled types that generate revenue)
    const invRepo = Source.getRepository(Invoice);
    const invCountQb = invRepo
      .createQueryBuilder('i')
      .select('COUNT(i.id)', 'cnt')
      .where(`CAST(i."createdAt" AS DATE) BETWEEN :from AND :to`, { from: dateFrom, to: dateTo })
      .andWhere(`i.status NOT IN ('DRAFT','CANCELLED','EXPIRED','RETAKEN','SUPERSEDED')`)
      .andWhere(
        `(i.type = 'FINAL' OR (i.type = 'PROFORMA' AND i.status IN ('ACTIVE_CONTRACT', 'INVOICED', 'PAID')))`,
      )
      .andWhere('i."deletedAt" IS NULL');
    applyBranchQB(invCountQb as never, 'i', branchF);
    const invCountRow = await invCountQb.getRawOne<{ cnt: string }>();
    const invoiceCount = Number(invCountRow?.cnt ?? 0);

    // Count expense entries in period
    const expRepo = Source.getRepository(ExpenseEntry);
    const expCountQb = expRepo
      .createQueryBuilder('e')
      .select('COUNT(e.id)', 'cnt')
      .where(`e.date BETWEEN :from AND :to`, { from: dateFrom, to: dateTo })
      .andWhere(`e.status IN ('APPROVED','PAID')`);
    applyBranchQB(expCountQb as never, 'e', branchF);
    const expCountRow = await expCountQb.getRawOne<{ cnt: string }>();
    const expenseCount = Number(expCountRow?.cnt ?? 0);

    // Total tax collected from invoices in period — apply SAME branch filter as revenue
    const taxQb = invRepo
      .createQueryBuilder('i')
      .select(`COALESCE(SUM(i.tax_amount), 0)`, 'total')
      .where(`CAST(i."createdAt" AS DATE) BETWEEN :from AND :to`, { from: dateFrom, to: dateTo })
      .andWhere(`i.status NOT IN ('DRAFT','CANCELLED','EXPIRED','RETAKEN','SUPERSEDED')`)
      .andWhere(
        `(i.type = 'FINAL' OR (i.type = 'PROFORMA' AND i.status IN ('ACTIVE_CONTRACT', 'INVOICED', 'PAID')))`,
      )
      .andWhere('i."deletedAt" IS NULL');
    applyBranchQB(taxQb as never, 'i', branchF);
    const taxRow = await taxQb.getRawOne<{ total: string }>();
    const totalTax = Number(taxRow?.total ?? 0);

    // All revenue lines — always include all types for display; non-zero filtered on frontend
    const revenueByType: Record<string, number> = {
      RENT: pl.rentalRevenue,
      LEASE: pl.leaseRevenue,
      SALE: pl.salesRevenue, // SALE + PRODUCT_SALE combined
      SERVICE: pl.serviceRevenue,
      AMC_SMA: pl.amcSmaRevenue,
      SPAREPART_SALE: pl.sparePartSalesRevenue,
      USAGE: pl.usageRevenue,
    };

    // Only include expense lines that are non-zero
    const allExpByCategory: Record<string, number> = {
      SPARE_PARTS: pl.costOfParts,
      LABOUR: pl.labourCost,
      DEPRECIATION: pl.depreciationExpense,
      VENDOR_PURCHASE: pl.vendorPurchases,
      SHIPPING_HANDLING: pl.shippingHandling,
      SALARY: pl.salaryExpense,
      TRAVEL: pl.travelExpense,
      RENT: pl.rentExpense,
      UTILITIES: pl.utilitiesExpense,
      MARKETING: pl.marketingExpense,
      MAINTENANCE: pl.maintenanceExpense,
      INSURANCE: pl.insuranceExpense,
      OTHER: pl.otherExpenses,
    };
    const expByCategory = Object.fromEntries(
      Object.entries(allExpByCategory).filter(([, v]) => v !== 0),
    );

    const margin = pl.totalRevenue > 0 ? +((pl.netProfit / pl.totalRevenue) * 100).toFixed(2) : 0;

    res.json({
      success: true,
      data: {
        fromDate: dateFrom,
        toDate: dateTo,
        totalRevenue: +pl.totalRevenue.toFixed(2),
        totalExpenses: +pl.totalExpenses.toFixed(2),
        netProfit: +pl.netProfit.toFixed(2),
        grossProfit: +pl.grossProfit.toFixed(2),
        margin,
        totalTax: +totalTax.toFixed(2),
        totalIncome: +pl.totalRevenue.toFixed(2),
        invoiceCount,
        expenseCount,
        revenueByType,
        expByCategory,
        currency: baseCurrency,
        currencyWarnings: pl.currencyWarnings,
        dataWarnings: pl.dataWarnings,
        monthly: [],
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
    const INV_URL = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3003';

    let dateFrom: string, dateTo: string;
    if (fd && td) {
      dateFrom = fd as string;
      dateTo = td as string;
    } else {
      const r = getPeriodRange(period as string);
      dateFrom = r.fromDate;
      dateTo = r.toDate;
    }

    // Consolidated always reports in AED
    const pl = await computeProfitAndLoss(Source, bFilter, dateFrom, dateTo, 'AED', INV_URL);

    const margin = pl.totalRevenue > 0 ? +((pl.netProfit / pl.totalRevenue) * 100).toFixed(2) : 0;

    res.json({
      success: true,
      data: {
        fromDate: dateFrom,
        toDate: dateTo,
        totalIncome: +pl.totalRevenue.toFixed(2),
        totalRevenue: +pl.totalRevenue.toFixed(2),
        totalExpenses: +pl.totalExpenses.toFixed(2),
        netProfit: +pl.netProfit.toFixed(2),
        grossProfit: +pl.grossProfit.toFixed(2),
        margin,
        currency: 'AED',
        currencyWarnings: pl.currencyWarnings,
        dataWarnings: pl.dataWarnings,
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
    const INV_URL = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3003';

    // Consolidated always reports in AED
    const bs = await computeBalanceSheet(Source, bFilter, todayInBusinessTz(), 'AED', INV_URL);

    res.json({
      success: true,
      data: {
        assets: {
          cashAndBank: +(bs.cashInHand + bs.cashAtBank).toFixed(2),
          accountsReceivable: +bs.accountsReceivable.toFixed(2),
          sparePartsInventory: +bs.sparePartsInventory.toFixed(2),
          fixedAssets: +bs.equipmentNBV.toFixed(2),
          total: +bs.totalAssets.toFixed(2),
        },
        liabilities: {
          payables: +bs.accountsPayable.toFixed(2),
          accruedExpenses: +bs.accruedExpenses.toFixed(2),
          vatPayable: +bs.vatPayable.toFixed(2),
          total: +bs.totalLiabilities.toFixed(2),
        },
        equity: {
          ownerCapital: +bs.ownerCapital.toFixed(2),
          retainedEarnings: +bs.retainedEarnings.toFixed(2),
          total: +bs.totalEquity.toFixed(2),
        },
        totalAssets: +bs.totalAssets.toFixed(2),
        totalLiabilities: +bs.totalLiabilities.toFixed(2),
        totalEquity: +bs.totalEquity.toFixed(2),
        isBalanced: bs.isBalanced,
        currency: 'AED',
        currencyWarnings: bs.currencyWarnings,
        dataWarnings: bs.dataWarnings,
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
          date: date || todayInBusinessTz(),
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
            throw new AppError(
              `Insufficient cash in "${cashAcc.name}" (available: ${cashAcc.currency} ${Number(cashAcc.currentBalance).toFixed(2)}). ` +
                `Either add cash to that account first, or leave the "From Cash Account" field empty to record the bank deposit without a cash deduction.`,
              400,
            );
          await entryRepo.save(
            entryRepo.create({
              referenceNo: genRef('PAY'),
              date: date || todayInBusinessTz(),
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
          date: date || todayInBusinessTz(),
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
              date: date || todayInBusinessTz(),
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
      const transferDate = date || todayInBusinessTz();
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
    const bf = req.branchFilter ?? [];
    if (bf.length > 0 && !bf.includes(account.branchId))
      throw new AppError('Account not found', 404);

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
    const bf = req.branchFilter ?? [];
    if (bf.length > 0 && !bf.includes(account.branchId))
      throw new AppError('Account not found', 404);

    const bookBalance = Number(account.currentBalance);
    const stmtBal = Number(statementBalance);
    const difference = bookBalance - stmtBal; // signed: positive = book > statement
    const isBalanced = Math.abs(difference) < 0.01;

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

// ─── CHART OF ACCOUNTS ────────────────────────────────────────────────────────

function makeAccountBalance(
  code: string,
  name: string,
  balance: number,
  currency = 'AED',
): { code: string; name: string; balance: number; currency: string; lastUpdated: string } {
  return {
    code,
    name,
    balance: +Number(balance).toFixed(2),
    currency,
    lastUpdated: new Date().toISOString(),
  };
}

export const getChartOfAccounts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchF = req.branchFilter ?? [];
    const today = todayInBusinessTz();
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    const rawFrom = req.query.periodFrom as string | undefined;
    const rawTo = req.query.periodTo as string | undefined;
    const periodFrom =
      rawFrom && dateRe.test(rawFrom) ? rawFrom : `${nowInBusinessTz().year}-01-01`;
    const periodTo = rawTo && dateRe.test(rawTo) ? rawTo : today;
    const INV_URL = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3003';

    let currency = 'AED';
    if (branchF.length === 1) {
      const { getBranchCurrencyInfo } = await import('../services/billingHelpers');
      const info = await getBranchCurrencyInfo(branchF[0]);
      currency = info?.currencyCode ?? 'AED';
    }

    // Override with dominant invoice currency for the period so that missing FX rates
    // don't silently zero out all revenue (mirrors logic in getProfitLoss).
    const uuidReCoA = /^[0-9a-f-]{36}$/i;
    const safeBranchesCoA = branchF.filter((b) => uuidReCoA.test(b));
    const bSqlCoA =
      safeBranchesCoA.length === 1
        ? `AND "branchId" = '${safeBranchesCoA[0]}'`
        : safeBranchesCoA.length > 1
          ? `AND "branchId" IN (${safeBranchesCoA.map((b) => `'${b}'`).join(',')})`
          : '';
    const dominantCcyRow = await Source.query<{ currency_code: string; cnt: string }[]>(`
      SELECT COALESCE("currency_code", 'AED') AS currency_code, COUNT(*) AS cnt
      FROM invoices
      WHERE "deletedAt" IS NULL
        AND status NOT IN ('DRAFT','CANCELLED','EXPIRED','RETAKEN','SUPERSEDED')
        AND (type = 'FINAL' OR (type = 'PROFORMA' AND status IN ('ACTIVE_CONTRACT','INVOICED','PAID')))
        AND CAST("createdAt" AS DATE) BETWEEN '${periodFrom}' AND '${periodTo}'
        ${bSqlCoA}
      GROUP BY "currency_code"
      ORDER BY cnt DESC
      LIMIT 1
    `);
    if (dominantCcyRow[0]?.currency_code) {
      currency = dominantCcyRow[0].currency_code;
    }

    const [pl, bs] = await Promise.all([
      computeProfitAndLoss(Source, branchF, periodFrom, periodTo, currency, INV_URL),
      computeBalanceSheet(Source, branchF, today, currency, INV_URL),
    ]);

    const {
      cashInHand,
      cashAtBank,
      accountsReceivable,
      securityDepositsReceivable,
      prepaidExpenses,
      sparePartsInventory,
      productInventory,
      inventoryUnavailable,
      equipmentGrossCost,
      accumulatedDepreciation,
      equipmentNBV,
      accountsPayable,
      accruedExpenses,
      vatPayable,
      securityDepositsReceived,
      deferredRevenue,
      salaryPayable,
      ownerCapital,
      retainedEarnings,
      reserves,
      withdrawals,
      dividends,
      totalAssets,
      totalLiabilities,
      totalEquity,
      totalLiabilitiesAndEquity,
      isBalanced,
      difference,
      currencyWarnings: bsCurrencyWarnings,
      dataWarnings: bsDataWarnings,
    } = bs;

    const {
      rentalRevenue,
      leaseRevenue,
      salesRevenue,
      serviceRevenue,
      amcSmaRevenue,
      usageRevenue,
      sparePartSalesRevenue,
      costOfParts,
      labourCost,
      depreciationExpense,
      vendorPurchases,
      shippingHandling,
      salaryExpense,
      travelExpense,
      rentExpense,
      utilitiesExpense,
      marketingExpense,
      maintenanceExpense,
      insuranceExpense,
      otherExpenses,
      totalExpenses,
      grossProfit,
      netProfit,
      currencyWarnings: plCurrencyWarnings,
      dataWarnings: plDataWarnings,
    } = pl;

    const totalCurrentAssets =
      cashInHand +
      cashAtBank +
      accountsReceivable +
      securityDepositsReceivable +
      prepaidExpenses +
      sparePartsInventory +
      productInventory;
    const totalNonCurrentAssets = equipmentNBV;
    const totalCurrentLiabilities =
      accountsPayable +
      accruedExpenses +
      vatPayable +
      securityDepositsReceived +
      deferredRevenue +
      salaryPayable;
    const totalIncome =
      rentalRevenue +
      leaseRevenue +
      salesRevenue +
      serviceRevenue +
      amcSmaRevenue +
      usageRevenue +
      sparePartSalesRevenue;

    const allWarnings = [
      ...bsCurrencyWarnings,
      ...bsDataWarnings,
      ...plCurrencyWarnings,
      ...plDataWarnings,
    ];
    if (inventoryUnavailable) {
      allWarnings.push(
        'Spare parts inventory value unavailable — Inventory service did not respond',
      );
    }

    res.json({
      success: true,
      data: {
        asOfDate: today,
        periodFrom,
        periodTo,
        branchIds: branchF,
        currency,
        warnings: allWarnings,

        assets: {
          currentAssets: {
            cashInHand: makeAccountBalance('1001', 'Cash in Hand', cashInHand, currency),
            cashAtBank: makeAccountBalance('1002', 'Cash at Bank', cashAtBank, currency),
            accountsReceivable: makeAccountBalance(
              '1003',
              'Accounts Receivable',
              accountsReceivable,
              currency,
            ),
            securityDepositsReceivable: makeAccountBalance(
              '1004',
              'Security Deposits Receivable',
              securityDepositsReceivable,
              currency,
            ),
            prepaidExpenses: makeAccountBalance(
              '1005',
              'Prepaid Expenses',
              prepaidExpenses,
              currency,
            ),
            sparePartsInventory: makeAccountBalance(
              '1006',
              'Spare Parts Inventory',
              sparePartsInventory,
              currency,
            ),
            productInventory: makeAccountBalance(
              '1009',
              'Product Inventory',
              productInventory,
              currency,
            ),
            totalCurrentAssets: +totalCurrentAssets.toFixed(2),
          },
          nonCurrentAssets: {
            equipmentGrossCost: makeAccountBalance(
              '1007',
              'Equipment Gross Cost',
              equipmentGrossCost,
              currency,
            ),
            accumulatedDepreciation: makeAccountBalance(
              '1008',
              'Accumulated Depreciation',
              accumulatedDepreciation,
              currency,
            ),
            equipmentNBV: +equipmentNBV.toFixed(2),
            totalNonCurrentAssets: +totalNonCurrentAssets.toFixed(2),
          },
          totalAssets: +totalAssets.toFixed(2),
        },

        liabilities: {
          currentLiabilities: {
            accountsPayable: makeAccountBalance(
              '2001',
              'Accounts Payable',
              accountsPayable,
              currency,
            ),
            accruedExpenses: makeAccountBalance(
              '2002',
              'Accrued Expenses',
              accruedExpenses,
              currency,
            ),
            vatPayable: makeAccountBalance('2003', 'VAT Payable', vatPayable, currency),
            securityDepositsReceived: makeAccountBalance(
              '2004',
              'Security Deposits Received',
              securityDepositsReceived,
              currency,
            ),
            deferredRevenue: makeAccountBalance(
              '2005',
              'Deferred Revenue',
              deferredRevenue,
              currency,
            ),
            salaryPayable: makeAccountBalance('2006', 'Salary Payable', salaryPayable, currency),
            totalCurrentLiabilities: +totalCurrentLiabilities.toFixed(2),
          },
          nonCurrentLiabilities: { totalNonCurrentLiabilities: 0 },
          totalLiabilities: +totalLiabilities.toFixed(2),
        },

        equity: {
          ownerCapital: makeAccountBalance('3001', "Owner's Capital", ownerCapital, currency),
          retainedEarnings: makeAccountBalance(
            '3002',
            'Retained Earnings',
            retainedEarnings,
            currency,
          ),
          reserves: makeAccountBalance('3003', 'Reserves', reserves, currency),
          lessWithdrawals: makeAccountBalance('3004', 'Less: Withdrawals', withdrawals, currency),
          lessDividends: makeAccountBalance('3005', 'Less: Dividends', dividends, currency),
          totalEquity: +totalEquity.toFixed(2),
        },

        income: {
          rentalRevenue: makeAccountBalance('4001', 'Rental Revenue', rentalRevenue, currency),
          leaseRevenue: makeAccountBalance('4002', 'Lease Revenue', leaseRevenue, currency),
          salesRevenue: makeAccountBalance('4003', 'Sales Revenue', salesRevenue, currency),
          serviceRevenue: makeAccountBalance('4004', 'Service Revenue', serviceRevenue, currency),
          usageRevenue: makeAccountBalance('4005', 'Usage / Copy Revenue', usageRevenue, currency),
          amcSmaRevenue: makeAccountBalance('4006', 'AMC / SMA Revenue', amcSmaRevenue, currency),
          sparePartSales: makeAccountBalance(
            '4007',
            'Spare Part Sales',
            sparePartSalesRevenue,
            currency,
          ),
          totalIncome: +totalIncome.toFixed(2),
        },

        expenses: {
          costOfParts: makeAccountBalance('5001', 'Cost of Parts', costOfParts, currency),
          labourCost: makeAccountBalance('5002', 'Labour Cost', labourCost, currency),
          depreciation: makeAccountBalance(
            '5003',
            'Depreciation Expense',
            depreciationExpense,
            currency,
          ),
          vendorPurchases: makeAccountBalance(
            '5004',
            'Vendor Purchases',
            vendorPurchases,
            currency,
          ),
          shippingHandling: makeAccountBalance(
            '5005',
            'Shipping & Handling',
            shippingHandling,
            currency,
          ),
          salaryExpense: makeAccountBalance('5006', 'Salary Expense', salaryExpense, currency),
          travelExpense: makeAccountBalance('5007', 'Travel Expense', travelExpense, currency),
          rentExpense: makeAccountBalance('5008', 'Rent Expense', rentExpense, currency),
          utilitiesExpense: makeAccountBalance(
            '5009',
            'Utilities Expense',
            utilitiesExpense,
            currency,
          ),
          marketingExpense: makeAccountBalance(
            '5010',
            'Marketing Expense',
            marketingExpense,
            currency,
          ),
          maintenanceExpense: makeAccountBalance(
            '5011',
            'Maintenance Expense',
            maintenanceExpense,
            currency,
          ),
          insuranceExpense: makeAccountBalance(
            '5012',
            'Insurance Expense',
            insuranceExpense,
            currency,
          ),
          otherExpenses: makeAccountBalance('5013', 'Other Expenses', otherExpenses, currency),
          totalExpenses: +totalExpenses.toFixed(2),
        },

        summary: {
          grossProfit: +grossProfit.toFixed(2),
          netProfit: +netProfit.toFixed(2),
          accountingEquation: {
            totalAssets: +totalAssets.toFixed(2),
            totalLiabilitiesPlusEquity: +totalLiabilitiesAndEquity.toFixed(2),
            isBalanced,
            difference: +difference.toFixed(2),
          },
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── VAT REMITTANCES ──────────────────────────────────────────────────────────

export const getVatRemittances = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchF = req.branchFilter ?? [];
    const repo = Source.getRepository(VatRemittance);
    const qb = repo.createQueryBuilder('v').orderBy('v.remittedDate', 'DESC');
    if (branchF.length > 0) {
      if (branchF.length === 1) qb.where('v.branchId = :bid', { bid: branchF[0] });
      else qb.where('v.branchId IN (:...bids)', { bids: branchF });
    }
    const data = await qb.getMany();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const createVatRemittance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchId = req.user?.branchId;
    if (!branchId) throw new AppError('Branch ID required', 400);
    const { periodFrom, periodTo, amountRemitted, remittedDate, referenceNo, notes } = req.body;
    if (!periodFrom || !periodTo || !amountRemitted || !remittedDate) {
      throw new AppError('periodFrom, periodTo, amountRemitted, remittedDate are required', 400);
    }
    const repo = Source.getRepository(VatRemittance);
    const entry = repo.create({
      branchId,
      periodFrom: new Date(periodFrom),
      periodTo: new Date(periodTo),
      amountRemitted: Number(amountRemitted),
      remittedDate: new Date(remittedDate),
      referenceNo,
      notes,
      createdBy: req.user!.userId,
    });
    const saved = await repo.save(entry);
    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
};

export const deleteVatRemittance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const branchF = req.branchFilter ?? [];
    const repo = Source.getRepository(VatRemittance);
    const entry = await repo.findOne({ where: { id } });
    if (!entry) throw new AppError('VAT remittance not found', 404);
    if (branchF.length > 0 && !branchF.includes(entry.branchId)) {
      throw new AppError('Not authorized for this branch', 403);
    }
    await repo.remove(entry);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// ─── OUTPUT TAX REPORT ────────────────────────────────────────────────────────

const OUTPUT_TAX_STATUSES = ['INVOICED', 'PAID', 'ACTIVE_CONTRACT'];

export const getOutputTax = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      dateFrom,
      dateTo,
      country,
      stateProvince,
      city,
      page = '1',
      limit = '50',
    } = req.query as Record<string, string>;
    const branchFilter: string[] = req.branchFilter ?? [];

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));

    const qb = Source.getRepository(Invoice)
      .createQueryBuilder('i')
      .where('i.status IN (:...statuses)', { statuses: OUTPUT_TAX_STATUSES })
      .andWhere('i.isTemplate = false')
      .andWhere('i.isOpeningEntry = false')
      .andWhere('i.deletedAt IS NULL');

    if (branchFilter.length === 1) {
      qb.andWhere('i.branchId = :bf', { bf: branchFilter[0] });
    } else if (branchFilter.length > 1) {
      qb.andWhere('i.branchId IN (:...bf)', { bf: branchFilter });
    }

    if (dateFrom) qb.andWhere('i.createdAt >= :dateFrom', { dateFrom });
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      qb.andWhere('i.createdAt <= :dateTo', { dateTo: end });
    }
    if (country) qb.andWhere('i.customerCountry = :country', { country });
    if (stateProvince) qb.andWhere('i.customerStateProvince = :stateProvince', { stateProvince });
    if (city) qb.andWhere('i.customerCity = :city', { city });

    const [total, invoices] = await Promise.all([
      qb.getCount(),
      qb
        .orderBy('i.createdAt', 'DESC')
        .skip((pageNum - 1) * limitNum)
        .take(limitNum)
        .getMany(),
    ]);

    const rows = invoices.map((inv) => ({
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.effectiveFrom ?? inv.createdAt,
      branchId: inv.branchId,
      customerId: inv.customerId,
      customerName: inv.customerName ?? null,
      customerVatNumber: inv.customerVatNumber ?? null,
      customerCountry: inv.customerCountry ?? null,
      customerStateProvince: inv.customerStateProvince ?? null,
      customerCity: inv.customerCity ?? null,
      taxableAmount: Number(inv.totalAmount ?? 0),
      taxPercent: inv.taxPercent,
      taxName: inv.taxName,
      outputVat: Number(inv.taxAmount ?? 0),
      totalInvoice: Number(inv.totalAmount ?? 0) + Number(inv.taxAmount ?? 0),
      currencyCode: inv.currencyCode,
      status: inv.status,
    }));

    // Enrich rows where customer snapshot is missing by fetching from CRM service
    const CRM_URL = process.env.CRM_SERVICE_URL ?? 'http://localhost:3005';
    const missingIds = [
      ...new Set(
        rows
          .filter((r) => r.customerId && (!r.customerName || !r.customerCountry))
          .map((r) => r.customerId as string),
      ),
    ];
    const customerCache: Record<
      string,
      {
        name: string | null;
        vatNumber: string | null;
        country: string | null;
        stateProvince: string | null;
        city: string | null;
      }
    > = {};
    if (missingIds.length > 0) {
      await Promise.allSettled(
        missingIds.map(async (id) => {
          const resp = await internalFetchJSON<{
            data: {
              name: string;
              vatNumber?: string | null;
              country?: string | null;
              stateProvince?: string | null;
              city?: string | null;
            };
          }>(`${CRM_URL}/customers/${id}`);
          if (resp?.data) {
            customerCache[id] = {
              name: resp.data.name ?? null,
              vatNumber: resp.data.vatNumber ?? null,
              country: resp.data.country ?? null,
              stateProvince: resp.data.stateProvince ?? null,
              city: resp.data.city ?? null,
            };
          }
        }),
      );
    }
    const enrichedRows = rows.map((r) => {
      const c = r.customerId ? customerCache[r.customerId] : undefined;
      if (!c) return r;
      return {
        ...r,
        customerName: r.customerName ?? c.name,
        customerVatNumber: r.customerVatNumber ?? c.vatNumber,
        customerCountry: r.customerCountry ?? c.country,
        customerStateProvince: r.customerStateProvince ?? c.stateProvince,
        customerCity: r.customerCity ?? c.city,
      };
    });

    // Country / state breakdown aggregate (full result set, not paginated)
    const bfParams: (string | string[] | Date | string[])[] = [];
    let pi = 1;
    const bfClause =
      branchFilter.length === 1
        ? `AND "branchId" = $${pi++}` + (bfParams.push(branchFilter[0]) && '')
        : branchFilter.length > 1
          ? `AND "branchId" = ANY($${pi++}::text[])` + (bfParams.push(branchFilter) && '')
          : '';
    const dfClause = dateFrom
      ? `AND "createdAt" >= $${pi++}` + (bfParams.push(dateFrom) && '')
      : '';
    const dtClause = dateTo
      ? (() => {
          const end = new Date(dateTo);
          end.setHours(23, 59, 59, 999);
          const clause = `AND "createdAt" <= $${pi++}`;
          bfParams.push(end as unknown as string);
          return clause;
        })()
      : '';
    const cClause = country
      ? `AND "customer_country" = $${pi++}` + (bfParams.push(country) && '')
      : '';
    const spClause = stateProvince
      ? `AND "customer_state_province" = $${pi++}` + (bfParams.push(stateProvince) && '')
      : '';
    const cityClause = city ? `AND "customer_city" = $${pi++}` + (bfParams.push(city) && '') : '';

    const breakdownRaw = await Source.query<
      {
        country: string;
        state: string;
        city: string;
        invoice_count: string;
        taxable_amount: string;
        output_vat: string;
      }[]
    >(
      `
      SELECT
        COALESCE("customer_country", 'Unknown') AS country,
        COALESCE("customer_state_province", 'Unknown') AS state,
        COALESCE("customer_city", '') AS city,
        COUNT(*) AS invoice_count,
        COALESCE(SUM("totalAmount"), 0) AS taxable_amount,
        COALESCE(SUM("tax_amount"), 0) AS output_vat
      FROM invoices
      WHERE status IN ('INVOICED', 'PAID', 'ACTIVE_CONTRACT')
        AND "isTemplate" = false
        AND "is_opening_entry" = false
        AND "deletedAt" IS NULL
        ${bfClause} ${dfClause} ${dtClause} ${cClause} ${spClause} ${cityClause}
      GROUP BY COALESCE("customer_country", 'Unknown'), COALESCE("customer_state_province", 'Unknown'), COALESCE("customer_city", '')
      ORDER BY output_vat DESC
    `,
      bfParams,
    );

    // Collapse state rows under each country
    const cMap: Record<
      string,
      {
        count: number;
        taxableAmount: number;
        outputVat: number;
        states: { state: string; count: number; outputVat: number }[];
      }
    > = {};
    for (const row of breakdownRaw) {
      if (!cMap[row.country])
        cMap[row.country] = { count: 0, taxableAmount: 0, outputVat: 0, states: [] };
      cMap[row.country].count += Number(row.invoice_count);
      cMap[row.country].taxableAmount += Number(row.taxable_amount);
      cMap[row.country].outputVat += Number(row.output_vat);
      cMap[row.country].states.push({
        state: row.state,
        count: Number(row.invoice_count),
        outputVat: +Number(row.output_vat).toFixed(2),
      });
    }
    const countryBreakdown = Object.entries(cMap)
      .map(([c, d]) => ({
        country: c,
        count: d.count,
        taxableAmount: +d.taxableAmount.toFixed(2),
        outputVat: +d.outputVat.toFixed(2),
        states: d.states.sort((a, b) => b.outputVat - a.outputVat),
      }))
      .sort((a, b) => b.outputVat - a.outputVat);

    const totalTaxableAmount = enrichedRows.reduce((s, r) => s + r.taxableAmount, 0);
    const totalOutputVat = enrichedRows.reduce((s, r) => s + r.outputVat, 0);

    res.json({
      success: true,
      data: {
        rows: enrichedRows,
        totals: { totalTaxableAmount, totalOutputVat, count: total },
        pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
        countryBreakdown,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── COUNTRY TAX RULES ────────────────────────────────────────────────────────

export const getCountryTaxRules = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rules = await Source.getRepository(CountryTaxRule).find({ order: { country: 'ASC' } });
    res.json({ success: true, data: rules });
  } catch (err) {
    next(err);
  }
};

export const upsertCountryTaxRule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { country, taxName, defaultTaxPercent, isActive } = req.body;
    if (!country || !taxName) {
      return next(new AppError('country and taxName are required', 400));
    }
    const repo = Source.getRepository(CountryTaxRule);
    let rule = await repo.findOne({ where: { country: country.toUpperCase() } });
    if (rule) {
      rule.taxName = taxName;
      rule.defaultTaxPercent = defaultTaxPercent ?? rule.defaultTaxPercent;
      rule.isActive = isActive !== undefined ? isActive : rule.isActive;
    } else {
      rule = repo.create({
        country: country.toUpperCase(),
        taxName,
        defaultTaxPercent: defaultTaxPercent ?? null,
        isActive: isActive !== false,
      });
    }
    await repo.save(rule);
    res.json({ success: true, data: rule });
  } catch (err) {
    next(err);
  }
};

export const deleteCountryTaxRule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as { id: string };
    const repo = Source.getRepository(CountryTaxRule);
    const rule = await repo.findOne({ where: { id } });
    if (!rule) return next(new AppError('Country tax rule not found', 404));
    await repo.remove(rule);
    res.json({ success: true, message: 'Country tax rule deleted' });
  } catch (err) {
    next(err);
  }
};

// ─── TAX DOCUMENT EMAIL ───────────────────────────────────────────────────────

export const sendTaxDocumentEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { recipient, subject, body, attachments, branchId } = req.body;
    if (!recipient) return next(new AppError('recipient is required', 400));
    const bf = req.branchFilter ?? [];
    if (bf.length > 0 && branchId && !bf.includes(branchId as string)) {
      return next(new AppError('Not authorized to send documents for this branch', 403));
    }

    const { NotificationPublisher } = await import('../events/publisher/notificationPublisher');
    await NotificationPublisher.publishEmailRequest({
      recipient,
      subject: subject ?? 'Tax Document',
      body: body ?? '',
      attachments,
    });

    res.json({ success: true, message: 'Tax document email queued' });
  } catch (err) {
    next(err);
  }
};
