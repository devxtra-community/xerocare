import { Request, Response, NextFunction } from 'express';
import { Source } from '../config/dataSource';
import { AppError } from '../errors/appError';
import { CashBankAccount } from '../entities/cashBankAccountEntity';
import { ExpenseEntry } from '../entities/expenseEntryEntity';
import { ManualReceivable } from '../entities/manualReceivableEntity';
import { ManualPayable } from '../entities/manualPayableEntity';
import { AssetDepreciationRegister } from '../entities/assetDepreciationRegisterEntity';
import { EquityEntry } from '../entities/equityEntryEntity';
import { ExchangeRate } from '../entities/exchangeRateEntity';
import { calculateDepreciation } from '../utils/depreciation';
import { applyBranchQB } from '../middlewares/branchFilterMiddleware';

// Admin-only guard
function requireAdmin(req: Request) {
  if (req.user?.role !== 'ADMIN') throw new AppError('Admin access required', 403);
}

// ─── EXCHANGE RATES ───────────────────────────────────────────────────────────

export const getExchangeRates = async (req: Request, res: Response, next: NextFunction) => {
  try {
    requireAdmin(req);
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

// Converts amount from one currency to AED using stored rates (default: 1 QAR = 0.99 AED)
async function convertToAED(amount: number, fromCurrency: string): Promise<number> {
  if (fromCurrency === 'AED' || !fromCurrency) return amount;
  const repo = Source.getRepository(ExchangeRate);
  const rate = await repo.findOne({ where: { fromCurrency, toCurrency: 'AED' } });
  const r = rate ? Number(rate.rate) : 0.99;
  return amount * r;
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
    const totalExpenses = expenses.reduce((s, e) => s + Number(e.netAmount ?? 0), 0);

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
      branchMap[r.branchId].receivable += Number(r.amount) - Number(r.amountPaid ?? 0);
    }
    for (const p of payables) {
      if (!branchMap[p.branchId])
        branchMap[p.branchId] = { cash: 0, bank: 0, receivable: 0, payable: 0, expenses: 0 };
      branchMap[p.branchId].payable += Number(p.amount) - Number(p.amountPaid ?? 0);
    }
    for (const e of expenses) {
      if (!branchMap[e.branchId])
        branchMap[e.branchId] = { cash: 0, bank: 0, receivable: 0, payable: 0, expenses: 0 };
      branchMap[e.branchId].expenses += Number(e.netAmount ?? 0);
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
        netProfit: -totalExpenses, // simplified; real P&L needs revenue
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
      branchData[e.branchId].expenses += Number(e.netAmount ?? 0);
    }
    for (const r of receivables) {
      ensureBranch(r.branchId);
      const outstanding = Number(r.amount) - Number(r.amountPaid ?? 0);
      branchData[r.branchId].receivables += outstanding;
      const diffDays = Math.floor((today.getTime() - new Date(r.dueDate).getTime()) / 86400000);
      if (diffDays > 90) branchData[r.branchId].overdueCount++;
    }
    for (const p of payables) {
      ensureBranch(p.branchId);
      branchData[p.branchId].payables += Number(p.amount) - Number(p.amountPaid ?? 0);
    }
    for (const a of accounts) {
      ensureBranch(a.branchId);
      branchData[a.branchId].cash += Number(a.currentBalance);
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
      monthBranchMap[month][e.branchId] =
        (monthBranchMap[month][e.branchId] ?? 0) + Number(e.netAmount ?? 0);
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
      receivablesByBranch[r.branchId] =
        (receivablesByBranch[r.branchId] ?? 0) + (Number(r.amount) - Number(r.amountPaid ?? 0));
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
      cashByBranch[a.branchId] = (cashByBranch[a.branchId] ?? 0) + Number(a.currentBalance);
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

    const expRepo = Source.getRepository(ExpenseEntry);
    const qb = expRepo
      .createQueryBuilder('e')
      .where('e.date >= :fromDate AND e.date <= :toDate', { fromDate, toDate });
    applyBranchQB(qb as never, 'e', bf);
    const expenses = await qb.getMany();

    const catMap: Record<string, number> = {};
    const branchMap: Record<string, number> = {};
    let totalExpenses = 0;

    for (const e of expenses) {
      catMap[e.category] = (catMap[e.category] ?? 0) + Number(e.netAmount ?? 0);
      branchMap[e.branchId] = (branchMap[e.branchId] ?? 0) + Number(e.netAmount ?? 0);
      totalExpenses += Number(e.netAmount ?? 0);
    }

    const byCategory = Object.entries(catMap).map(([category, amount]) => ({ category, amount }));
    const byBranch = Object.entries(branchMap).map(([branchId, amount]) => ({ branchId, amount }));

    res.json({
      success: true,
      data: {
        period: { from: fromDate, to: toDate },
        totalExpenses,
        byCategory,
        byBranch,
        grossProfit: -totalExpenses, // Will be updated once revenue API exists
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

    // Cash
    const cbRepo = Source.getRepository(CashBankAccount);
    const cbQb = cbRepo.createQueryBuilder('a').where('a.isActive = :active', { active: true });
    applyBranchQB(cbQb as never, 'a', bf);
    const accounts = await cbQb.getMany();
    const cashTotal = accounts.reduce((s, a) => s + Number(a.currentBalance), 0);

    // Fixed Assets NBV
    const assetRepo = Source.getRepository(AssetDepreciationRegister);
    const assetQb = assetRepo.createQueryBuilder('a').where('a.status = :s', { s: 'ACTIVE' });
    applyBranchQB(assetQb as never, 'a', bf);
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

    // Receivables
    const rcvRepo = Source.getRepository(ManualReceivable);
    const rcvQb = rcvRepo.createQueryBuilder('r').where('r.status != :s', { s: 'PAID' });
    applyBranchQB(rcvQb as never, 'r', bf);
    const receivables = await rcvQb.getMany();
    const rcvTotal = receivables.reduce(
      (s, r) => s + (Number(r.amount) - Number(r.amountPaid ?? 0)),
      0,
    );

    // Payables
    const payRepo = Source.getRepository(ManualPayable);
    const payQb = payRepo.createQueryBuilder('p').where('p.status != :s', { s: 'PAID' });
    applyBranchQB(payQb as never, 'p', bf);
    const payables = await payQb.getMany();
    const payTotal = payables.reduce(
      (s, p) => s + (Number(p.amount) - Number(p.amountPaid ?? 0)),
      0,
    );

    // Equity
    const eqRepo = Source.getRepository(EquityEntry);
    const eqQb = eqRepo.createQueryBuilder('e');
    applyBranchQB(eqQb as never, 'e', bf);
    const eqEntries = await eqQb.getMany();
    const positive = [
      'SHARE_CAPITAL',
      'RETAINED_EARNINGS',
      'RESERVES',
      'OWNER_CONTRIBUTION',
      'PROFIT_TRANSFER',
    ];
    let netEquity = 0;
    for (const e of eqEntries) {
      netEquity += positive.includes(e.type) ? Number(e.amount) : -Number(e.amount);
    }

    const totalAssets = cashTotal + fixedNBV + rcvTotal;
    const totalLiabilities = payTotal;
    const totalLiabEquity = totalLiabilities + netEquity;
    const difference = Math.abs(totalAssets - totalLiabEquity);

    // Per-branch breakdown
    const branchAssets: Record<string, number> = {};
    for (const a of accounts) {
      branchAssets[a.branchId] = (branchAssets[a.branchId] ?? 0) + Number(a.currentBalance);
    }

    res.json({
      success: true,
      data: {
        assets: {
          cash: cashTotal,
          fixedAssets: fixedNBV,
          receivables: rcvTotal,
          total: totalAssets,
        },
        liabilities: { payables: payTotal, total: totalLiabilities },
        equity: { netEquity, total: netEquity },
        totalLiabilitiesAndEquity: totalLiabEquity,
        difference,
        balanced: difference < 1,
        perBranch: Object.entries(branchAssets).map(([branchId, cash]) => ({ branchId, cash })),
      },
    });
  } catch (err) {
    next(err);
  }
};
