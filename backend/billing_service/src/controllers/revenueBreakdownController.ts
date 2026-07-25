import { Request, Response, NextFunction } from 'express';
import { Source } from '../config/dataSource';
import { AppError } from '../errors/appError';
import {
  computeRevenueBreakdown,
  fetchRevenueRows,
  subCategoryOf,
  type RevenueTopCategory,
} from '../utils/revenueBreakdown';

function currentYearFrom(): string {
  return `${new Date().getFullYear()}-01-01`;
}
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export const getRevenueBreakdown = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchF = req.branchFilter ?? [];
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    const rawFrom = req.query.periodFrom as string | undefined;
    const rawTo = req.query.periodTo as string | undefined;
    const periodFrom = rawFrom && dateRe.test(rawFrom) ? rawFrom : currentYearFrom();
    const periodTo = rawTo && dateRe.test(rawTo) ? rawTo : today();

    let currency = 'AED';
    if (branchF.length === 1) {
      const { getBranchCurrencyInfo } = await import('../services/billingHelpers');
      const info = await getBranchCurrencyInfo(branchF[0]);
      currency = info?.currencyCode ?? 'AED';
    }

    const data = await computeRevenueBreakdown(Source, branchF, periodFrom, periodTo, currency);
    res.json({ success: true, data: { ...data, periodFrom, periodTo, currency } });
  } catch (err) {
    next(err);
  }
};

// category values: PRODUCT_SALE | SPAREPART_SALE | RENT_<planType> | LEASE_EMI | LEASE_FSM_<planType>
function parseCategory(category: string): { top: RevenueTopCategory; sub: string } {
  if (category === 'PRODUCT_SALE' || category === 'SPAREPART_SALE') {
    return { top: 'SALE', sub: category };
  }
  if (category.startsWith('RENT_')) {
    return { top: 'RENT', sub: category.slice('RENT_'.length) };
  }
  if (category === 'LEASE_EMI') {
    return { top: 'LEASE', sub: 'EMI' };
  }
  if (category.startsWith('LEASE_FSM_')) {
    return { top: 'LEASE', sub: `FSM_${category.slice('LEASE_FSM_'.length)}` };
  }
  throw new AppError(`Unknown revenue category: ${category}`, 400);
}

export const getRevenueTransactions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchF = req.branchFilter ?? [];
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    const {
      category,
      periodFrom: rawFrom,
      periodTo: rawTo,
      customerName,
      search,
      amountMin,
      amountMax,
      branchId,
    } = req.query as Record<string, string | undefined>;

    if (!category) throw new AppError('category is required', 400);
    const { top, sub } = parseCategory(category);

    const periodFrom = rawFrom && dateRe.test(rawFrom) ? rawFrom : currentYearFrom();
    const periodTo = rawTo && dateRe.test(rawTo) ? rawTo : today();

    // ADMIN can further narrow to one branch; everyone else stays within their
    // already-resolved branchFilter (parseBranchFilter locks MANAGER/FINANCE to
    // their own branch).
    let effectiveBranchFilter = branchF;
    if (branchId && req.user?.role === 'ADMIN') {
      effectiveBranchFilter = [branchId];
    }

    const rows = await fetchRevenueRows(Source, top, effectiveBranchFilter, periodFrom, periodTo);
    let filtered = rows.filter((r) => subCategoryOf(r) === sub);

    if (customerName) {
      const needle = customerName.toLowerCase();
      filtered = filtered.filter((r) => r.customerName.toLowerCase().includes(needle));
    }
    if (search) {
      const needle = search.toLowerCase();
      filtered = filtered.filter((r) => r.invoiceNumber.toLowerCase().includes(needle));
    }
    if (amountMin) {
      const min = Number(amountMin);
      filtered = filtered.filter((r) => r.amount >= min);
    }
    if (amountMax) {
      const max = Number(amountMax);
      filtered = filtered.filter((r) => r.amount <= max);
    }

    res.json({ success: true, data: filtered });
  } catch (err) {
    next(err);
  }
};
