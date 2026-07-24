import { Request, Response, NextFunction } from 'express';
import { Source } from '../config/dataSource';
import { AppError } from '../errors/appError';
import { CashBankAccount } from '../entities/cashBankAccountEntity';
import { ExpenseEntry } from '../entities/expenseEntryEntity';
import { ManualReceivable } from '../entities/manualReceivableEntity';
import { ManualPayable } from '../entities/manualPayableEntity';
import { ExchangeRate } from '../entities/exchangeRateEntity';
import { applyBranchQB } from '../middlewares/branchFilterMiddleware';
import { computeProfitAndLoss, computeBalanceSheet } from '../utils/accountsShared';

// Admin-only guard
function requireAdmin(req: Request) {
  if (req.user?.role !== 'ADMIN') throw new AppError('Admin access required', 403);
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

// Converts amount from one currency to AED using stored rates (returns null when rate is missing).
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

export const getConsolidatedKPIs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    requireAdmin(req);
    const bf = req.branchFilter ?? [];

    // Cash & Bank
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

    // Receivables
    const rcvRepo = Source.getRepository(ManualReceivable);
    const rcvQb = rcvRepo.createQueryBuilder('r').where('r.status != :s', { s: 'PAID' });
    applyBranchQB(rcvQb as never, 'r', bf);
    const receivables = await rcvQb.getMany();
    let totalReceivable = 0,
      overdueReceivables = 0;
    const today = new Date();
    for (const r of receivables) {
      const outstanding = Number(r.amount) - Number(r.amountPaid ?? 0);
      const aed = await convertToAED(outstanding, r.currency);
      totalReceivable += aed;
      const due = new Date(r.dueDate);
      const diffDays = Math.floor((today.getTime() - due.getTime()) / 86400000);
      if (diffDays > 90) overdueReceivables += aed;
    }

    // Payables
    const payRepo = Source.getRepository(ManualPayable);
    const payQb = payRepo.createQueryBuilder('p').where('p.status != :s', { s: 'PAID' });
    applyBranchQB(payQb as never, 'p', bf);
    const payables = await payQb.getMany();
    let totalPayable = 0;
    for (const p of payables) {
      const outstanding = Number(p.amount) - Number(p.amountPaid ?? 0);
      const aed = await convertToAED(outstanding, p.currency);
      totalPayable += aed;
    }

    // Net Profit this month (income - expenses)
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const expRepo = Source.getRepository(ExpenseEntry);
    const expQb = expRepo.createQueryBuilder('e').where('e.date >= :monthStart', { monthStart });
    applyBranchQB(expQb as never, 'e', bf);
    const expenses = await expQb.getMany();

    // Aggregate per branch
    const branchMap: Record<
      string,
      { cash: number; bank: number; receivable: number; payable: number; expenses: number }
    > = {};
    for (const a of accounts) {
      if (!branchMap[a.branchId])
        branchMap[a.branchId] = { cash: 0, bank: 0, receivable: 0, payable: 0, expenses: 0 };
      const aed = await convertToAED(Number(a.currentBalance), a.currency);
      if (a.type === 'CASH') branchMap[a.branchId].cash += aed;
      else branchMap[a.branchId].bank += aed;
    }
    for (const r of receivables) {
      if (!branchMap[r.branchId])
        branchMap[r.branchId] = { cash: 0, bank: 0, receivable: 0, payable: 0, expenses: 0 };
      branchMap[r.branchId].receivable += await convertToAED(
        Number(r.amount) - Number(r.amountPaid ?? 0),
        r.currency ?? 'AED',
      );
    }
    for (const p of payables) {
      if (!branchMap[p.branchId])
        branchMap[p.branchId] = { cash: 0, bank: 0, receivable: 0, payable: 0, expenses: 0 };
      branchMap[p.branchId].payable += await convertToAED(
        Number(p.amount) - Number(p.amountPaid ?? 0),
        p.currency ?? 'AED',
      );
    }
    for (const e of expenses) {
      if (!branchMap[e.branchId])
        branchMap[e.branchId] = { cash: 0, bank: 0, receivable: 0, payable: 0, expenses: 0 };
      branchMap[e.branchId].expenses += await convertToAED(
        Number(e.netAmount ?? 0),
        e.currency ?? 'AED',
      );
    }

    const perBranch = Object.entries(branchMap).map(([branchId, v]) => ({
      branchId,
      ...v,
      total: v.cash + v.bank,
    }));

    res.json({
      success: true,
      data: {
        totalCash,
        totalBank,
        totalReceivable,
        totalPayable,
        netProfit: null, // use /consolidated-pl for full P&L including revenue
        overdueReceivables,
        perBranch,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── BRANCH PERFORMANCE TABLE ─────────────────────────────────────────────────

export const getBranchPerformanceTable = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    requireAdmin(req);
    const bf = req.branchFilter ?? [];
    const { from, to } = req.query;
    const fromDate = (from as string) || `${new Date().getFullYear()}-01-01`;
    const toDate = (to as string) || new Date().toISOString().slice(0, 10);

    // Expenses per branch
    const expRepo = Source.getRepository(ExpenseEntry);
    const expQb = expRepo
      .createQueryBuilder('e')
      .where('e.date >= :fromDate AND e.date <= :toDate', { fromDate, toDate });
    applyBranchQB(expQb as never, 'e', bf);
    const expenses = await expQb.getMany();

    // Receivables per branch
    const rcvRepo = Source.getRepository(ManualReceivable);
    const rcvQb = rcvRepo.createQueryBuilder('r');
    applyBranchQB(rcvQb as never, 'r', bf);
    const receivables = await rcvQb.getMany();

    // Payables per branch
    const payRepo = Source.getRepository(ManualPayable);
    const payQb = payRepo.createQueryBuilder('p');
    applyBranchQB(payQb as never, 'p', bf);
    const payables = await payQb.getMany();

    // Cash per branch
    const cbRepo = Source.getRepository(CashBankAccount);
    const cbQb = cbRepo.createQueryBuilder('a').where('a.isActive = :active', { active: true });
    applyBranchQB(cbQb as never, 'a', bf);
    const accounts = await cbQb.getMany();

    const branchData: Record<
      string,
      {
        revenue: number;
        expenses: number;
        receivables: number;
        payables: number;
        cash: number;
        overdueCount: number;
      }
    > = {};

    const today = new Date();
    const ensureBranch = (id: string) => {
      if (!branchData[id])
        branchData[id] = {
          revenue: 0,
          expenses: 0,
          receivables: 0,
          payables: 0,
          cash: 0,
          overdueCount: 0,
        };
    };

    for (const e of expenses) {
      ensureBranch(e.branchId);
      branchData[e.branchId].expenses += await convertToAED(
        Number(e.netAmount ?? 0),
        e.currency ?? 'AED',
      );
    }
    for (const r of receivables) {
      ensureBranch(r.branchId);
      const outstanding = Number(r.amount) - Number(r.amountPaid ?? 0);
      branchData[r.branchId].receivables += await convertToAED(outstanding, r.currency ?? 'AED');
      const diffDays = Math.floor((today.getTime() - new Date(r.dueDate).getTime()) / 86400000);
      if (diffDays > 90) branchData[r.branchId].overdueCount++;
    }
    for (const p of payables) {
      ensureBranch(p.branchId);
      branchData[p.branchId].payables += await convertToAED(
        Number(p.amount) - Number(p.amountPaid ?? 0),
        p.currency ?? 'AED',
      );
    }
    for (const a of accounts) {
      ensureBranch(a.branchId);
      branchData[a.branchId].cash += await convertToAED(
        Number(a.currentBalance),
        a.currency ?? 'AED',
      );
    }

    const rows = Object.entries(branchData).map(([branchId, d]) => {
      const grossProfit = d.revenue - d.expenses;
      const marginPct = d.revenue > 0 ? Math.round((grossProfit / d.revenue) * 100) : 0;
      let status = 'HEALTHY';
      if (grossProfit < 0 || d.overdueCount > 5) status = 'ALERT';
      else if (marginPct < 10 || d.overdueCount > 2) status = 'WATCH';
      return { branchId, ...d, grossProfit, netProfit: grossProfit, marginPct, status };
    });

    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

// ─── BRANCH COMPARISON CHARTS ─────────────────────────────────────────────────

export const getBranchComparison = async (req: Request, res: Response, next: NextFunction) => {
  try {
    requireAdmin(req);
    const bf = req.branchFilter ?? [];

    // Monthly expenses per branch (last 6 months)
    const expRepo = Source.getRepository(ExpenseEntry);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const fromDate = sixMonthsAgo.toISOString().slice(0, 10);

    const expQb = expRepo.createQueryBuilder('e').where('e.date >= :fromDate', { fromDate });
    applyBranchQB(expQb as never, 'e', bf);
    const expenses = await expQb.getMany();

    // Aggregate: month → branchId → total expenses
    const monthBranchMap: Record<string, Record<string, number>> = {};
    const branches = new Set<string>();
    for (const e of expenses) {
      const month = String(e.date).slice(0, 7);
      if (!monthBranchMap[month]) monthBranchMap[month] = {};
      const aedAmount = await convertToAED(Number(e.netAmount ?? 0), e.currency ?? 'AED');
      monthBranchMap[month][e.branchId] = (monthBranchMap[month][e.branchId] ?? 0) + aedAmount;
      branches.add(e.branchId);
    }

    const expenseByBranch = Object.entries(monthBranchMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, bmap]) => ({ month, ...bmap }));

    // Receivables per branch (current outstanding)
    const rcvRepo = Source.getRepository(ManualReceivable);
    const rcvQb = rcvRepo.createQueryBuilder('r').where('r.status != :s', { s: 'PAID' });
    applyBranchQB(rcvQb as never, 'r', bf);
    const receivables = await rcvQb.getMany();
    const receivablesByBranch: Record<string, number> = {};
    for (const r of receivables) {
      const outstanding = await convertToAED(
        Number(r.amount) - Number(r.amountPaid ?? 0),
        r.currency ?? 'AED',
      );
      receivablesByBranch[r.branchId] = (receivablesByBranch[r.branchId] ?? 0) + outstanding;
    }
    const receivableChart = Object.entries(receivablesByBranch).map(([branchId, value]) => ({
      branchId,
      value,
    }));

    // Cash per branch
    const cbRepo = Source.getRepository(CashBankAccount);
    const cbQb = cbRepo.createQueryBuilder('a').where('a.isActive = :active', { active: true });
    applyBranchQB(cbQb as never, 'a', bf);
    const accounts = await cbQb.getMany();
    const cashByBranch: Record<string, number> = {};
    for (const a of accounts) {
      cashByBranch[a.branchId] =
        (cashByBranch[a.branchId] ?? 0) +
        (await convertToAED(Number(a.currentBalance), a.currency ?? 'AED'));
    }
    const cashChart = Object.entries(cashByBranch)
      .map(([branchId, value]) => ({ branchId, value }))
      .sort((a, b) => b.value - a.value);

    res.json({
      success: true,
      data: {
        expenseByBranch,
        receivableChart,
        cashChart,
        branchIds: [...branches],
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── CONSOLIDATED P&L ─────────────────────────────────────────────────────────

export const getConsolidatedPL = async (req: Request, res: Response, next: NextFunction) => {
  try {
    requireAdmin(req);
    const bf = req.branchFilter ?? [];
    const { from, to } = req.query;
    const fromDate = (from as string) || `${new Date().getFullYear()}-01-01`;
    const toDate = (to as string) || new Date().toISOString().slice(0, 10);
    const INV_URL = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3003';

    const pl = await computeProfitAndLoss(Source, bf, fromDate, toDate, 'AED', INV_URL);

    res.json({
      success: true,
      data: {
        period: { from: fromDate, to: toDate },
        totalRevenue: +pl.totalRevenue.toFixed(2),
        totalExpenses: +pl.totalExpenses.toFixed(2),
        grossProfit: +pl.grossProfit.toFixed(2),
        netProfit: +pl.netProfit.toFixed(2),
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
