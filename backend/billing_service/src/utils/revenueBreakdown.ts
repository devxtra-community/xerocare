/**
 * Chart of Accounts Revenue drill-down — Sale / Rent / Lease broken into real
 * business sub-categories (Product/Spare Part, plan type, EMI/FSM).
 *
 * Single source of truth: fetchRevenueRows() returns the exact same
 * unaggregated transaction rows that both the sub-section totals AND the
 * "View" detail table are built from — so a sub-total can never drift from
 * what the detail view shows underneath it (it's the same SUM either way).
 *
 * Population mirrors computeProfitAndLoss's rentalRows/leaseRows/salesRows/
 * sparePartRows in accountsShared.ts exactly (same EXCL_STATUS/VALID_INVOICES
 * filters, same advance-at-signing + period-billed-rent split, no proration
 * on partial period overlap) so the drill-down never changes the existing
 * Sale/Rent/Lease Revenue totals — see accountsShared.ts for the canonical
 * P&L computation this must stay consistent with.
 */

import { DataSource } from 'typeorm';
import { loadExchangeRates, convertAmt } from './accountsShared';

const EXCL_STATUS = `'DRAFT','CANCELLED','EXPIRED','RETAKEN','SUPERSEDED'`;
const VALID_INVOICES = `(type = 'FINAL' OR (type = 'PROFORMA' AND status IN ('ACTIVE_CONTRACT', 'INVOICED', 'PAID')))`;

function branchSql(alias: string, branches: string[] | null): string {
  if (!branches || branches.length === 0) return '';
  if (branches.length === 1) return `AND ${alias}."branchId" = '${branches[0]}'`;
  return `AND ${alias}."branchId" IN (${branches.map((b) => `'${b}'`).join(',')})`;
}

export type RevenueTopCategory = 'SALE' | 'RENT' | 'LEASE';

export interface RevenueRow {
  id: string;
  rowType: 'INVOICE' | 'ADVANCE' | 'USAGE_PERIOD';
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  date: string;
  amount: number;
  currencyCode: string;
  branchId: string;
  saleType: string;
  rentType: string | null;
  leaseType: string | null;
  rentPeriod: string | null;
  billingPeriodStart: string | null;
  billingPeriodEnd: string | null;
  baseCharge: number | null;
  exceededCharge: number | null;
  meterReadings: {
    bwA4Count: number;
    bwA3Count: number;
    colorA4Count: number;
    colorA3Count: number;
  } | null;
}

// Sub-category key this row rolls up into — e.g. 'PRODUCT_SALE', 'CPC', 'EMI', 'FSM_CPC_COMBO'
export function subCategoryOf(row: RevenueRow): string {
  if (row.saleType === 'SALE' || row.saleType === 'PRODUCT_SALE') return 'PRODUCT_SALE';
  if (row.saleType === 'SPAREPART_SALE') return 'SPAREPART_SALE';
  if (row.saleType === 'RENT') return row.rentType ?? 'UNKNOWN';
  if (row.saleType === 'LEASE') {
    if (row.leaseType === 'EMI') return 'EMI';
    if (row.leaseType === 'FSM') return `FSM_${row.rentType ?? 'UNKNOWN'}`;
    return 'UNKNOWN';
  }
  return 'UNKNOWN';
}

/** Raw, unaggregated revenue-contributing rows for one top-level category and period. */
export async function fetchRevenueRows(
  db: DataSource,
  topCategory: RevenueTopCategory,
  branchFilter: string[],
  dateFrom: string,
  dateTo: string,
): Promise<RevenueRow[]> {
  const uuidRe = /^[0-9a-f-]{36}$/i;
  const safeBranches = branchFilter.filter((b) => uuidRe.test(b));
  const bParam = safeBranches.length > 0 ? safeBranches : null;

  if (topCategory === 'SALE') {
    const rows = await db.query<
      {
        id: string;
        invoiceNumber: string;
        customer_name: string | null;
        createdAt: string;
        amount: string;
        currency_code: string | null;
        branchId: string;
        saleType: string;
      }[]
    >(`
      SELECT id, "invoiceNumber", customer_name, TO_CHAR("createdAt", 'YYYY-MM-DD') AS "createdAt",
             ("totalAmount" - COALESCE(tax_amount, 0)) AS amount,
             currency_code, "branchId", "saleType"
      FROM invoices i
      WHERE "saleType" IN ('SALE', 'PRODUCT_SALE', 'SPAREPART_SALE')
        AND status NOT IN (${EXCL_STATUS})
        AND ${VALID_INVOICES}
        AND CAST("createdAt" AS DATE) BETWEEN '${dateFrom}' AND '${dateTo}'
        AND "deletedAt" IS NULL
        ${branchSql('i', bParam)}
      ORDER BY "createdAt" DESC
    `);
    return rows.map((r) => ({
      id: r.id,
      rowType: 'INVOICE',
      invoiceId: r.id,
      invoiceNumber: r.invoiceNumber,
      customerName: r.customer_name ?? 'Unknown Customer',
      date: r.createdAt,
      amount: Number(r.amount),
      currencyCode: r.currency_code ?? 'AED',
      branchId: r.branchId,
      saleType: r.saleType,
      rentType: null,
      leaseType: null,
      rentPeriod: null,
      billingPeriodStart: null,
      billingPeriodEnd: null,
      baseCharge: null,
      exceededCharge: null,
      meterReadings: null,
    }));
  }

  // RENT / LEASE — advance-at-signing rows + period-billed-rent rows, same
  // population as computeProfitAndLoss's rentalRows/leaseRows.
  const [advanceRows, usageRows] = await Promise.all([
    db.query<
      {
        id: string;
        invoiceNumber: string;
        customer_name: string | null;
        createdAt: string;
        amount: string;
        currency_code: string | null;
        branchId: string;
        saleType: string;
        rentType: string | null;
        leaseType: string | null;
        rentPeriod: string | null;
      }[]
    >(`
      SELECT * FROM (
        SELECT i.id, i."invoiceNumber", i.customer_name,
               TO_CHAR(i."createdAt", 'YYYY-MM-DD') AS "createdAt",
               (COALESCE(i."advanceAmount", 0) + COALESCE(adv."totalAdvanceAdjusted", 0)) AS amount,
               i.currency_code, i."branchId", i."saleType", i."rentType", i."leaseType", i."rentPeriod"
        FROM invoices i
        LEFT JOIN (
          SELECT "contractId", SUM(COALESCE("advanceAdjusted", 0)) AS "totalAdvanceAdjusted"
          FROM usage_records GROUP BY "contractId"
        ) adv ON adv."contractId" = i.id
        WHERE i."saleType" = '${topCategory}'
          AND i.status NOT IN (${EXCL_STATUS})
          AND ${VALID_INVOICES}
          AND CAST(i."createdAt" AS DATE) BETWEEN '${dateFrom}' AND '${dateTo}'
          AND i."deletedAt" IS NULL
          ${branchSql('i', bParam)}
      ) sub
      WHERE amount <> 0
      ORDER BY "createdAt" DESC
    `),
    db.query<
      {
        id: string;
        invoiceNumber: string;
        customer_name: string | null;
        billingPeriodStart: string;
        billingPeriodEnd: string;
        amount: string;
        currency_code: string | null;
        branchId: string;
        saleType: string;
        rentType: string | null;
        leaseType: string | null;
        rentPeriod: string | null;
        monthlyRent: string;
        exceededCharge: string;
        bwA4Count: number;
        bwA3Count: number;
        colorA4Count: number;
        colorA3Count: number;
      }[]
    >(`
      SELECT u.id, inv."invoiceNumber", inv.customer_name,
             TO_CHAR(u."billingPeriodStart", 'YYYY-MM-DD') AS "billingPeriodStart",
             TO_CHAR(u."billingPeriodEnd", 'YYYY-MM-DD') AS "billingPeriodEnd",
             (u."monthlyRent" - COALESCE(u."advanceAdjusted", 0)) AS amount,
             inv.currency_code, inv."branchId", inv."saleType", inv."rentType", inv."leaseType", inv."rentPeriod",
             u."monthlyRent", u."exceededCharge",
             u."bwA4Count", u."bwA3Count", u."colorA4Count", u."colorA3Count"
      FROM usage_records u
      JOIN invoices inv ON inv.id = u."contractId"
      WHERE inv."saleType" = '${topCategory}'
        AND u."billingPeriodStart" <= '${dateTo}'
        AND u."billingPeriodEnd" >= '${dateFrom}'
        AND inv."deletedAt" IS NULL
        ${branchSql('inv', bParam)}
      ORDER BY u."billingPeriodEnd" DESC
    `),
  ]);

  const advance: RevenueRow[] = advanceRows.map((r) => ({
    id: `advance-${r.id}`,
    rowType: 'ADVANCE',
    invoiceId: r.id,
    invoiceNumber: r.invoiceNumber,
    customerName: r.customer_name ?? 'Unknown Customer',
    date: r.createdAt,
    amount: Number(r.amount),
    currencyCode: r.currency_code ?? 'AED',
    branchId: r.branchId,
    saleType: r.saleType,
    rentType: r.rentType,
    leaseType: r.leaseType,
    rentPeriod: r.rentPeriod,
    billingPeriodStart: null,
    billingPeriodEnd: null,
    baseCharge: null,
    exceededCharge: null,
    meterReadings: null,
  }));

  const usage: RevenueRow[] = usageRows.map((r) => ({
    id: `usage-${r.id}`,
    rowType: 'USAGE_PERIOD',
    invoiceId: r.id,
    invoiceNumber: r.invoiceNumber,
    customerName: r.customer_name ?? 'Unknown Customer',
    date: r.billingPeriodEnd,
    amount: Number(r.amount),
    currencyCode: r.currency_code ?? 'AED',
    branchId: r.branchId,
    saleType: r.saleType,
    rentType: r.rentType,
    leaseType: r.leaseType,
    rentPeriod: r.rentPeriod,
    billingPeriodStart: r.billingPeriodStart,
    billingPeriodEnd: r.billingPeriodEnd,
    baseCharge: Number(r.monthlyRent),
    exceededCharge: Number(r.exceededCharge),
    meterReadings: {
      bwA4Count: r.bwA4Count,
      bwA3Count: r.bwA3Count,
      colorA4Count: r.colorA4Count,
      colorA3Count: r.colorA3Count,
    },
  }));

  return [...advance, ...usage];
}

export interface RevenueBreakdownResult {
  sale: { total: number; productSale: number; sparePartSale: number };
  rent: { total: number; byPlanType: Record<string, number> };
  lease: {
    total: number;
    emi: number;
    fsm: { total: number; byPlanType: Record<string, number> };
  };
  currencyWarnings: string[];
}

const PLAN_TYPES = ['FIXED_LIMIT', 'FIXED_COMBO', 'FIXED_FLAT', 'CPC', 'CPC_COMBO'];

export async function computeRevenueBreakdown(
  db: DataSource,
  branchFilter: string[],
  dateFrom: string,
  dateTo: string,
  baseCurrency: string,
): Promise<RevenueBreakdownResult> {
  const rates = await loadExchangeRates(db, baseCurrency);
  const currencyWarnings: string[] = [];

  const [saleRows, rentRows, leaseRows] = await Promise.all([
    fetchRevenueRows(db, 'SALE', branchFilter, dateFrom, dateTo),
    fetchRevenueRows(db, 'RENT', branchFilter, dateFrom, dateTo),
    fetchRevenueRows(db, 'LEASE', branchFilter, dateFrom, dateTo),
  ]);

  const sumConverted = (rows: RevenueRow[]) => {
    let total = 0;
    for (const row of rows) {
      const { value, warning } = convertAmt(row.amount, row.currencyCode, baseCurrency, rates);
      if (warning) {
        if (!currencyWarnings.includes(warning)) currencyWarnings.push(warning);
        continue;
      }
      total += value;
    }
    return total;
  };

  const productSale = saleRows.filter((r) => subCategoryOf(r) === 'PRODUCT_SALE');
  const sparePartSale = saleRows.filter((r) => subCategoryOf(r) === 'SPAREPART_SALE');

  const rentByPlanType: Record<string, number> = {};
  for (const pt of PLAN_TYPES) {
    rentByPlanType[pt] = sumConverted(rentRows.filter((r) => subCategoryOf(r) === pt));
  }

  const emiRows = leaseRows.filter((r) => subCategoryOf(r) === 'EMI');
  const fsmByPlanType: Record<string, number> = {};
  for (const pt of PLAN_TYPES) {
    fsmByPlanType[pt] = sumConverted(leaseRows.filter((r) => subCategoryOf(r) === `FSM_${pt}`));
  }
  const fsmTotal = Object.values(fsmByPlanType).reduce((a, b) => a + b, 0);
  const emiTotal = sumConverted(emiRows);

  return {
    sale: {
      total: sumConverted(productSale) + sumConverted(sparePartSale),
      productSale: sumConverted(productSale),
      sparePartSale: sumConverted(sparePartSale),
    },
    rent: {
      total: Object.values(rentByPlanType).reduce((a, b) => a + b, 0),
      byPlanType: rentByPlanType,
    },
    lease: {
      total: emiTotal + fsmTotal,
      emi: emiTotal,
      fsm: { total: fsmTotal, byPlanType: fsmByPlanType },
    },
    currencyWarnings,
  };
}
