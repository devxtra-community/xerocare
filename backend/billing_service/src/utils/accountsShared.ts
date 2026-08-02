/**
 * Shared accounting computation functions.
 * Single source of truth for P&L and Balance Sheet calculations.
 * All endpoints (branch-level and consolidated) call these — never duplicate the math.
 */

import { DataSource } from 'typeorm';
import { calculateDepreciation } from './depreciation';

// ─── Types ────────────────────────────────────────────────────────────────────

// A custom (non-system) chart-of-accounts row with its live computed balance —
// folded into the relevant total, and also returned individually so callers can
// render it nested under its parent account.
export interface CustomAccountBalance {
  id: string;
  accountNumber: string;
  accountName: string;
  category: string;
  accountGroup: string;
  parentAccountId: string | null;
  sourceType: string;
  amount: number;
  isActive: boolean;
}

interface RawChartOfAccountRow {
  id: string;
  accountNumber: string;
  accountName: string;
  category: string;
  accountGroup: string;
  parentAccountId: string | null;
  sourceType: string;
  categoryKey: string | null;
  linkedCashBankAccountId: string | null;
  isActive: boolean;
}

export interface PnLResult {
  // Revenue accounts 4001-4007
  rentalRevenue: number;
  leaseRevenue: number;
  salesRevenue: number; // SALE + PRODUCT_SALE only
  serviceRevenue: number;
  usageRevenue: number; // exceeded_charge only (overage beyond free quota)
  amcSmaRevenue: number;
  sparePartSalesRevenue: number;
  totalRevenue: number;

  // Expense accounts 5001-5015
  costOfParts: number;
  labourCost: number; // 5002: Technician Labour (service-ticket labour only — never blended with purchase-side labour)
  depreciationExpense: number;
  vendorPurchases: number; // 5004: inventory PO purchase_amount + documentation_fee + manual expense entries VENDOR_PURCHASE
  shippingHandling: number; // 5005: shippingCost + handlingFee + transportCost + groundfieldCost
  salaryExpense: number;
  travelExpense: number;
  rentExpense: number;
  utilitiesExpense: number;
  marketingExpense: number;
  maintenanceExpense: number;
  insuranceExpense: number;
  otherExpenses: number;
  importLabourCost: number; // 5014: purchase-side labour_cost (e.g. import/customs-clearance) — distinct from 5002
  customsDuty: number; // 5015: purchases.customs_duty, expensed directly (not capitalized into inventory)
  otherIncome: number; // 4008 catch-all: income_entries rows not yet linked to a custom account
  totalExpenses: number;

  // Custom (non-system) chart-of-accounts rows — already folded into totalRevenue/
  // totalExpenses above, returned individually for nested display.
  customIncome: CustomAccountBalance[];
  customExpenses: CustomAccountBalance[];

  grossProfit: number;
  netProfit: number;

  // All-time totals (used for retained earnings in balance sheet)
  allTimeRevenue: number;
  allTimeExpenses: number;
  allTimeDepreciation: number;

  currency: string;
  currencyWarnings: string[]; // exchange rate missing for a currency
  dataWarnings: string[]; // cross-service calls that returned unavailable
}

export interface BalanceSheetResult {
  // Current Assets
  cashInHand: number;
  cashAtBank: number;
  invoiceAR: number;
  manualAR: number;
  accountsReceivable: number; // invoiceAR + manualAR
  securityDepositsReceivable: number;
  prepaidExpenses: number;
  sparePartsInventory: number;
  productInventory: number;
  inventoryUnavailable: boolean;

  // Non-Current Assets
  equipmentGrossCost: number;
  accumulatedDepreciation: number;
  equipmentNBV: number;

  // Current Liabilities
  accountsPayable: number;
  accruedExpenses: number; // APPROVED-but-not-PAID expense entries
  vatPayable: number; // output VAT collected − input VAT credit − remitted; can be negative (net recoverable)
  securityDepositsReceived: number;
  deferredRevenue: number;
  deferredRevenueMemo: number; // informational only — see computeBalanceSheet for why
  salaryPayable: number;

  // Equity
  ownerCapital: number;
  retainedEarnings: number; // auto-computed: allTimeRevenue - allTimeExpenses - allTimeDepreciation
  reserves: number;
  dividends: number;
  withdrawals: number;

  // Custom (non-system) chart-of-accounts rows — already folded into the totals
  // below, returned individually for nested display.
  customAssets: CustomAccountBalance[];
  customLiabilities: CustomAccountBalance[];
  customEquity: CustomAccountBalance[];

  totalCurrentAssets: number;
  totalNonCurrentAssets: number;
  totalAssets: number;
  totalCurrentLiabilities: number;
  totalNonCurrentLiabilities: number;
  totalLiabilities: number;
  totalEquity: number;
  totalLiabilitiesAndEquity: number;
  difference: number;
  isBalanced: boolean;

  currency: string;
  currencyWarnings: string[];
  dataWarnings: string[];
}

// ─── Exchange Rate Helpers ────────────────────────────────────────────────────

/**
 * Loads a rates map: fromCurrency → rate (to convert to baseCurrency).
 * baseCurrency → baseCurrency is always 1.
 */
export async function loadExchangeRates(
  db: DataSource,
  baseCurrency: string,
): Promise<Map<string, number>> {
  const rows = await db.query<{ fromCurrency: string; rate: string }[]>(
    `SELECT "fromCurrency", rate FROM exchange_rates WHERE "toCurrency" = $1`,
    [baseCurrency],
  );
  const map = new Map<string, number>();
  map.set(baseCurrency, 1);
  for (const r of rows) {
    map.set(r.fromCurrency, Number(r.rate));
  }
  return map;
}

/**
 * Converts an amount from fromCurrency to baseCurrency.
 * Returns {value, warning} — warning is set if the rate is missing.
 * If rate is missing, returns {value: 0, warning: '...'} so the caller can decide to skip or flag.
 */
export function convertAmt(
  amount: number,
  fromCurrency: string | null | undefined,
  baseCurrency: string,
  rates: Map<string, number>,
): { value: number; warning?: string } {
  const ccy = fromCurrency ?? baseCurrency;
  if (ccy === baseCurrency) return { value: amount };
  const rate = rates.get(ccy);
  if (rate === undefined) {
    return {
      value: 0,
      warning: `No exchange rate found for ${ccy} → ${baseCurrency}. Amount excluded from total.`,
    };
  }
  return { value: amount * rate };
}

/**
 * Aggregates rows of {currency_code, amount} into a single base-currency total.
 * Pushes a warning into the provided array for any missing rate.
 */
function aggByCurrency(
  rows: { currency_code: string | null; amount: string }[],
  baseCurrency: string,
  rates: Map<string, number>,
  warnings: string[],
): number {
  let total = 0;
  for (const row of rows) {
    const { value, warning } = convertAmt(
      Number(row.amount),
      row.currency_code,
      baseCurrency,
      rates,
    );
    if (warning) {
      if (!warnings.includes(warning)) warnings.push(warning);
    } else {
      total += value;
    }
  }
  return total;
}

// ─── Internal service fetch ───────────────────────────────────────────────────

async function internalGet<T>(url: string): Promise<T | null> {
  try {
    const { sign } = await import('jsonwebtoken');
    const token = sign(
      { userId: 'billing_service', role: 'ADMIN' },
      process.env.ACCESS_SECRET as string,
      { expiresIn: '1m' },
    );
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${token}`, 'x-internal-service': 'billing' },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// ─── Branch SQL helper ────────────────────────────────────────────────────────

function branchSql(alias: string, col = '"branchId"', branches: string[] | null): string {
  if (!branches || branches.length === 0) return '';
  if (branches.length === 1) return `AND ${alias}.${col} = '${branches[0]}'`;
  return `AND ${alias}.${col} IN (${branches.map((b) => `'${b}'`).join(',')})`;
}

// ─── computeProfitAndLoss ─────────────────────────────────────────────────────

export async function computeProfitAndLoss(
  db: DataSource,
  branchFilter: string[],
  dateFrom: string,
  dateTo: string,
  baseCurrency: string,
  invUrl: string,
): Promise<PnLResult> {
  const currencyWarnings: string[] = [];
  const dataWarnings: string[] = [];

  const uuidRe = /^[0-9a-f-]{36}$/i;
  const safeBranches = branchFilter.filter((b) => uuidRe.test(b));
  const bParam = safeBranches.length > 0 ? safeBranches : null;
  const bSql = branchSql('i', '"branchId"', bParam);
  const bSqlExp = branchSql('e', '"branchId"', bParam);
  const bSqlUsage = branchSql('u', '"branchId"', bParam);
  const bSqlAllInv = branchSql('inv', '"branchId"', bParam);
  const bSqlAllExp = branchSql('ex', '"branchId"', bParam);
  const bSqlAllDep = branchSql('dj', '"branchId"', bParam);
  const bSqlCn = branchSql('cn', '"branchId"', bParam);
  const bSqlInc = branchSql('inc', '"branchId"', bParam);
  const bSqlAllInc = branchSql('allinc', '"branchId"', bParam);
  const bSqlMj = branchSql('mj', '"branchId"', bParam);
  const bSqlAllMj = branchSql('allmj', '"branchId"', bParam);

  const rates = await loadExchangeRates(db, baseCurrency);

  // Revenue queries — GROUP BY currency_code so we can convert each group
  const EXCL_STATUS = `'DRAFT','CANCELLED','EXPIRED','RETAKEN','SUPERSEDED'`;
  const VALID_INVOICES = `(type = 'FINAL' OR (type = 'PROFORMA' AND status IN ('ACTIVE_CONTRACT', 'INVOICED', 'PAID')))`;

  type CcyRow = { currency_code: string | null; amount: string };

  const [
    rentalRows,
    leaseRows,
    salesRows,
    serviceRows,
    amcRows,
    sparePartRows,
    usageRows,
    expRows,
    depAmount,
    allTimeRevRows,
    allTimeExpAmount,
    allTimeDepAmount,
    creditNoteRows,
    incRows,
    allTimeIncAmount,
    customAccountsPL,
    mjRows,
    allTimeMjAmount,
  ] = await Promise.all([
    // 4001 Rental Revenue — RENT contracts reuse a single invoice across their whole
    // lifecycle, so revenue can't be read from invoice.totalAmount filtered by
    // invoice.createdAt (that mixes every period's accrual into one snapshot and
    // misattributes it all to the signing date). Instead: the advance is recognized
    // once, in its signing period; each billed period's monthlyRent is recognized in
    // ITS OWN period (mirroring how 4005 already reads usage_records for exceededCharge)
    // — net of advanceAdjusted, the amount the final period drew down from the advance,
    // so that dollar isn't recognized twice.
    db.query<CcyRow[]>(`
      (
        SELECT COALESCE(i."currency_code", '${baseCurrency}') AS currency_code,
               COALESCE(SUM(COALESCE(i."advanceAmount", 0) + COALESCE(adv."totalAdvanceAdjusted", 0)), 0) AS amount
        FROM invoices i
        LEFT JOIN (
          SELECT "contractId", SUM(COALESCE("advanceAdjusted", 0)) AS "totalAdvanceAdjusted"
          FROM usage_records GROUP BY "contractId"
        ) adv ON adv."contractId" = i.id
        WHERE i."saleType" = 'RENT'
          AND i.status NOT IN (${EXCL_STATUS})
          AND ${VALID_INVOICES}
          AND CAST(i."createdAt" AS DATE) BETWEEN '${dateFrom}' AND '${dateTo}'
          AND i."deletedAt" IS NULL
          ${bSql}
        GROUP BY i."currency_code"
      )
      UNION ALL
      (
        SELECT COALESCE(inv."currency_code", '${baseCurrency}') AS currency_code,
               COALESCE(SUM(u."monthlyRent" - COALESCE(u."advanceAdjusted", 0)), 0) AS amount
        FROM usage_records u
        JOIN invoices inv ON inv.id = u."contractId"
        WHERE inv."saleType" = 'RENT'
          AND u."billingPeriodStart" <= '${dateTo}'
          AND u."billingPeriodEnd" >= '${dateFrom}'
          AND inv."deletedAt" IS NULL
          ${branchSql('inv', '"branchId"', bParam)}
        GROUP BY inv."currency_code"
      )
    `),
    // 4002 Lease Revenue — same advance-at-signing + period-filtered-rent approach as 4001
    db.query<CcyRow[]>(`
      (
        SELECT COALESCE(i."currency_code", '${baseCurrency}') AS currency_code,
               COALESCE(SUM(COALESCE(i."advanceAmount", 0) + COALESCE(adv."totalAdvanceAdjusted", 0)), 0) AS amount
        FROM invoices i
        LEFT JOIN (
          SELECT "contractId", SUM(COALESCE("advanceAdjusted", 0)) AS "totalAdvanceAdjusted"
          FROM usage_records GROUP BY "contractId"
        ) adv ON adv."contractId" = i.id
        WHERE i."saleType" = 'LEASE'
          AND i.status NOT IN (${EXCL_STATUS})
          AND ${VALID_INVOICES}
          AND CAST(i."createdAt" AS DATE) BETWEEN '${dateFrom}' AND '${dateTo}'
          AND i."deletedAt" IS NULL
          ${bSql}
        GROUP BY i."currency_code"
      )
      UNION ALL
      (
        SELECT COALESCE(inv."currency_code", '${baseCurrency}') AS currency_code,
               COALESCE(SUM(u."monthlyRent" - COALESCE(u."advanceAdjusted", 0)), 0) AS amount
        FROM usage_records u
        JOIN invoices inv ON inv.id = u."contractId"
        WHERE inv."saleType" = 'LEASE'
          AND u."billingPeriodStart" <= '${dateTo}'
          AND u."billingPeriodEnd" >= '${dateFrom}'
          AND inv."deletedAt" IS NULL
          ${branchSql('inv', '"branchId"', bParam)}
        GROUP BY inv."currency_code"
      )
    `),
    // 4003 Sales Revenue — SALE + PRODUCT_SALE only (SPAREPART_SALE goes to 4007)
    db.query<CcyRow[]>(`
      SELECT COALESCE("currency_code", '${baseCurrency}') AS currency_code,
             COALESCE(SUM("totalAmount" - COALESCE(tax_amount, 0)), 0) AS amount
      FROM invoices i
      WHERE "saleType" IN ('SALE', 'PRODUCT_SALE')
        AND status NOT IN (${EXCL_STATUS})
        AND ${VALID_INVOICES}
        AND CAST("createdAt" AS DATE) BETWEEN '${dateFrom}' AND '${dateTo}'
        AND "deletedAt" IS NULL
        ${bSql}
      GROUP BY "currency_code"
    `),
    // 4004 Service Revenue — chargeable service only, excludes AMC/FSMA/SMA
    db.query<CcyRow[]>(`
      SELECT COALESCE("currency_code", '${baseCurrency}') AS currency_code,
             COALESCE(SUM("totalAmount" - COALESCE(tax_amount, 0)), 0) AS amount
      FROM invoices i
      WHERE "saleType" = 'SERVICE'
        AND ("billType" IS NULL OR "billType" NOT IN ('AMC', 'FSMA', 'SMA'))
        AND status NOT IN (${EXCL_STATUS})
        AND ${VALID_INVOICES}
        AND CAST("createdAt" AS DATE) BETWEEN '${dateFrom}' AND '${dateTo}'
        AND "deletedAt" IS NULL
        ${bSql}
      GROUP BY "currency_code"
    `),
    // 4006 AMC/FSMA/SMA Revenue
    db.query<CcyRow[]>(`
      SELECT COALESCE("currency_code", '${baseCurrency}') AS currency_code,
             COALESCE(SUM("totalAmount" - COALESCE(tax_amount, 0)), 0) AS amount
      FROM invoices i
      WHERE "billType" IN ('AMC', 'FSMA', 'SMA')
        AND status NOT IN (${EXCL_STATUS})
        AND ${VALID_INVOICES}
        AND CAST("createdAt" AS DATE) BETWEEN '${dateFrom}' AND '${dateTo}'
        AND "deletedAt" IS NULL
        ${bSql}
      GROUP BY "currency_code"
    `),
    // 4007 Spare Parts Sales Revenue — SPAREPART_SALE invoices only
    db.query<CcyRow[]>(`
      SELECT COALESCE("currency_code", '${baseCurrency}') AS currency_code,
             COALESCE(SUM("totalAmount" - COALESCE(tax_amount, 0)), 0) AS amount
      FROM invoices i
      WHERE "saleType" = 'SPAREPART_SALE'
        AND status NOT IN (${EXCL_STATUS})
        AND ${VALID_INVOICES}
        AND CAST("createdAt" AS DATE) BETWEEN '${dateFrom}' AND '${dateTo}'
        AND "deletedAt" IS NULL
        ${bSql}
      GROUP BY "currency_code"
    `),
    // 4005 Usage/Copy Revenue — exceeded_charge ONLY from usage_records (overage, not base rent)
    // Join contract invoice for currency code and branch filter
    db.query<CcyRow[]>(`
      SELECT COALESCE(inv."currency_code", '${baseCurrency}') AS currency_code,
             COALESCE(SUM(u."exceededCharge"), 0) AS amount
      FROM usage_records u
      JOIN invoices inv ON inv.id = u."contractId"
      WHERE u."billingPeriodStart" >= '${dateFrom}'
        AND u."billingPeriodEnd" <= '${dateTo}'
        AND inv."deletedAt" IS NULL
        ${bSqlUsage.replace('u."branchId"', 'inv."branchId"')}
      GROUP BY inv."currency_code"
    `),
    // Expenses by category — APPROVED or PAID, period-filtered. Excludes DEPRECIATION:
    // postDepreciationJournal() writes a mirror expense_entries row (for audit-trail
    // visibility in the expense list) alongside the dedicated depreciation_journal_entries
    // row that 5003 already reads below — counting both here would double the expense.
    // Prepayments (1005 Prepaid Expenses) recognize in the period their covered period
    // ENDS, not when paid — matches computeBalanceSheet's prepaidExpenses (an unexpired
    // prepayment is an asset, zero P&L impact; once it expires it becomes a real expense
    // in that period) so the two stay balanced at every point in time, not just at signing.
    db.query<{ category: string; amount: string }[]>(`
      SELECT category, COALESCE(SUM("netAmount"), 0) AS amount
      FROM expense_entries e
      WHERE status IN ('APPROVED', 'PAID')
        AND category != 'DEPRECIATION'
        AND (
          (NOT "isPrepayment" AND date BETWEEN '${dateFrom}' AND '${dateTo}')
          OR ("isPrepayment" AND COALESCE("coveredPeriodEnd", date) BETWEEN '${dateFrom}' AND '${dateTo}')
        )
        ${bSqlExp}
      GROUP BY category
    `),
    // 5003 Depreciation — posted journals for period
    db.query<{ amount: string }[]>(`
      SELECT COALESCE(SUM("totalAmount"), 0) AS amount
      FROM depreciation_journal_entries d
      WHERE status = 'POSTED'
        AND (
          "periodYear" * 100 + "periodMonth"
          BETWEEN
            EXTRACT(YEAR FROM DATE '${dateFrom}')::int * 100 + EXTRACT(MONTH FROM DATE '${dateFrom}')::int
          AND
            EXTRACT(YEAR FROM DATE '${dateTo}')::int * 100 + EXTRACT(MONTH FROM DATE '${dateTo}')::int
        )
    `),
    // All-time revenue — for retained earnings (no date filter, no type exclusion except CANCELLED).
    // RENT/LEASE excluded from the raw totalAmount sum (same reused-invoice/overwrite problem as
    // 4001/4002) and replaced with the corrected lifetime figure: advance once + all billed
    // periods' monthlyRent (net of advanceAdjusted) + all exceededCharge — this single number
    // doesn't split out a separate "usage revenue" bucket the way the period P&L does, since
    // all-time has no 4005 counterpart to add on top of it.
    db.query<CcyRow[]>(`
      (
        SELECT COALESCE("currency_code", '${baseCurrency}') AS currency_code,
               COALESCE(SUM("totalAmount" - COALESCE(tax_amount, 0)), 0) AS amount
        FROM invoices inv
        WHERE status NOT IN ('DRAFT', 'CANCELLED', 'EXPIRED', 'RETAKEN', 'SUPERSEDED')
          AND ${VALID_INVOICES}
          AND "saleType" NOT IN ('RENT', 'LEASE')
          AND "deletedAt" IS NULL
          ${bSqlAllInv}
        GROUP BY "currency_code"
      )
      UNION ALL
      (
        SELECT COALESCE(i."currency_code", '${baseCurrency}') AS currency_code,
               COALESCE(SUM(COALESCE(i."advanceAmount", 0) + COALESCE(adv."totalAdvanceAdjusted", 0)), 0) AS amount
        FROM invoices i
        LEFT JOIN (
          SELECT "contractId", SUM(COALESCE("advanceAdjusted", 0)) AS "totalAdvanceAdjusted"
          FROM usage_records GROUP BY "contractId"
        ) adv ON adv."contractId" = i.id
        WHERE i."saleType" IN ('RENT', 'LEASE')
          AND i.status NOT IN ('DRAFT', 'CANCELLED', 'EXPIRED', 'RETAKEN', 'SUPERSEDED')
          AND ${VALID_INVOICES}
          AND i."deletedAt" IS NULL
          ${bSqlAllInv.replace('inv."branchId"', 'i."branchId"')}
        GROUP BY i."currency_code"
      )
      UNION ALL
      (
        SELECT COALESCE(inv."currency_code", '${baseCurrency}') AS currency_code,
               COALESCE(SUM(u."monthlyRent" - COALESCE(u."advanceAdjusted", 0) + u."exceededCharge"), 0) AS amount
        FROM usage_records u
        JOIN invoices inv ON inv.id = u."contractId"
        WHERE inv."saleType" IN ('RENT', 'LEASE')
          AND inv."deletedAt" IS NULL
          ${bSqlAllInv}
        GROUP BY inv."currency_code"
      )
    `),
    // All-time expenses — for retained earnings. Excludes DEPRECIATION (see period query
    // above) — allTimeDepreciation below is the single source of truth for it.
    db.query<{ amount: string }[]>(`
      SELECT COALESCE(SUM("netAmount"), 0) AS amount
      FROM expense_entries ex
      WHERE status IN ('APPROVED', 'PAID')
        AND category != 'DEPRECIATION'
        ${bSqlAllExp}
    `),
    // All-time depreciation — for retained earnings
    db.query<{ amount: string }[]>(`
      SELECT COALESCE(SUM("totalAmount"), 0) AS amount
      FROM depreciation_journal_entries dj
      WHERE status = 'POSTED'
        ${bSqlAllDep}
    `),
    // Credit note adjustments — CREDIT_EXCHANGE finalized in period
    // Net: replacementAmount - productAmount (positive = upsell, negative = downgrade/return)
    db.query<{ amount: string }[]>(`
      SELECT COALESCE(SUM(COALESCE("replacementAmount", 0) - "productAmount"), 0) AS amount
      FROM credit_notes cn
      WHERE status = 'PRODUCT_REPLACED'
        AND type = 'CREDIT_EXCHANGE'
        AND CAST("createdAt" AS DATE) BETWEEN '${dateFrom}' AND '${dateTo}'
        ${bSqlCn}
    `),
    // Custom income (income_entries), by category — period-filtered, RECEIVED only.
    // Mirrors the expense_entries query above exactly (same no-currency-conversion
    // precedent — entries are assumed to already be in the branch's own currency).
    db.query<{ category: string; amount: string }[]>(`
      SELECT category, COALESCE(SUM("netAmount"), 0) AS amount
      FROM income_entries inc
      WHERE status = 'RECEIVED'
        AND date BETWEEN '${dateFrom}' AND '${dateTo}'
        ${bSqlInc}
      GROUP BY category
    `),
    // All-time custom income — for retained earnings
    db.query<{ amount: string }[]>(`
      SELECT COALESCE(SUM("netAmount"), 0) AS amount
      FROM income_entries allinc
      WHERE status = 'RECEIVED' ${bSqlAllInc}
    `),
    // Custom (non-system) INCOME/EXPENSE chart-of-accounts rows — company-wide definitions.
    // Inactive accounts are included so their historical balances remain visible in reports.
    db.query<RawChartOfAccountRow[]>(`
      SELECT id, "accountNumber", "accountName", category, "accountGroup",
             "parentAccountId", "sourceType", "categoryKey", "linkedCashBankAccountId", "isActive"
      FROM chart_of_accounts
      WHERE "isSystemDefault" = false AND category IN ('INCOME', 'EXPENSE')
    `),
    // Manual-journal postings against custom INCOME/EXPENSE accounts — period-filtered
    db.query<{ chartOfAccountId: string; amount: string }[]>(`
      SELECT "chartOfAccountId", COALESCE(SUM(amount), 0) AS amount
      FROM manual_journal_entries mj
      WHERE date BETWEEN '${dateFrom}' AND '${dateTo}' ${bSqlMj}
      GROUP BY "chartOfAccountId"
    `),
    // All-time manual-journal postings against custom INCOME/EXPENSE accounts — for retained earnings
    db.query<{ chartOfAccountId: string; amount: string }[]>(`
      SELECT "chartOfAccountId", COALESCE(SUM(amount), 0) AS amount
      FROM manual_journal_entries allmj
      WHERE 1=1 ${bSqlAllMj}
      GROUP BY "chartOfAccountId"
    `),
  ]);

  // Convert revenues with currency handling
  const rentalRevenue = aggByCurrency(rentalRows, baseCurrency, rates, currencyWarnings);
  const leaseRevenue = aggByCurrency(leaseRows, baseCurrency, rates, currencyWarnings);
  // Apply credit note adjustments (CREDIT_EXCHANGE net: replacementAmount - productAmount)
  const creditNoteAdj = Number(creditNoteRows[0]?.amount ?? 0);
  const salesRevenue =
    aggByCurrency(salesRows, baseCurrency, rates, currencyWarnings) + creditNoteAdj;
  const serviceRevenue = aggByCurrency(serviceRows, baseCurrency, rates, currencyWarnings);
  const amcSmaRevenue = aggByCurrency(amcRows, baseCurrency, rates, currencyWarnings);
  const sparePartSalesRevenue = aggByCurrency(sparePartRows, baseCurrency, rates, currencyWarnings);
  const usageRevenue = aggByCurrency(usageRows, baseCurrency, rates, currencyWarnings);

  // Expense categories from expense_entries
  const expMap: Record<string, number> = {};
  for (const row of expRows) {
    expMap[row.category] = Number(row.amount);
  }

  // Income categories from income_entries (a wholly separate, additive revenue
  // source — never overlaps with the invoice-derived revenue lines above).
  const incMap: Record<string, number> = {};
  for (const row of incRows) {
    incMap[row.category] = Number(row.amount);
  }
  const mjByAccount: Record<string, number> = {};
  for (const row of mjRows) {
    mjByAccount[row.chartOfAccountId] = Number(row.amount);
  }

  const depreciationExpense = Number(depAmount[0]?.amount ?? 0);

  // 5001 COGS — spare parts consumed in completed service tickets (cross-service)
  // 5004/5005/5014/5015 — vendor purchase costs from Inventory service purchases
  // Fetched together: they're independent, and each internalGet carries a 6s abort
  // timeout, so running them in sequence doubled the worst-case latency of every
  // report that calls this (and computeBalanceSheet calls it a second time for
  // all-time retained earnings, making it 4 serial round trips).
  const cogsUrl = `${invUrl}/service/internal/cogs-report?${bParam ? `branchIds=${bParam.join(',')}` : ''}&dateFrom=${dateFrom}&dateTo=${dateTo}`;
  const purchaseCostUrl = `${invUrl}/purchases/internal/cost-report?${bParam ? `branchIds=${bParam.join(',')}` : ''}&dateFrom=${dateFrom}&dateTo=${dateTo}`;
  const [cogsData, purchaseCostData] = await Promise.all([
    internalGet<{ cogsAmount: number; labourAmount: number }>(cogsUrl),
    internalGet<{
      currencyGroups: {
        currencyCode: string;
        purchaseCost: number;
        shippingHandling: number;
        importLabourCost: number;
        customsDuty: number;
      }[];
    }>(purchaseCostUrl),
  ]);

  const crossServiceCogs = cogsData?.cogsAmount ?? 0;
  const crossServiceLabour = cogsData?.labourAmount ?? 0;
  if (!cogsData)
    dataWarnings.push(
      '5001/5002: Inventory service unavailable — spare parts consumed and service labour may be understated (manual expense entries still counted).',
    );

  let crossServiceVendorPurchases = 0;
  let crossServiceShipping = 0;
  let crossServiceImportLabour = 0;
  if (!purchaseCostData) {
    dataWarnings.push(
      '5004/5005/5014: Inventory service unavailable — purchase costs, shipping and import labour may be understated (manual expense entries still counted).',
    );
  } else {
    for (const grp of purchaseCostData.currencyGroups ?? []) {
      const pcResult = convertAmt(grp.purchaseCost, grp.currencyCode, baseCurrency, rates);
      const shResult = convertAmt(grp.shippingHandling, grp.currencyCode, baseCurrency, rates);
      const ilResult = convertAmt(grp.importLabourCost, grp.currencyCode, baseCurrency, rates);
      if (pcResult.warning) {
        if (!currencyWarnings.includes(pcResult.warning)) currencyWarnings.push(pcResult.warning);
      } else crossServiceVendorPurchases += pcResult.value;
      if (shResult.warning) {
        if (!currencyWarnings.includes(shResult.warning)) currencyWarnings.push(shResult.warning);
      } else crossServiceShipping += shResult.value;
      if (ilResult.warning) {
        if (!currencyWarnings.includes(ilResult.warning)) currencyWarnings.push(ilResult.warning);
      } else crossServiceImportLabour += ilResult.value;
      // customsDuty from this cross-service response is intentionally not accumulated
      // here — see the 5015 comment below for why.
    }
  }

  // 5001: cross-service COGS + manual expense entries SPARE_PARTS
  const costOfParts = crossServiceCogs + (expMap['SPARE_PARTS'] ?? 0);
  // 5002: cross-service labour + manual expense entries LABOUR (service-ticket/technician labour only)
  const labourCost = crossServiceLabour + (expMap['LABOUR'] ?? 0);
  // 5004: Inventory POs (purchase_amount + documentation_fee only) + manual expense entries VENDOR_PURCHASE
  const vendorPurchases = crossServiceVendorPurchases + (expMap['VENDOR_PURCHASE'] ?? 0);
  // 5005: Inventory PO shipping/handling
  const shippingHandling = crossServiceShipping;
  // 5014: purchase-side labour_cost (import/customs-clearance) + manual expense entries IMPORT_LABOUR —
  // kept distinct from 5002 Technician Labour, which is service-ticket labour only.
  const importLabourCost = crossServiceImportLabour + (expMap['IMPORT_LABOUR'] ?? 0);
  // 5015: manual expense entries CUSTOMS_DUTY ONLY — expensed directly per business decision
  // (not capitalized into inventory 1006/1009). purchases.customs_duty is a declared value set
  // at PO creation with no cash/payable tracking of its own — it is deliberately not pulled in
  // here, because it was previously double-counted whenever Finance also logged the actual
  // customs payment as a CUSTOMS_DUTY expense entry (which has real cash/payable backing via
  // the expense-request approval flow, same as every other manual expense category). The
  // Purchase Cost / VAT reverse-charge reports (ven_inv_service) read customs_duty directly
  // from the purchases table and are unaffected by this — they're informational, not P&L.
  const customsDuty = expMap['CUSTOMS_DUTY'] ?? 0;

  const salaryExpense = expMap['SALARY'] ?? 0;
  const travelExpense = expMap['TRAVEL'] ?? 0;
  const rentExpense = expMap['RENT'] ?? 0;
  const utilitiesExpense = expMap['UTILITIES'] ?? 0;
  const marketingExpense = expMap['MARKETING'] ?? 0;
  const maintenanceExpense = expMap['MAINTENANCE'] ?? 0;
  const insuranceExpense = expMap['INSURANCE'] ?? 0;

  // Known category keys — everything else rolls into otherExpenses so nothing is silently dropped
  const KNOWN_CATEGORIES = new Set([
    'SPARE_PARTS',
    'LABOUR',
    'VENDOR_PURCHASE',
    'SALARY',
    'TRAVEL',
    'RENT',
    'UTILITIES',
    'MARKETING',
    'MAINTENANCE',
    'INSURANCE',
    'IMPORT_LABOUR',
    'CUSTOMS_DUTY',
    'OTHER',
  ]);

  // ── Custom (non-system) INCOME/EXPENSE chart-of-accounts rows ─────────────────
  // EXPENSE_CATEGORY_LINKED accounts pull straight from expMap — this is a
  // re-bucketing of the SAME expense_entries total (moving a key out of the
  // "otherExpenses" catch-all into its own named line), not an addition, so
  // totalExpenses cannot double-count. MANUAL_JOURNAL accounts post to a
  // separate table entirely, so their contribution is genuinely additive.
  // INCOME_CATEGORY_LINKED/MANUAL_JOURNAL income accounts are always additive —
  // income_entries has no other line item reading from it anywhere above.
  const customExpenseBreakdown: CustomAccountBalance[] = [];
  const customIncomeBreakdown: CustomAccountBalance[] = [];
  const customExpenseCategoryKeys = new Set<string>();
  const linkedIncomeCategoryKeys = new Set<string>();
  let customExpenseTotal = 0;
  let customIncomeTotal = 0;
  for (const acc of customAccountsPL) {
    let amount = 0;
    if (acc.category === 'EXPENSE') {
      if (acc.sourceType === 'EXPENSE_CATEGORY_LINKED' && acc.categoryKey) {
        amount = expMap[acc.categoryKey] ?? 0;
        customExpenseCategoryKeys.add(acc.categoryKey);
      } else if (acc.sourceType === 'MANUAL_JOURNAL') {
        amount = mjByAccount[acc.id] ?? 0;
      }
      customExpenseBreakdown.push({
        id: acc.id,
        accountNumber: acc.accountNumber,
        accountName: acc.accountName,
        category: acc.category,
        accountGroup: acc.accountGroup,
        parentAccountId: acc.parentAccountId,
        sourceType: acc.sourceType,
        amount,
        isActive: acc.isActive,
      });
      customExpenseTotal += amount;
    } else if (acc.category === 'INCOME') {
      if (acc.sourceType === 'INCOME_CATEGORY_LINKED' && acc.categoryKey) {
        amount = incMap[acc.categoryKey] ?? 0;
        linkedIncomeCategoryKeys.add(acc.categoryKey);
      } else if (acc.sourceType === 'MANUAL_JOURNAL') {
        amount = mjByAccount[acc.id] ?? 0;
      }
      customIncomeBreakdown.push({
        id: acc.id,
        accountNumber: acc.accountNumber,
        accountName: acc.accountName,
        category: acc.category,
        accountGroup: acc.accountGroup,
        parentAccountId: acc.parentAccountId,
        sourceType: acc.sourceType,
        amount,
        isActive: acc.isActive,
      });
      customIncomeTotal += amount;
    }
  }
  for (const key of customExpenseCategoryKeys) KNOWN_CATEGORIES.add(key);

  let otherExpenses = expMap['OTHER'] ?? 0;
  for (const [cat, amt] of Object.entries(expMap)) {
    if (!KNOWN_CATEGORIES.has(cat)) otherExpenses += amt;
  }

  // 4008 Other Income — any income_entries category not yet linked to a custom
  // account, so real recorded income is never silently dropped from the total.
  let otherIncome = 0;
  for (const [cat, amt] of Object.entries(incMap)) {
    if (!linkedIncomeCategoryKeys.has(cat)) otherIncome += amt;
  }

  const totalRevenue =
    rentalRevenue +
    leaseRevenue +
    salesRevenue +
    serviceRevenue +
    amcSmaRevenue +
    sparePartSalesRevenue +
    usageRevenue +
    customIncomeTotal +
    otherIncome;

  const totalExpenses =
    costOfParts +
    labourCost +
    depreciationExpense +
    vendorPurchases +
    shippingHandling +
    salaryExpense +
    travelExpense +
    rentExpense +
    utilitiesExpense +
    marketingExpense +
    maintenanceExpense +
    insuranceExpense +
    importLabourCost +
    customsDuty +
    otherExpenses +
    customExpenseTotal;

  const grossProfit = totalRevenue - costOfParts - labourCost;
  const netProfit = totalRevenue - totalExpenses;

  // All-time totals for retained earnings. allTimeExpAmount already sums every
  // expense_entries row regardless of category, so a custom EXPENSE_CATEGORY_LINKED
  // account's contribution is already in there (same non-double-count reasoning as
  // the period totals above) — only MANUAL_JOURNAL postings are genuinely additive.
  const allTimeCustomIncome = Number(allTimeIncAmount[0]?.amount ?? 0);
  let allTimeCustomMjIncome = 0;
  let allTimeCustomMjExpense = 0;
  for (const row of allTimeMjAmount) {
    const acc = customAccountsPL.find((a) => a.id === row.chartOfAccountId);
    if (!acc) continue;
    if (acc.category === 'INCOME') allTimeCustomMjIncome += Number(row.amount);
    else if (acc.category === 'EXPENSE') allTimeCustomMjExpense += Number(row.amount);
  }
  const allTimeRevenue =
    aggByCurrency(allTimeRevRows, baseCurrency, rates, currencyWarnings) +
    allTimeCustomIncome +
    allTimeCustomMjIncome;
  const allTimeExpenses = Number(allTimeExpAmount[0]?.amount ?? 0) + allTimeCustomMjExpense;
  const allTimeDepreciation = Number(allTimeDepAmount[0]?.amount ?? 0);

  return {
    rentalRevenue,
    leaseRevenue,
    salesRevenue,
    serviceRevenue,
    usageRevenue,
    amcSmaRevenue,
    sparePartSalesRevenue,
    totalRevenue,
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
    importLabourCost,
    customsDuty,
    otherIncome,
    otherExpenses,
    customIncome: customIncomeBreakdown,
    customExpenses: customExpenseBreakdown,
    totalExpenses,
    grossProfit,
    netProfit,
    allTimeRevenue,
    allTimeExpenses,
    allTimeDepreciation,
    currency: baseCurrency,
    currencyWarnings,
    dataWarnings,
  };
}

// ─── computeBalanceSheet ──────────────────────────────────────────────────────

// Sentinel "beginning of time" start date for the all-time P&L fetch below — this
// deployment has no real data before it, and it's simpler than tracking the actual
// earliest transaction date. Exported so any other "all-time" aggregation (e.g. the
// Retained Earnings monthly drill-down) starts from the exact same point in time as
// computeBalanceSheet's own all-time retained-earnings calculation.
export const ALL_TIME_START = '2000-01-01';

export async function computeBalanceSheet(
  db: DataSource,
  branchFilter: string[],
  asOfDate: string,
  baseCurrency: string,
  invUrl: string,
  pnlAllTime?: { allTimeRevenue: number; allTimeExpenses: number; allTimeDepreciation: number },
): Promise<BalanceSheetResult> {
  const currencyWarnings: string[] = [];
  const dataWarnings: string[] = [];

  const uuidRe = /^[0-9a-f-]{36}$/i;
  const safeBranches = branchFilter.filter((b) => uuidRe.test(b));
  const bParam = safeBranches.length > 0 ? safeBranches : null;
  const bSql = (alias: string, col = '"branchId"') => branchSql(alias, col, bParam);

  // Retained earnings needs a true all-time net income figure, including the
  // cross-service lines (vendor purchases, COGS, labour) that only the period P&L
  // query used to fetch — the all-time queries this function used to run locally
  // only ever summed local tables (expense_entries/invoices/income_entries),
  // silently excluding any cross-service cost. That gap let Accounts Payable
  // (booked against a cross-service vendor purchase) grow with no matching
  // reduction in Retained Earnings, breaking Assets = Liabilities + Equity.
  // Reusing computeProfitAndLoss here (rather than a second copy of its
  // cross-service fetch logic) with an all-time date range keeps this in sync
  // automatically as new expense/revenue sources are added there. Callers may
  // still pass pnlAllTime explicitly to avoid the extra network round trip when
  // they've already computed a period P&L that happens to be all-time.
  const pnlAllTimePromise: Promise<{
    allTimeRevenue: number;
    allTimeExpenses: number;
    allTimeDepreciation: number;
  }> = pnlAllTime
    ? Promise.resolve(pnlAllTime)
    : computeProfitAndLoss(db, branchFilter, ALL_TIME_START, asOfDate, baseCurrency, invUrl).then(
        (pl) => ({
          allTimeRevenue: pl.totalRevenue,
          allTimeExpenses: pl.totalExpenses,
          allTimeDepreciation: pl.depreciationExpense,
        }),
      );

  const rates = await loadExchangeRates(db, baseCurrency);

  type CcyRow = { currency_code: string | null; amount: string };

  // Run all balance sheet queries in parallel
  const [
    cashRows,
    invoiceARRows,
    manualARRows,
    secDepRcvRows,
    equipAssets,
    apRows,
    accruedRows,
    vatCollectedRows,
    vatRemittedRows,
    secDepReceivedRows,
    equityRows,
    customAccountsAll,
    mjAllRows,
    cashBankRowsById,
    deferredRevenueRows,
    prepaidExpensesRows,
  ] = await Promise.all([
    // 1001/1002 Cash in hand and at bank
    db.query<{ type: string; currency_code: string | null; amount: string }[]>(`
      SELECT type, COALESCE(currency, '${baseCurrency}') AS currency_code,
             COALESCE(SUM("currentBalance"), 0) AS amount
      FROM cash_bank_accounts
      WHERE "isActive" = true ${bSql('cash_bank_accounts')}
      GROUP BY type, currency
    `),
    // 1003 Invoice AR — any invoice whose revenue is actually recognized (same
    // population computeProfitAndLoss uses: status NOT IN excluded-list AND
    // type='FINAL' or an active/invoiced/paid PROFORMA contract), minus payments
    // received (both payment tables: payment_transactions + legacy payment_ledgers).
    //
    // Previously this only counted status='INVOICED', but createDirectSale() leaves
    // an unpaid or partially-paid Sale/Product Sale/Spare Part Sale invoice at status
    // 'SENT' permanently (there is no SENT->INVOICED transition for direct sales), and
    // an active Rent/Lease contract sits at 'ACTIVE_CONTRACT'. Revenue for both was
    // already being recognized in the P&L, so excluding them here understated Assets
    // by their full outstanding balance — a real trial-balance mismatch, not just a
    // reporting quirk (Balance Sheet Assets = Liabilities + Equity requires this AR
    // line to track the same population P&L recognizes as revenue).
    //
    // type='OPENING' covers historical-debt opening balance entries (SALE_OUTSTANDING,
    // SERVICE_DEBT, OTHER_DEBT). RENT_CONTRACT/LEASE_CONTRACT opening balance entries
    // create PROFORMA invoices (caught by the PROFORMA+ACTIVE_CONTRACT clause above).
    // Excluding fully-settled OPENING invoices (totalAmount - paid ≤ 0) is handled
    // by the outer SUM — they contribute 0 naturally.
    db.query<CcyRow[]>(`
      SELECT COALESCE(i."currency_code", '${baseCurrency}') AS currency_code,
             COALESCE(SUM(i."totalAmount" - COALESCE(pt.paid, 0)), 0) AS amount
      FROM invoices i
      LEFT JOIN (
        SELECT invoice_id, SUM(paid) AS paid FROM (
          SELECT "invoice_id" AS invoice_id, SUM(amount) AS paid
          FROM payment_transactions
          GROUP BY "invoice_id"
          UNION ALL
          SELECT "invoiceId" AS invoice_id, SUM("amountPaid") AS paid
          FROM payment_ledgers
          GROUP BY "invoiceId"
        ) u GROUP BY invoice_id
      ) pt ON pt.invoice_id = i.id
      WHERE i.status NOT IN ('DRAFT','CANCELLED','EXPIRED','RETAKEN','SUPERSEDED')
        AND (i.type = 'FINAL' OR (i.type = 'PROFORMA' AND i.status IN ('ACTIVE_CONTRACT', 'INVOICED', 'PAID')) OR i.type = 'OPENING')
        AND i."totalAmount" > 0
        AND i."deletedAt" IS NULL
        ${bSql('i')}
      GROUP BY i."currency_code"
    `),
    // 1003 Manual AR — non-security-deposit, without linked invoice
    db.query<{ amount: string }[]>(`
      SELECT COALESCE(SUM(COALESCE(outstanding, amount - COALESCE("amountPaid", 0))), 0) AS amount
      FROM manual_receivables
      WHERE status IN ('PENDING', 'PARTIAL', 'OVERDUE')
        AND type != 'SECURITY_DEPOSIT'
        AND "linkedInvoiceId" IS NULL
        ${bSql('manual_receivables')}
    `),
    // 1004 Security Deposits Receivable (paid TO others, held as asset)
    db.query<{ amount: string }[]>(`
      SELECT COALESCE(SUM(COALESCE(outstanding, amount - COALESCE("amountPaid", 0))), 0) AS amount
      FROM manual_receivables
      WHERE type = 'SECURITY_DEPOSIT'
        AND status NOT IN ('PAID', 'WRITTEN_OFF')
        ${bSql('manual_receivables')}
    `),
    // Equipment assets for NBV calculation
    db.query<
      {
        purchase_price: string;
        salvage_value: string;
        useful_life_months: string;
        annual_depreciation_pct: string;
        method: string;
        purchase_date: string;
        gross_cost: string;
      }[]
    >(`
      SELECT "purchasePrice" AS purchase_price, "salvageValue" AS salvage_value,
             "usefulLifeMonths" AS useful_life_months, "annualDepreciationPct" AS annual_depreciation_pct,
             method, "purchaseDate" AS purchase_date,
             "purchasePrice" AS gross_cost
      FROM asset_depreciation_register
      WHERE status != 'DISPOSED' ${bSql('asset_depreciation_register')}
    `),
    // 2001 Accounts Payable — outstanding manual payables
    // Use COALESCE(outstanding, amount - amountPaid) so that records created without
    // an explicit outstanding snapshot are still counted correctly. Excludes rows
    // linked to a PO (linkedPurchaseId) — those are already tracked via the PO's own
    // outstanding balance, mirroring the 1003 manual-AR exclusion above.
    db.query<{ amount: string }[]>(`
      SELECT COALESCE(SUM(COALESCE(outstanding, amount - COALESCE("amountPaid", 0))), 0) AS amount
      FROM manual_payables
      WHERE status NOT IN ('PAID')
        AND "linkedPurchaseId" IS NULL
        ${bSql('manual_payables')}
    `),
    // 2002 Accrued Expenses — APPROVED but not yet PAID expense entries
    db.query<{ amount: string }[]>(`
      SELECT COALESCE(SUM("netAmount"), 0) AS amount
      FROM expense_entries
      WHERE status = 'APPROVED' ${bSql('expense_entries')}
    `),
    // 2003 VAT Payable — output VAT collected from invoices whose revenue is actually
    // recognized (same population as the 1003 Invoice AR fix above and computeProfitAndLoss)
    // rather than PAID/INVOICED only. VAT becomes due once the sale is made/invoiced, not
    // only once collected — a status filter that misses 'SENT' (the permanent status of an
    // unpaid/partial Direct Sale) understated VAT Payable by the exact tax on every such
    // invoice.
    db.query<CcyRow[]>(`
      SELECT COALESCE("currency_code", '${baseCurrency}') AS currency_code,
             COALESCE(SUM(tax_amount), 0) AS amount
      FROM invoices
      WHERE status NOT IN ('DRAFT','CANCELLED','EXPIRED','RETAKEN','SUPERSEDED')
        AND (type = 'FINAL' OR (type = 'PROFORMA' AND status IN ('ACTIVE_CONTRACT', 'INVOICED', 'PAID')))
        AND tax_amount > 0
        AND "deletedAt" IS NULL
        ${bSql('invoices')}
      GROUP BY "currency_code"
    `),
    // 2003 VAT already remitted to authority (subtract from VAT Payable)
    db.query<{ amount: string }[]>(`
      SELECT COALESCE(SUM("amountRemitted"), 0) AS amount
      FROM vat_remittances
      WHERE 1=1 ${bSql('vat_remittances')}
    `),
    // 2004 Security Deposits Received from customers — on active RENT/LEASE contracts
    db.query<CcyRow[]>(`
      SELECT COALESCE("currency_code", '${baseCurrency}') AS currency_code,
             COALESCE(SUM("securityDepositAmount"), 0) AS amount
      FROM invoices
      WHERE "securityDepositAmount" > 0
        AND "saleType" IN ('RENT', 'LEASE')
        AND status NOT IN ('CANCELLED', 'EXPIRED', 'RETAKEN', 'SUPERSEDED')
        AND "deletedAt" IS NULL
        ${bSql('invoices')}
      GROUP BY "currency_code"
    `),
    // Equity entries — grouped by currency too, so multi-currency entries (e.g. a PKR
    // opening-balance true-up alongside AED ones) get converted to baseCurrency instead
    // of being summed as raw numbers regardless of currency.
    db.query<{ type: string; currency_code: string | null; amount: string }[]>(`
      SELECT type, COALESCE(currency, '${baseCurrency}') AS currency_code, COALESCE(SUM(amount), 0) AS amount
      FROM equity_entries
      WHERE 1=1 ${bSql('equity_entries')}
      GROUP BY type, currency
    `),
    // Custom (non-system) chart-of-accounts rows, all categories — company-wide
    // definitions. ASSET/LIABILITY/EQUITY rows drive the breakdown below;
    // INCOME/EXPENSE rows aren't used here (retained earnings now comes from
    // pnlAllTimePromise, which already folds in custom income/expense itself).
    // Inactive accounts are included so their historical balances remain visible in reports.
    db.query<RawChartOfAccountRow[]>(`
      SELECT id, "accountNumber", "accountName", category, "accountGroup",
             "parentAccountId", "sourceType", "categoryKey", "linkedCashBankAccountId", "isActive"
      FROM chart_of_accounts
      WHERE "isSystemDefault" = false
    `),
    // Manual-journal postings against ANY custom account, cumulative (no date bound
    // — matches the existing equity_entries query's own "WHERE 1=1" precedent).
    db.query<{ chartOfAccountId: string; amount: string }[]>(`
      SELECT "chartOfAccountId", COALESCE(SUM(amount), 0) AS amount
      FROM manual_journal_entries
      WHERE 1=1 ${bSql('manual_journal_entries')}
      GROUP BY "chartOfAccountId"
    `),
    // Per-account cash/bank balances — for CASH_BANK_LINKED custom account display
    db.query<{ id: string; currency: string; currentBalance: string }[]>(`
      SELECT id, currency, "currentBalance"
      FROM cash_bank_accounts
      WHERE "isActive" = true ${bSql('cash_bank_accounts')}
    `),
    // Deferred Revenue MEMO (2005) — unearned advance on active Rent/Lease
    // contracts (advanceAmount minus lifetime advanceAdjusted). Informational
    // only, NOT folded into totalLiabilities below: the full advance is already
    // recognized as revenue at signing (see 4001/4002 above), so adding this as
    // a real liability with nothing offsetting it would break the accounting
    // equation rather than just explain it. Shown for visibility only.
    db.query<CcyRow[]>(`
      SELECT COALESCE(i."currency_code", '${baseCurrency}') AS currency_code,
             COALESCE(SUM(GREATEST(COALESCE(i."advanceAmount", 0) - COALESCE(adv."totalAdvanceAdjusted", 0), 0)), 0) AS amount
      FROM invoices i
      LEFT JOIN (
        SELECT "contractId", SUM(COALESCE("advanceAdjusted", 0)) AS "totalAdvanceAdjusted"
        FROM usage_records GROUP BY "contractId"
      ) adv ON adv."contractId" = i.id
      WHERE i."saleType" IN ('RENT', 'LEASE')
        AND i.status = 'ACTIVE_CONTRACT'
        AND i."deletedAt" IS NULL
        ${bSql('i')}
      GROUP BY i."currency_code"
    `),
    // 1005 Prepaid Expenses — only once actually PAID (cash left the business) is
    // there a real prepaid asset; an APPROVED-but-unpaid prepayment is still just
    // a normal payable (2002 Accrued Expenses already covers that, unchanged).
    // Stays an asset until its covered period ends. Same no-currency-conversion
    // precedent as expense_entries elsewhere in this file.
    db.query<{ amount: string }[]>(`
      SELECT COALESCE(SUM("netAmount"), 0) AS amount
      FROM expense_entries
      WHERE "isPrepayment" = true
        AND status = 'PAID'
        AND "coveredPeriodEnd" >= CURRENT_DATE
        ${bSql('expense_entries')}
    `),
  ]);

  // ── Cash (1001/1002) ─────────────────────────────────────────────────────────
  let cashInHand = 0,
    cashAtBank = 0;
  for (const row of cashRows) {
    const { value, warning } = convertAmt(
      Number(row.amount),
      row.currency_code,
      baseCurrency,
      rates,
    );
    if (warning) {
      if (!currencyWarnings.includes(warning)) currencyWarnings.push(warning);
      continue;
    }
    if (row.type === 'CASH') cashInHand += value;
    else cashAtBank += value;
  }

  // ── AR (1003) ────────────────────────────────────────────────────────────────
  const invoiceAR = aggByCurrency(invoiceARRows, baseCurrency, rates, currencyWarnings);
  const manualAR = Number(manualARRows[0]?.amount ?? 0);
  const accountsReceivable = invoiceAR + manualAR;

  // ── Security deposits receivable (1004) ──────────────────────────────────────
  const securityDepositsReceivable = Number(secDepRcvRows[0]?.amount ?? 0);

  // ── Equipment NBV (1007/1008) ────────────────────────────────────────────────
  let equipmentGrossCost = 0,
    accumulatedDepreciation = 0,
    equipmentNBV = 0;
  for (const a of equipAssets) {
    const gross = Number(a.gross_cost);
    equipmentGrossCost += gross;
    const dep = calculateDepreciation({
      purchasePrice: Number(a.purchase_price),
      salvageValue: Number(a.salvage_value),
      usefulLifeMonths: Number(a.useful_life_months),
      annualDepreciationPct: Number(a.annual_depreciation_pct),
      method: a.method as 'STRAIGHT_LINE' | 'DECLINING_BALANCE',
      purchaseDate: new Date(a.purchase_date),
    });
    accumulatedDepreciation += dep.accumulated;
    equipmentNBV += dep.nbv;
  }

  // ── Inventory value (1006/1009) — cross-service ──────────────────────────────
  const branchQs = bParam ? `?branchIds=${bParam.join(',')}` : '';
  const [invValueData, prodInvData] = await Promise.all([
    internalGet<{ total: number; currency: string }>(
      `${invUrl}/spare-parts/inventory-value${branchQs}`,
    ),
    internalGet<{ total: number }>(`${invUrl}/products/inventory-value${branchQs}`),
  ]);

  let sparePartsInventory = 0;
  let productInventory = 0;
  let inventoryUnavailable = false;

  if (invValueData === null) {
    inventoryUnavailable = true;
    dataWarnings.push(
      '1006: Inventory service unavailable — spare parts inventory value could not be fetched. Balance sheet total assets will be understated.',
    );
  } else {
    const { value, warning } = convertAmt(
      invValueData.total ?? 0,
      invValueData.currency ?? baseCurrency,
      baseCurrency,
      rates,
    );
    if (warning) currencyWarnings.push(warning);
    else sparePartsInventory = value;
  }

  if (prodInvData !== null) {
    productInventory = prodInvData.total ?? 0;
  }

  // ── Vendor purchases payable — cross-service ─────────────────────────────────
  // The Payable page's frontend merges manual_payables with vendor Purchase Orders
  // (POs), but this Balance Sheet line used to sum only manual_payables — a real PO
  // with an outstanding balance would show correctly on the Payable page yet never
  // appear here, permanently drifting the two apart. Mirrors the inventory-value
  // cross-service pattern above.
  const purchasePayableData = await internalGet<{
    currencyGroups: { currencyCode: string; outstanding: number }[];
  }>(`${invUrl}/purchases/internal/payable-summary${branchQs}`);
  let vendorPurchasesPayable = 0;
  if (purchasePayableData === null) {
    dataWarnings.push(
      '2001: Inventory service unavailable — outstanding vendor purchases could not be fetched. Accounts Payable will be understated.',
    );
  } else {
    for (const grp of purchasePayableData.currencyGroups ?? []) {
      const { value, warning } = convertAmt(grp.outstanding, grp.currencyCode, baseCurrency, rates);
      if (warning) {
        if (!currencyWarnings.includes(warning)) currencyWarnings.push(warning);
      } else vendorPurchasesPayable += value;
    }
  }

  // ── Liabilities ──────────────────────────────────────────────────────────────
  const accountsPayable = Number(apRows[0]?.amount ?? 0) + vendorPurchasesPayable;
  const accruedExpenses = Number(accruedRows[0]?.amount ?? 0);

  // Input VAT (Local) + Reverse Charge VAT (International) reclaimable — cross-service,
  // all-time (no date range: this is a point-in-time balance, same as vatCollected below).
  // Previously vatPayable only subtracted remittances from Output VAT collected, never
  // netting the input VAT the business is entitled to reclaim — overstating what's owed
  // to the tax authority by the full amount of that credit.
  const vatCreditData = await internalGet<{
    currencyGroups: {
      currencyCode: string;
      inputVatAmount: number;
      reverseChargeVatAmount: number;
    }[];
  }>(`${invUrl}/purchases/internal/cost-report`);
  let inputVatReclaimable = 0;
  if (vatCreditData === null) {
    dataWarnings.push(
      '2003: Inventory service unavailable — Input/Reverse Charge VAT could not be fetched. VAT Payable will be overstated.',
    );
  } else {
    for (const grp of vatCreditData.currencyGroups ?? []) {
      const ivResult = convertAmt(grp.inputVatAmount, grp.currencyCode, baseCurrency, rates);
      const rcResult = convertAmt(
        grp.reverseChargeVatAmount,
        grp.currencyCode,
        baseCurrency,
        rates,
      );
      if (ivResult.warning) {
        if (!currencyWarnings.includes(ivResult.warning)) currencyWarnings.push(ivResult.warning);
      } else inputVatReclaimable += ivResult.value;
      if (rcResult.warning) {
        if (!currencyWarnings.includes(rcResult.warning)) currencyWarnings.push(rcResult.warning);
      } else inputVatReclaimable += rcResult.value;
    }
  }

  const vatCollected = aggByCurrency(vatCollectedRows, baseCurrency, rates, currencyWarnings);
  const vatRemitted = Number(vatRemittedRows[0]?.amount ?? 0);
  // Net owed to the authority = Output VAT collected − Input VAT credit − Reverse Charge
  // credit, minus whatever's already been remitted for prior periods. Deliberately NOT
  // clamped to 0 — this used to hide the true net position (e.g. input credit exceeding
  // output collected) behind a flat 0.00, while the VAT Payable drill-down summed the
  // exact same three components with no clamp and showed the real, negative figure. A
  // negative value here means the authority owes the business money (a net recoverable
  // position), not that anything is broken — the headline and the drill-down must agree,
  // and the drill-down was the one telling the truth.
  const vatPayable = vatCollected - inputVatReclaimable - vatRemitted;

  const securityDepositsReceived = aggByCurrency(
    secDepReceivedRows,
    baseCurrency,
    rates,
    currencyWarnings,
  );

  const deferredRevenue = 0;
  // Informational only — see the query comment above for why this isn't folded
  // into totalLiabilities.
  const deferredRevenueMemo = aggByCurrency(
    deferredRevenueRows,
    baseCurrency,
    rates,
    currencyWarnings,
  );

  // 2006 Salary Payable — outstanding SALARY_PAYABLE manual payables
  const salaryPayableRows = await db.query<{ amount: string }[]>(`
    SELECT COALESCE(SUM(COALESCE(outstanding, amount - COALESCE("amountPaid", 0))), 0) AS amount
    FROM manual_payables
    WHERE type = 'SALARY_PAYABLE'
      AND status NOT IN ('PAID') ${bSql('manual_payables')}
  `);
  const salaryPayable = Number(salaryPayableRows[0]?.amount ?? 0);

  // ── Equity ───────────────────────────────────────────────────────────────────
  const eqByType: Record<string, number> = {};
  for (const row of equityRows) {
    const { value, warning } = convertAmt(
      Number(row.amount),
      row.currency_code,
      baseCurrency,
      rates,
    );
    if (warning) {
      if (!currencyWarnings.includes(warning)) currencyWarnings.push(warning);
      continue;
    }
    eqByType[row.type] = (eqByType[row.type] ?? 0) + value;
  }
  // OPENING_BALANCE_EQUITY entries are what give a cash/bank account's seeded
  // openingBalance a documented origin in the double-entry system (see
  // createCashBankAccount) — folded into Owner Capital, same as a real capital
  // contribution, since that's what an opening balance represents once traced back.
  const ownerCapital =
    (eqByType['SHARE_CAPITAL'] ?? 0) +
    (eqByType['OWNER_CONTRIBUTION'] ?? 0) +
    (eqByType['OPENING_BALANCE_EQUITY'] ?? 0);
  const reserves = eqByType['RESERVES'] ?? 0;
  const withdrawals = eqByType['WITHDRAWAL'] ?? 0;
  const dividends = eqByType['DIVIDEND'] ?? 0;

  // ── Custom (non-system) ASSET/LIABILITY/EQUITY chart-of-accounts rows ─────────
  const mjByAccountBS: Record<string, number> = {};
  for (const row of mjAllRows) mjByAccountBS[row.chartOfAccountId] = Number(row.amount);
  const cashBankById: Record<string, { balance: number; currency: string }> = {};
  for (const row of cashBankRowsById) {
    cashBankById[row.id] = { balance: Number(row.currentBalance), currency: row.currency };
  }

  const customAssetBreakdown: CustomAccountBalance[] = [];
  const customLiabilityBreakdown: CustomAccountBalance[] = [];
  const customEquityBreakdown: CustomAccountBalance[] = [];
  let customCurrentAssetTotal = 0;
  let customNonCurrentAssetTotal = 0;
  let customCurrentLiabilityTotal = 0;
  let customNonCurrentLiabilityTotal = 0;
  let customEquityTotal = 0;
  for (const acc of customAccountsAll) {
    if (acc.category !== 'ASSET' && acc.category !== 'LIABILITY' && acc.category !== 'EQUITY')
      continue;
    let amount = 0;
    if (acc.sourceType === 'MANUAL_JOURNAL') {
      amount = mjByAccountBS[acc.id] ?? 0;
    } else if (acc.sourceType === 'CASH_BANK_LINKED' && acc.linkedCashBankAccountId) {
      const linked = cashBankById[acc.linkedCashBankAccountId];
      if (linked) {
        const { value, warning } = convertAmt(linked.balance, linked.currency, baseCurrency, rates);
        if (warning) {
          if (!currencyWarnings.includes(warning)) currencyWarnings.push(warning);
        } else {
          amount = value;
        }
      }
    }
    const entry: CustomAccountBalance = {
      id: acc.id,
      accountNumber: acc.accountNumber,
      accountName: acc.accountName,
      category: acc.category,
      accountGroup: acc.accountGroup,
      parentAccountId: acc.parentAccountId,
      sourceType: acc.sourceType,
      amount,
      isActive: acc.isActive,
    };
    // CASH_BANK_LINKED balances are already inside cashInHand/cashAtBank above —
    // shown here for nested display only, never re-added to the totals.
    const includeInTotal = acc.sourceType !== 'CASH_BANK_LINKED';
    if (acc.category === 'ASSET') {
      customAssetBreakdown.push(entry);
      if (includeInTotal) {
        if (acc.accountGroup === 'NON_CURRENT_ASSET') customNonCurrentAssetTotal += amount;
        else customCurrentAssetTotal += amount;
      }
    } else if (acc.category === 'LIABILITY') {
      customLiabilityBreakdown.push(entry);
      if (includeInTotal) {
        if (acc.accountGroup === 'NON_CURRENT_LIABILITY') customNonCurrentLiabilityTotal += amount;
        else customCurrentLiabilityTotal += amount;
      }
    } else {
      customEquityBreakdown.push(entry);
      if (includeInTotal) customEquityTotal += amount;
    }
  }

  // 3002 Retained Earnings — auto-computed from all-time P&L (canonical formula).
  // pnlAllTimePromise (kicked off at the top of this function) already folds in
  // custom income/expense AND cross-service costs (vendor purchases/COGS/labour),
  // so no further additions are needed here. Note: allTimeExpenses (= computeProfitAndLoss's
  // totalExpenses) already has depreciationExpense summed into it — subtracting
  // allTimeDepreciation again here would double-count it. allTimeDepreciation is kept on
  // the type for callers that want it reported separately, just not subtracted twice.
  const { allTimeRevenue: atRevenue, allTimeExpenses: atExpenses } = await pnlAllTimePromise;
  const retainedEarnings = atRevenue - atExpenses;

  // ── Totals ───────────────────────────────────────────────────────────────────
  const prepaidExpenses = Number(prepaidExpensesRows[0]?.amount ?? 0);
  const totalCurrentAssets =
    cashInHand +
    cashAtBank +
    accountsReceivable +
    securityDepositsReceivable +
    prepaidExpenses +
    sparePartsInventory +
    productInventory +
    customCurrentAssetTotal;
  const totalNonCurrentAssets = equipmentNBV + customNonCurrentAssetTotal;
  const totalAssets = totalCurrentAssets + totalNonCurrentAssets;

  const totalCurrentLiabilities =
    accountsPayable +
    accruedExpenses +
    vatPayable +
    securityDepositsReceived +
    deferredRevenue +
    salaryPayable +
    customCurrentLiabilityTotal;
  const totalNonCurrentLiabilities = customNonCurrentLiabilityTotal;
  const totalLiabilities = totalCurrentLiabilities + totalNonCurrentLiabilities;

  const totalEquity =
    ownerCapital + retainedEarnings + reserves - withdrawals - dividends + customEquityTotal;
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
  const difference = Math.abs(totalAssets - totalLiabilitiesAndEquity);
  const isBalanced = difference < 0.01;

  return {
    cashInHand,
    cashAtBank,
    invoiceAR,
    manualAR,
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
    deferredRevenueMemo,
    salaryPayable,
    ownerCapital,
    retainedEarnings,
    reserves,
    withdrawals,
    dividends,
    customAssets: customAssetBreakdown,
    customLiabilities: customLiabilityBreakdown,
    customEquity: customEquityBreakdown,
    totalCurrentAssets,
    totalNonCurrentAssets,
    totalAssets,
    totalCurrentLiabilities,
    totalNonCurrentLiabilities,
    totalLiabilities,
    totalEquity,
    totalLiabilitiesAndEquity,
    difference,
    isBalanced,
    currency: baseCurrency,
    currencyWarnings,
    dataWarnings,
  };
}
