import { Request, Response, NextFunction } from 'express';
import { Source } from '../config/dataSource';
import { AppError } from '../errors/appError';
import {
  computeSegmentedPnl,
  fetchSaleProductRows,
  fetchContractRows,
} from '../utils/segmentedPnl';

function currentYearFrom(): string {
  return `${new Date().getFullYear()}-01-01`;
}
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function resolvePeriod(req: Request): { periodFrom: string; periodTo: string } {
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  const rawFrom = req.query.periodFrom as string | undefined;
  const rawTo = req.query.periodTo as string | undefined;
  return {
    periodFrom: rawFrom && dateRe.test(rawFrom) ? rawFrom : currentYearFrom(),
    periodTo: rawTo && dateRe.test(rawTo) ? rawTo : today(),
  };
}

async function resolveCurrency(branchF: string[]): Promise<string> {
  if (branchF.length === 1) {
    const { getBranchCurrencyInfo } = await import('../services/billingHelpers');
    const info = await getBranchCurrencyInfo(branchF[0]);
    return info?.currencyCode ?? 'AED';
  }
  return 'AED';
}

const INV_URL = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3003';

export const getSegmentedPnl = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchF = req.branchFilter ?? [];
    const { periodFrom, periodTo } = resolvePeriod(req);
    const currency = await resolveCurrency(branchF);

    const result = await computeSegmentedPnl(
      Source,
      branchF,
      periodFrom,
      periodTo,
      currency,
      INV_URL,
    );

    res.json({ success: true, data: { ...result, periodFrom, periodTo } });
  } catch (err) {
    next(err);
  }
};

const SALE_SEGMENTS = new Set(['PRODUCT_SALE', 'SPAREPART_SALE']);

export const getSegmentProductDetail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchF = req.branchFilter ?? [];
    const { periodFrom, periodTo } = resolvePeriod(req);
    const segmentKey = req.query.segmentKey as string | undefined;
    if (!segmentKey || !SALE_SEGMENTS.has(segmentKey)) {
      throw new AppError('segmentKey must be PRODUCT_SALE or SPAREPART_SALE', 400);
    }

    const rows = await fetchSaleProductRows(
      Source,
      INV_URL,
      branchF,
      periodFrom,
      periodTo,
      segmentKey as 'PRODUCT_SALE' | 'SPAREPART_SALE',
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

const RENT_LEASE_SEGMENTS = new Set([
  'FIXED_LIMIT',
  'FIXED_COMBO',
  'FIXED_FLAT',
  'CPC',
  'CPC_COMBO',
  'EMI',
  'FSM_FIXED_LIMIT',
  'FSM_FIXED_COMBO',
  'FSM_FIXED_FLAT',
  'FSM_CPC',
  'FSM_CPC_COMBO',
]);

export const getSegmentContractDetail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchF = req.branchFilter ?? [];
    const { periodFrom, periodTo } = resolvePeriod(req);
    const segmentKey = req.query.segmentKey as string | undefined;
    if (!segmentKey || !RENT_LEASE_SEGMENTS.has(segmentKey)) {
      throw new AppError(`Unknown Rent/Lease segmentKey: ${segmentKey}`, 400);
    }

    const rows = await fetchContractRows(
      Source,
      INV_URL,
      branchF,
      periodFrom,
      periodTo,
      segmentKey,
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};
