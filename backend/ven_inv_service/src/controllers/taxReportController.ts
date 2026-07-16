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
      stateProvince,
      city,
      page = '1',
      limit = '50',
    } = req.query as Record<string, string>;

    const repo = Source.getRepository(Purchase);
    const qb = repo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.vendor', 'vendor')
      .leftJoinAndSelect('p.branch', 'branch')
      .leftJoinAndSelect('p.lot', 'lot')
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
    if (stateProvince) qb.andWhere('p.vendorStateProvince = :stateProvince', { stateProvince });
    if (city) qb.andWhere('p.vendorCity = :city', { city });

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));

    const total = await qb.getCount();
    const purchases = await qb
      .orderBy('p.createdAt', 'DESC')
      .skip((pageNum - 1) * limitNum)
      .take(limitNum)
      .getMany();

    const rows = purchases.map((p) => {
      const taxableAmount =
        p.taxableAmount != null
          ? Number(p.taxableAmount)
          : Number(p.purchaseAmount ?? 0) +
            Number(p.labourCost ?? 0) +
            Number(p.handlingFee ?? 0) +
            Number(p.transportationCost ?? 0) +
            Number(p.shippingCost ?? 0) +
            Number(p.groundfieldCost ?? 0);
      const taxPercent =
        p.taxPercent != null
          ? Number(p.taxPercent)
          : p.branch?.tax_percent != null
            ? Number(p.branch.tax_percent)
            : 5;
      const inputVatAmount =
        p.inputVatAmount != null ? Number(p.inputVatAmount) : taxableAmount * (taxPercent / 100);
      const totalAmount =
        p.totalAmount != null
          ? Number(p.totalAmount)
          : Number(p.purchaseAmount ?? 0) +
            Number(p.documentationFee ?? 0) +
            Number(p.labourCost ?? 0) +
            Number(p.handlingFee ?? 0) +
            Number(p.transportationCost ?? 0) +
            Number(p.shippingCost ?? 0) +
            Number(p.groundfieldCost ?? 0);

      return {
        id: p.id,
        invoiceDate: p.createdAt,
        branch: p.branch?.name ?? p.branchId,
        branchId: p.branchId,
        vendorName: p.vendor?.name ?? p.vendorId,
        vendorVatNumber: p.vendorVatNumber ?? p.vendor?.vatNumber ?? '—',
        vendorCountry: p.vendorCountry ?? p.vendor?.countryCode ?? '—',
        vendorStateProvince: p.vendorStateProvince ?? p.vendor?.stateProvince ?? null,
        vendorCity: p.vendorCity ?? p.vendor?.city ?? null,
        purchaseCategory: p.purchaseCategory ?? '—',
        taxableAmount,
        taxPercent,
        taxName: p.taxName ?? p.branch?.tax_name ?? 'VAT',
        inputVatAmount,
        totalAmount,
        currencyCode: p.currencyCode ?? p.lot?.currencyCode ?? p.branch?.currency_code ?? 'AED',
        taxStatus: p.taxStatus,
        vatClaimable: p.vatClaimable,
      };
    });

    const totalTaxableAmount = rows.reduce((s, r) => s + Number(r.taxableAmount), 0);
    const totalInputVat = rows.reduce((s, r) => s + Number(r.inputVatAmount), 0);

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
      stateProvince: stateProvinceIntl,
      city: cityIntl,
      page = '1',
      limit = '50',
    } = req.query as Record<string, string>;

    const repo = Source.getRepository(Purchase);
    const qb = repo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.vendor', 'vendor')
      .leftJoinAndSelect('p.branch', 'branch')
      .leftJoinAndSelect('p.lot', 'lot')
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
    if (stateProvinceIntl)
      qb.andWhere('p.vendorStateProvince = :stateProvinceIntl', { stateProvinceIntl });
    if (cityIntl) qb.andWhere('p.vendorCity = :cityIntl', { cityIntl });

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));

    const total = await qb.getCount();
    const purchases = await qb
      .orderBy('p.createdAt', 'DESC')
      .skip((pageNum - 1) * limitNum)
      .take(limitNum)
      .getMany();

    const rows = purchases.map((p) => {
      const customsDuty = p.customsDuty != null ? Number(p.customsDuty) : 0;
      // Fallback formula mirrors purchaseRepository.ts exactly (incl. customsDuty in the VAT
      // base per standard import-VAT practice) — only used for legacy rows saved before
      // taxableAmount was persisted at creation.
      const taxableAmount =
        p.taxableAmount != null
          ? Number(p.taxableAmount)
          : Number(p.purchaseAmount ?? 0) +
            Number(p.labourCost ?? 0) +
            Number(p.handlingFee ?? 0) +
            Number(p.transportationCost ?? 0) +
            Number(p.shippingCost ?? 0) +
            Number(p.groundfieldCost ?? 0) +
            customsDuty;
      const taxPercent =
        p.taxPercent != null
          ? Number(p.taxPercent)
          : p.branch?.tax_percent != null
            ? Number(p.branch.tax_percent)
            : 5;
      const importVatReverseCharge =
        p.reverseChargeVatAmount != null
          ? Number(p.reverseChargeVatAmount)
          : taxableAmount * (taxPercent / 100);
      return {
        id: p.id,
        importInvoiceNo: p.importInvoiceNo ?? p.lot?.lotNumber ?? '—',
        invoiceDate: p.createdAt,
        branch: p.branch?.name ?? p.branchId,
        branchId: p.branchId,
        supplierName: p.vendor?.name ?? p.vendorId,
        supplierCountry: p.vendorCountry ?? p.vendor?.countryCode ?? '—',
        supplierStateProvince: p.vendorStateProvince ?? p.vendor?.stateProvince ?? null,
        supplierCity: p.vendorCity ?? p.vendor?.city ?? null,
        supplierVatNumber: p.vendorVatNumber ?? p.vendor?.vatNumber ?? '—',
        importCountry: p.branch?.country_code ?? null,
        goodsOrService:
          p.goodsOrService ?? (p.purchaseCategory === 'SERVICE' ? 'SERVICE' : 'GOODS'),
        taxableAmount,
        importVatReverseCharge,
        taxPercent,
        customsEntryNo: p.customsEntryNo ?? '—',
        customsDuty,
        shippingCost: Number(p.shippingCost ?? 0),
        labourCost: Number(p.labourCost ?? 0),
        currencyCode: p.currencyCode ?? p.lot?.currencyCode ?? p.branch?.currency_code ?? 'AED',
        exchangeRate: p.exchangeRate ?? p.lot?.exchangeRateSnapshot ?? 1,
        vatClaimable: p.vatClaimable,
        taxStatus: p.taxStatus,
      };
    });

    const totalTaxableAmount = rows.reduce((s, r) => s + Number(r.taxableAmount), 0);
    const totalReverseChargeVat = rows.reduce((s, r) => s + Number(r.importVatReverseCharge), 0);

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
