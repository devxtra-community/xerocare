import { Request, Response, NextFunction } from 'express';
import { SelectQueryBuilder } from 'typeorm';
import { Source } from '../config/db';
import { Purchase } from '../entities/purchaseEntity';
import { AppError } from '../errors/appError';

// Mirror of billing service branchFilterMiddleware logic for FINANCE/MANAGER/ADMIN roles
function resolveBranchFilter(req: Request): string[] {
  const { role, branchId: jwtBranchId } = req.user!;
  if (role === 'MANAGER' || role === 'FINANCE') {
    return jwtBranchId ? [jwtBranchId] : [];
  }
  if (role === 'ADMIN') {
    const requested = req.query.branchIds as string | undefined;
    if (requested && requested.trim()) {
      return requested
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    if (req.query.branchId) {
      return [(req.query.branchId as string).trim()];
    }
    return []; // empty = all branches
  }
  return [];
}

function applyBranch(qb: SelectQueryBuilder<Purchase>, alias: string, branchFilter: string[]) {
  if (!branchFilter.length) return;
  if (branchFilter.length === 1) {
    qb.andWhere(`${alias}.branchId = :bf`, { bf: branchFilter[0] });
  } else {
    qb.andWhere(`${alias}.branchId IN (:...bf)`, { bf: branchFilter });
  }
}

export async function getInputTaxLocal(req: Request, res: Response, next: NextFunction) {
  try {
    const role = req.user?.role;
    if (!role || !['ADMIN', 'FINANCE', 'MANAGER'].includes(role)) {
      return next(new AppError('Access denied: insufficient role', 403));
    }

    const branchFilter = resolveBranchFilter(req);
    const {
      dateFrom,
      dateTo,
      status,
      country,
      page = '1',
      limit = '50',
    } = req.query as Record<string, string>;

    const repo = Source.getRepository(Purchase);
    const qb = repo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.vendor', 'vendor')
      .leftJoinAndSelect('p.branch', 'branch')
      .where('p.purchaseOrigin = :origin', { origin: 'DOMESTIC' });

    applyBranch(qb, 'p', branchFilter);

    if (dateFrom) qb.andWhere('p.createdAt >= :dateFrom', { dateFrom });
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      qb.andWhere('p.createdAt <= :dateTo', { dateTo: end });
    }
    if (status) qb.andWhere('p.taxStatus = :status', { status });
    if (country) qb.andWhere('p.vendorCountry = :country', { country });

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));

    const total = await qb.getCount();
    const purchases = await qb
      .orderBy('p.createdAt', 'DESC')
      .skip((pageNum - 1) * limitNum)
      .take(limitNum)
      .getMany();

    const rows = purchases.map((p) => ({
      id: p.id,
      invoiceDate: p.createdAt,
      branch: p.branch?.name ?? p.branchId,
      branchId: p.branchId,
      vendorName: p.vendor?.name ?? p.vendorId,
      vendorVatNumber: p.vendorVatNumber,
      vendorCountry: p.vendorCountry,
      purchaseCategory: p.purchaseCategory,
      taxableAmount: p.taxableAmount,
      taxPercent: p.taxPercent,
      taxName: p.taxName,
      inputVatAmount: p.inputVatAmount,
      totalAmount: p.totalAmount,
      currencyCode: p.currencyCode ?? p.branch?.currency_code,
      taxStatus: p.taxStatus,
      vatClaimable: p.vatClaimable,
    }));

    const totalTaxableAmount = purchases.reduce((s, p) => s + Number(p.taxableAmount ?? 0), 0);
    const totalInputVat = purchases.reduce((s, p) => s + Number(p.inputVatAmount ?? 0), 0);

    res.json({
      success: true,
      data: {
        rows,
        totals: { totalTaxableAmount, totalInputVat, count: total },
        pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getInputTaxInternational(req: Request, res: Response, next: NextFunction) {
  try {
    const role = req.user?.role;
    if (!role || !['ADMIN', 'FINANCE', 'MANAGER'].includes(role)) {
      return next(new AppError('Access denied: insufficient role', 403));
    }

    const branchFilter = resolveBranchFilter(req);
    const {
      dateFrom,
      dateTo,
      status,
      country,
      page = '1',
      limit = '50',
    } = req.query as Record<string, string>;

    const repo = Source.getRepository(Purchase);
    const qb = repo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.vendor', 'vendor')
      .leftJoinAndSelect('p.branch', 'branch')
      .where('p.purchaseOrigin = :origin', { origin: 'INTERNATIONAL' });

    applyBranch(qb, 'p', branchFilter);

    if (dateFrom) qb.andWhere('p.createdAt >= :dateFrom', { dateFrom });
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      qb.andWhere('p.createdAt <= :dateTo', { dateTo: end });
    }
    if (status) qb.andWhere('p.taxStatus = :status', { status });
    if (country) qb.andWhere('p.vendorCountry = :country', { country });

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));

    const total = await qb.getCount();
    const purchases = await qb
      .orderBy('p.createdAt', 'DESC')
      .skip((pageNum - 1) * limitNum)
      .take(limitNum)
      .getMany();

    const rows = purchases.map((p) => ({
      id: p.id,
      importInvoiceNo: p.importInvoiceNo,
      invoiceDate: p.createdAt,
      branch: p.branch?.name ?? p.branchId,
      branchId: p.branchId,
      supplierName: p.vendor?.name ?? p.vendorId,
      supplierCountry: p.vendorCountry,
      supplierVatNumber: p.vendorVatNumber,
      importCountry: p.branch?.country_code ?? null,
      goodsOrService: p.goodsOrService,
      taxableAmount: p.taxableAmount,
      importVatReverseCharge: p.reverseChargeVatAmount,
      taxPercent: p.taxPercent,
      customsEntryNo: p.customsEntryNo,
      customsDuty: p.customsDuty,
      currencyCode: p.currencyCode ?? p.branch?.currency_code,
      exchangeRate: p.exchangeRate,
      vatClaimable: p.vatClaimable,
      taxStatus: p.taxStatus,
    }));

    const totalTaxableAmount = purchases.reduce((s, p) => s + Number(p.taxableAmount ?? 0), 0);
    const totalReverseChargeVat = purchases.reduce(
      (s, p) => s + Number(p.reverseChargeVatAmount ?? 0),
      0,
    );

    res.json({
      success: true,
      data: {
        rows,
        totals: { totalTaxableAmount, totalReverseChargeVat, count: total },
        pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function updatePurchaseTaxStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const role = req.user?.role;
    if (!role || !['ADMIN', 'FINANCE'].includes(role)) {
      return next(new AppError('Access denied: FINANCE or ADMIN only', 403));
    }

    const { id } = req.params as { id: string };
    const { taxStatus } = req.body;

    if (!['PENDING', 'RECORDED', 'FILED'].includes(taxStatus)) {
      return next(new AppError('Invalid taxStatus value', 400));
    }

    const branchFilter = resolveBranchFilter(req);
    const repo = Source.getRepository(Purchase);
    const purchase = await repo.findOne({ where: { id } });

    if (!purchase) return next(new AppError('Purchase not found', 404));

    if (branchFilter.length > 0 && !branchFilter.includes(purchase.branchId)) {
      return next(new AppError('Access denied: purchase belongs to another branch', 403));
    }

    purchase.taxStatus = taxStatus;
    await repo.save(purchase);

    res.json({ success: true, data: purchase });
  } catch (err) {
    next(err);
  }
}
