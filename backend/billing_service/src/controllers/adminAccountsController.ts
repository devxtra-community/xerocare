import { Request, Response, NextFunction } from 'express';
import { Source } from '../config/dataSource';
import { AppError } from '../errors/appError';
import { CashBankAccount } from '../entities/cashBankAccountEntity';
import { ExpenseEntry } from '../entities/expenseEntryEntity';
import { Invoice } from '../entities/invoiceEntity';
import { ExchangeRate } from '../entities/exchangeRateEntity';
import { applyBranchQB } from '../middlewares/branchFilterMiddleware';
import { computeProfitAndLoss, computeBalanceSheet } from '../utils/accountsShared';
import { nowInBusinessTz } from '../utils/businessDate';
import { getBranchName } from '../services/billingHelpers';

// Admin-only guard
function requireAdmin(req: Request) {
  if (req.user?.role !== 'ADMIN') throw new AppError('Admin access required', 403);
}

// Period → { fromDate, toDate } — mirrors the same helper in accountsController
function getPeriodDates(period?: string): { fromDate: string; toDate: string } {
  const { year: y, month0: m } = nowInBusinessTz();
  const pad = (n: number) => String(n).padStart(2, '0');
  const lastDayOf = (yr: number, mo1: number) => new Date(yr, mo1, 0).getDate();

  switch (period) {
    case 'this_month': {
      const mo = m + 1;
      return { fromDate: `${y}-${pad(mo)}-01`, toDate: `${y}-${pad(mo)}-${pad(lastDayOf(y, mo))}` };
    }
    case 'last_month': {
      const mo = m === 0 ? 12 : m;
      const yr = m === 0 ? y - 1 : y;
      return {
        fromDate: `${yr}-${pad(mo)}-01`,
        toDate: `${yr}-${pad(mo)}-${pad(lastDayOf(yr, mo))}`,
      };
    }
    case 'this_quarter': {
      const q = Math.floor(m / 3);
      const qStartMo = q * 3 + 1;
      const qEndMo = q * 3 + 3;
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

// ─── EXCHANGE RATES ───────────────────────────────────────────────────────────

// Read-only — any authenticated role may fetch rates (needed for dual-currency
// display on manager pages, e.g. international purchase lists). Setting a rate
// stays admin-only below.
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
    requireAdmin(req);
    const repo = Source.getRepository(ExchangeRate);
    const { fromCurrency, toCurrency, rate } = req.body;
    const existing = await repo.findOne({ where: { fromCurrency, toCurrency } });
    if (existing) {
      existing.rate = rate;
      existing.setBy = req.user!.userId;
      const saved = await repo.save(existing);
      return res.json({ success: true, data: saved });
    }
    const er = repo.create({
      fromCurrency,
      toCurrency,
      rate,
      setBy: req.user!.userId,
    }) as unknown as ExchangeRate;
    const saved = await repo.save(er);
    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
};

// Converts amount to AED using stored exchange rates. Returns 0 when rate is missing.
async function convertToAED(amount: number, fromCurrency: string): Promise<number> {
  if (fromCurrency === 'AED' || !fromCurrency) return amount;
  const repo = Source.getRepository(ExchangeRate);
  const rate = await repo.findOne({ where: { fromCurrency, toCurrency: 'AED' } });
  if (!rate) {
    console.warn(`[Admin] No exchange rate found for ${fromCurrency}→AED — excluding from totals`);
    return 0;
  }
  return amount * Number(rate.rate);
}

// ─── CONSOLIDATED KPIs ────────────────────────────────────────────────────────
// Cash/bank: from CashBankAccount.currentBalance (live balances).
// AR: from invoice outstanding (FINAL/PROFORMA/OPENING, non-cancelled).
// AP: from ManualPayable outstanding.
// Net profit: from computeProfitAndLoss (same as Finance P&L page).

export const getConsolidatedKPIs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    requireAdmin(req);
    const bf = req.branchFilter ?? [];
    const INV_URL = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3003';
    const { period } = req.query;
    const { fromDate, toDate } = getPeriodDates(period as string | undefined);

    const uuidRe = /^[0-9a-f-]{36}$/i;
    const safeBranches = bf.filter((b) => uuidRe.test(b));
    const bParam = safeBranches.length > 0 ? safeBranches : null;

    // Build branch SQL snippet for raw queries
    const bWhereInvoice = bParam
      ? `AND "branchId" IN (${bParam.map((_, i) => `$${i + 1}`).join(',')})`
      : '';

    // 1. Cash & Bank from account balances
    const cbRepo = Source.getRepository(CashBankAccount);
    const cbQb = cbRepo.createQueryBuilder('a').where('a.isActive = :active', { active: true });
    applyBranchQB(cbQb as never, 'a', bf);
    const accounts = await cbQb.getMany();
    let totalCash = 0,
      totalBank = 0;
    for (const a of accounts) {
      const aed = await convertToAED(Number(a.currentBalance), a.currency);
      if (a.type === 'CASH') totalCash += aed;
      else totalBank += aed;
    }

    // 2. Invoice-based AR: outstanding balance across FINAL/PROFORMA/OPENING invoices
    const arRows = await Source.query<{ outstanding: string }[]>(
      `SELECT COALESCE(SUM(
         "totalAmount" - COALESCE(
           (SELECT SUM(pt.amount) FROM payment_transactions pt WHERE pt."invoice_id" = i.id), 0
         )
       ), 0) AS outstanding
       FROM invoices i
       WHERE i.status NOT IN ('DRAFT','CANCELLED')
         AND i.type IN ('FINAL','PROFORMA','OPENING')
         ${bWhereInvoice}`,
      bParam ?? [],
    );
    const totalReceivable = Number(arRows[0]?.outstanding ?? 0);

    // 3. Overdue 90+ days (invoices created > 90 days ago, still unpaid)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const odDate = ninetyDaysAgo.toISOString().slice(0, 10);
    const odRows = await Source.query<{ overdue: string }[]>(
      `SELECT COALESCE(SUM(
         "totalAmount" - COALESCE(
           (SELECT SUM(pt.amount) FROM payment_transactions pt WHERE pt."invoice_id" = i.id), 0
         )
       ), 0) AS overdue
       FROM invoices i
       WHERE i.status NOT IN ('DRAFT','CANCELLED','PAID')
         AND i.type IN ('FINAL','PROFORMA','OPENING')
         AND CAST(i."createdAt" AS DATE) <= '${odDate}'
         ${bWhereInvoice}`,
      bParam ?? [],
    );
    const overdueReceivables = Number(odRows[0]?.overdue ?? 0);

    // 4. Payables from ManualPayable (vendor payables tracked here)
    const { ManualPayable } = await import('../entities/manualPayableEntity');
    const payRepo = Source.getRepository(ManualPayable);
    const payQb = payRepo.createQueryBuilder('p').where('p.status != :s', { s: 'PAID' });
    applyBranchQB(payQb as never, 'p', bf);
    const payables = await payQb.getMany();
    let totalPayable = 0;
    for (const p of payables) {
      const outstanding = Number(p.amount) - Number(p.amountPaid ?? 0);
      totalPayable += await convertToAED(outstanding, p.currency ?? 'AED');
    }

    // 5. Net profit via computeProfitAndLoss (same as Finance P&L page)
    const pl = await computeProfitAndLoss(Source, bf, fromDate, toDate, 'AED', INV_URL).catch(
      (err) => {
        console.error('[AdminKPIs] computeProfitAndLoss failed:', err);
        return null;
      },
    );

    // Per-branch cash summary
    const branchSet = new Set(accounts.map((a) => a.branchId));
    const perBranch = Array.from(branchSet).map((bid) => {
      const ba = accounts.filter((a) => a.branchId === bid);
      return {
        branchId: bid,
        cash: ba.filter((a) => a.type === 'CASH').reduce((s, a) => s + Number(a.currentBalance), 0),
        bank: ba.filter((a) => a.type === 'BANK').reduce((s, a) => s + Number(a.currentBalance), 0),
        total: ba.reduce((s, a) => s + Number(a.currentBalance), 0),
      };
    });

    const dataWarnings: string[] = pl?.dataWarnings ?? [];
    if (!pl) dataWarnings.push('P&L data unavailable — net profit figure may be zero');

    res.json({
      success: true,
      data: {
        totalCash: +totalCash.toFixed(2),
        totalBank: +totalBank.toFixed(2),
        totalReceivable: +totalReceivable.toFixed(2),
        totalPayable: +totalPayable.toFixed(2),
        netProfit: pl ? +pl.netProfit.toFixed(2) : 0,
        overdueReceivables: +overdueReceivables.toFixed(2),
        perBranch,
        dataWarnings,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── BRANCH PERFORMANCE TABLE ─────────────────────────────────────────────────
// Revenue from non-cancelled invoices. Expenses from approved/paid expense entries.
// Receivables and payables from invoice-based AR/AP (balance sheet figures used as proxy).

export const getBranchPerformanceTable = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    requireAdmin(req);
    const bf = req.branchFilter ?? [];
    const { period } = req.query;
    const { fromDate, toDate } = getPeriodDates(period as string | undefined);

    // Invoice revenue per branch
    const invRepo = Source.getRepository(Invoice);
    const invQb = invRepo
      .createQueryBuilder('i')
      .where('CAST(i.createdAt AS DATE) >= :fromDate', { fromDate })
      .andWhere('CAST(i.createdAt AS DATE) <= :toDate', { toDate })
      .andWhere('i.status NOT IN (:...excl)', { excl: ['DRAFT', 'CANCELLED'] })
      .andWhere('i.type NOT IN (:...texcl)', { texcl: ['OPENING'] });
    applyBranchQB(invQb as never, 'i', bf);
    const invoices = await invQb.getMany();

    // Expenses per branch
    const expRepo = Source.getRepository(ExpenseEntry);
    const expQb = expRepo
      .createQueryBuilder('e')
      .where('e.date >= :fromDate AND e.date <= :toDate', { fromDate, toDate })
      .andWhere('e.status IN (:...statuses)', { statuses: ['APPROVED', 'PAID'] });
    applyBranchQB(expQb as never, 'e', bf);
    const expenses = await expQb.getMany();

    // Cash accounts per branch (point-in-time balance)
    const cbRepo = Source.getRepository(CashBankAccount);
    const cbQb = cbRepo.createQueryBuilder('a').where('a.isActive = :active', { active: true });
    applyBranchQB(cbQb as never, 'a', bf);
    const accounts = await cbQb.getMany();

    const branchData: Record<
      string,
      { revenue: number; expenses: number; cash: number; overdueCount: number }
    > = {};

    const ensureBranch = (id: string) => {
      if (!branchData[id]) branchData[id] = { revenue: 0, expenses: 0, cash: 0, overdueCount: 0 };
    };

    for (const i of invoices) {
      ensureBranch(i.branchId);
      branchData[i.branchId].revenue += Number(i.totalAmount) - Number(i.taxAmount ?? 0);
    }
    for (const e of expenses) {
      ensureBranch(e.branchId);
      branchData[e.branchId].expenses += Number(e.amount ?? e.netAmount ?? 0);
    }
    for (const a of accounts) {
      ensureBranch(a.branchId);
      branchData[a.branchId].cash += Number(a.currentBalance);
    }

    const rows = Object.entries(branchData).map(([branchId, d]) => {
      const netProfit = d.revenue - d.expenses;
      const marginPct = d.revenue > 0 ? Math.round((netProfit / d.revenue) * 100) : 0;
      const status: 'HEALTHY' | 'WATCH' | 'ALERT' =
        netProfit < 0 ? 'ALERT' : marginPct >= 20 ? 'HEALTHY' : marginPct >= 5 ? 'WATCH' : 'ALERT';
      return {
        branchId,
        revenue: d.revenue,
        expenses: d.expenses,
        grossProfit: netProfit,
        netProfit,
        marginPct,
        receivables: 0,
        payables: 0,
        cash: d.cash,
        overdueCount: 0,
        status,
      };
    });

    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

// ─── BRANCH COMPARISON CHARTS ─────────────────────────────────────────────────
// Returns { name, revenue, expenses, net }[] per branch — the shape the
// Admin Overview page's SimpleBarChart components expect.

export const getBranchComparison = async (req: Request, res: Response, next: NextFunction) => {
  try {
    requireAdmin(req);
    const bf = req.branchFilter ?? [];
    const { period } = req.query;
    const { fromDate, toDate } = getPeriodDates(period as string | undefined);

    // Revenue per branch from non-draft/cancelled invoices
    const invRepo = Source.getRepository(Invoice);
    const invQb = invRepo
      .createQueryBuilder('i')
      .where('CAST(i.createdAt AS DATE) >= :fromDate', { fromDate })
      .andWhere('CAST(i.createdAt AS DATE) <= :toDate', { toDate })
      .andWhere('i.status NOT IN (:...excl)', { excl: ['DRAFT', 'CANCELLED'] })
      .andWhere('i.type NOT IN (:...texcl)', { texcl: ['OPENING'] });
    applyBranchQB(invQb as never, 'i', bf);
    const invoices = await invQb.getMany();

    // Expenses per branch
    const expRepo = Source.getRepository(ExpenseEntry);
    const expQb = expRepo
      .createQueryBuilder('e')
      .where('e.date >= :fromDate AND e.date <= :toDate', { fromDate, toDate })
      .andWhere('e.status IN (:...statuses)', { statuses: ['APPROVED', 'PAID'] });
    applyBranchQB(expQb as never, 'e', bf);
    const expenses = await expQb.getMany();

    const byBranch: Record<string, { revenue: number; expenses: number }> = {};
    const ensure = (id: string) => {
      if (!byBranch[id]) byBranch[id] = { revenue: 0, expenses: 0 };
    };
    for (const i of invoices) {
      ensure(i.branchId);
      byBranch[i.branchId].revenue += Number(i.totalAmount) - Number(i.taxAmount ?? 0);
    }
    for (const e of expenses) {
      ensure(e.branchId);
      byBranch[e.branchId].expenses += Number(e.amount ?? e.netAmount ?? 0);
    }

    // Resolve once per distinct branch (parallelized), not per row — billing_service
    // has no branches table of its own, so this is a cross-service call to
    // ven_inv_service; getBranchName's 5-minute cache keeps repeat calls cheap.
    const distinctBranchIds = Object.keys(byBranch);
    const resolvedNames = await Promise.all(distinctBranchIds.map((id) => getBranchName(id)));
    const nameByBranchId: Record<string, string> = {};
    distinctBranchIds.forEach((id, i) => {
      nameByBranchId[id] = resolvedNames[i] || 'Unknown Branch';
    });

    const data = Object.entries(byBranch).map(([branchId, d]) => ({
      name: nameByBranchId[branchId],
      branchId,
      revenue: +d.revenue.toFixed(2),
      expenses: +d.expenses.toFixed(2),
      net: +(d.revenue - d.expenses).toFixed(2),
    }));

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ─── CONSOLIDATED P&L ─────────────────────────────────────────────────────────
// Uses computeProfitAndLoss (shared with Finance P&L page) and adds a monthly
// revenue-vs-expenses breakdown for the Admin Overview chart.

export const getConsolidatedPL = async (req: Request, res: Response, next: NextFunction) => {
  try {
    requireAdmin(req);
    const bf = req.branchFilter ?? [];
    const { period } = req.query;
    const { fromDate, toDate } = getPeriodDates(period as string | undefined);
    const INV_URL = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3003';

    const pl = await computeProfitAndLoss(Source, bf, fromDate, toDate, 'AED', INV_URL);

    // Monthly breakdown for the revenue-vs-expenses bar chart.
    // Use Source.query() with correct DB column names (tax_amount is snake_case due to
    // @Column({ name: 'tax_amount' }); all others retain camelCase from entity definition).
    const uuidRe = /^[0-9a-f-]{36}$/i;
    const safeBranches = (bf ?? []).filter((b) => uuidRe.test(b));
    const bParam = safeBranches.length > 0 ? safeBranches : null;
    const bWhereInv = bParam
      ? `AND "branchId" IN (${bParam.map((_, i) => `$${i + 3}`).join(',')})`
      : '';
    const bWhereExp = bParam
      ? `AND "branchId" IN (${bParam.map((_, i) => `$${i + 3}`).join(',')})`
      : '';

    const [monthlyRevRaw, monthlyExpRaw] = await Promise.all([
      Source.query<{ month: string; income: string }[]>(
        `SELECT TO_CHAR("createdAt", 'YYYY-MM') AS month,
                COALESCE(SUM("totalAmount" - COALESCE(tax_amount, 0)), 0) AS income
         FROM invoices
         WHERE CAST("createdAt" AS DATE) >= $1
           AND CAST("createdAt" AS DATE) <= $2
           AND status NOT IN ('DRAFT','CANCELLED')
           AND type NOT IN ('OPENING')
           ${bWhereInv}
         GROUP BY TO_CHAR("createdAt", 'YYYY-MM')
         ORDER BY month`,
        [fromDate, toDate, ...(bParam ?? [])],
      ),
      Source.query<{ month: string; expenses: string }[]>(
        `SELECT TO_CHAR(date, 'YYYY-MM') AS month,
                COALESCE(SUM(amount), 0) AS expenses
         FROM expense_entries
         WHERE date >= $1
           AND date <= $2
           AND status IN ('APPROVED','PAID')
           ${bWhereExp}
         GROUP BY TO_CHAR(date, 'YYYY-MM')
         ORDER BY month`,
        [fromDate, toDate, ...(bParam ?? [])],
      ),
    ]);

    // Merge into a single sorted array
    const monthMap: Record<string, { income: number; expenses: number }> = {};
    for (const r of monthlyRevRaw) {
      if (!monthMap[r.month]) monthMap[r.month] = { income: 0, expenses: 0 };
      monthMap[r.month].income = +Number(r.income).toFixed(2);
    }
    for (const r of monthlyExpRaw) {
      if (!monthMap[r.month]) monthMap[r.month] = { income: 0, expenses: 0 };
      monthMap[r.month].expenses = +Number(r.expenses).toFixed(2);
    }
    const monthly = Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({ month, ...v }));

    res.json({
      success: true,
      data: {
        period: { from: fromDate, to: toDate },
        totalRevenue: +pl.totalRevenue.toFixed(2),
        totalExpenses: +pl.totalExpenses.toFixed(2),
        grossProfit: +pl.grossProfit.toFixed(2),
        netProfit: +pl.netProfit.toFixed(2),
        monthly,
        revenueBreakdown: {
          rentalRevenue: +pl.rentalRevenue.toFixed(2),
          leaseRevenue: +pl.leaseRevenue.toFixed(2),
          salesRevenue: +pl.salesRevenue.toFixed(2),
          serviceRevenue: +pl.serviceRevenue.toFixed(2),
          amcSmaRevenue: +pl.amcSmaRevenue.toFixed(2),
          usageRevenue: +pl.usageRevenue.toFixed(2),
          sparePartSalesRevenue: +pl.sparePartSalesRevenue.toFixed(2),
        },
        expenseBreakdown: {
          costOfParts: +pl.costOfParts.toFixed(2),
          labourCost: +pl.labourCost.toFixed(2),
          depreciationExpense: +pl.depreciationExpense.toFixed(2),
          vendorPurchases: +pl.vendorPurchases.toFixed(2),
          salaryExpense: +pl.salaryExpense.toFixed(2),
          otherExpenses: +pl.otherExpenses.toFixed(2),
        },
        currency: 'AED',
        dataWarnings: pl.dataWarnings,
        currencyWarnings: pl.currencyWarnings,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── CONSOLIDATED BALANCE SHEET ───────────────────────────────────────────────

export const getConsolidatedBalanceSheet = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    requireAdmin(req);
    const bf = req.branchFilter ?? [];
    const INV_URL = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3003';

    const bs = await computeBalanceSheet(
      Source,
      bf,
      new Date().toISOString().slice(0, 10),
      'AED',
      INV_URL,
    );

    res.json({
      success: true,
      data: {
        assets: {
          cash: +(bs.cashInHand + bs.cashAtBank).toFixed(2),
          fixedAssets: +bs.equipmentNBV.toFixed(2),
          receivables: +bs.accountsReceivable.toFixed(2),
          sparePartsInventory: +bs.sparePartsInventory.toFixed(2),
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
          reserves: +bs.reserves.toFixed(2),
          dividends: +bs.dividends.toFixed(2),
          total: +bs.totalEquity.toFixed(2),
        },
        totalLiabilitiesAndEquity: +bs.totalLiabilitiesAndEquity.toFixed(2),
        difference: +bs.difference.toFixed(2),
        balanced: bs.isBalanced,
        currency: 'AED',
        dataWarnings: bs.dataWarnings,
        currencyWarnings: bs.currencyWarnings,
      },
    });
  } catch (err) {
    next(err);
  }
};
