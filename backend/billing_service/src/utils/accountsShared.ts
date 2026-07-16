/**
 * Shared accounting computation functions.
 * Single source of truth for P&L and Balance Sheet calculations.
 * All endpoints (branch-level and consolidated) call these — never duplicate the math.
 */

import { DataSource } from 'typeorm';
import { calculateDepreciation } from './depreciation';

// ─── Types ────────────────────────────────────────────────────────────────────

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
  totalExpenses: number;

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
  vatPayable: number; // output VAT collected minus remitted
  securityDepositsReceived: number;
  deferredRevenue: number;
  salaryPayable: number;

  // Equity
  ownerCapital: number;
  retainedEarnings: number; // auto-computed: allTimeRevenue - allTimeExpenses - allTimeDepreciation
  reserves: number;
  dividends: number;
  withdrawals: number;

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
  ] = await Promise.all([
    // 4001 Rental Revenue — RENT invoices (period-filtered)
    db.query<CcyRow[]>(`
      SELECT COALESCE("currency_code", '${baseCurrency}') AS currency_code,
             COALESCE(SUM("totalAmount" - COALESCE(tax_amount, 0)), 0) AS amount
      FROM invoices i
      WHERE "saleType" = 'RENT'
        AND status NOT IN (${EXCL_STATUS})
        AND ${VALID_INVOICES}
        AND CAST("createdAt" AS DATE) BETWEEN '${dateFrom}' AND '${dateTo}'
        AND "deletedAt" IS NULL
        ${bSql}
      GROUP BY "currency_code"
    `),
    // 4002 Lease Revenue
    db.query<CcyRow[]>(`
      SELECT COALESCE("currency_code", '${baseCurrency}') AS currency_code,
             COALESCE(SUM("totalAmount" - COALESCE(tax_amount, 0)), 0) AS amount
      FROM invoices i
      WHERE "saleType" = 'LEASE'
        AND status NOT IN (${EXCL_STATUS})
        AND ${VALID_INVOICES}
        AND CAST("createdAt" AS DATE) BETWEEN '${dateFrom}' AND '${dateTo}'
        AND "deletedAt" IS NULL
        ${bSql}
      GROUP BY "currency_code"
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
    // Expenses by category — APPROVED or PAID, period-filtered
    db.query<{ category: string; amount: string }[]>(`
      SELECT category, COALESCE(SUM("netAmount"), 0) AS amount
      FROM expense_entries e
      WHERE status IN ('APPROVED', 'PAID')
        AND date BETWEEN '${dateFrom}' AND '${dateTo}'
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
    // All-time revenue — for retained earnings (no date filter, no type exclusion except CANCELLED)
    db.query<CcyRow[]>(`
      SELECT COALESCE("currency_code", '${baseCurrency}') AS currency_code,
             COALESCE(SUM("totalAmount" - COALESCE(tax_amount, 0)), 0) AS amount
      FROM invoices inv
      WHERE status NOT IN ('DRAFT', 'CANCELLED', 'EXPIRED', 'RETAKEN', 'SUPERSEDED')
        AND ${VALID_INVOICES}
        AND "deletedAt" IS NULL
        ${bSqlAllInv}
      GROUP BY "currency_code"
    `),
    // All-time expenses — for retained earnings
    db.query<{ amount: string }[]>(`
      SELECT COALESCE(SUM("netAmount"), 0) AS amount
      FROM expense_entries ex
      WHERE status IN ('APPROVED', 'PAID')
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

  const depreciationExpense = Number(depAmount[0]?.amount ?? 0);

  // 5001 COGS — spare parts consumed in completed service tickets (cross-service)
  const cogsUrl = `${invUrl}/service/internal/cogs-report?${bParam ? `branchIds=${bParam.join(',')}` : ''}&dateFrom=${dateFrom}&dateTo=${dateTo}`;
  const cogsData = await internalGet<{ cogsAmount: number; labourAmount: number }>(cogsUrl);
  const crossServiceCogs = cogsData?.cogsAmount ?? 0;
  const crossServiceLabour = cogsData?.labourAmount ?? 0;
  if (!cogsData)
    dataWarnings.push(
      '5001/5002: Inventory service unavailable — spare parts consumed and service labour may be understated (manual expense entries still counted).',
    );

  // 5004/5005/5014/5015 — vendor purchase costs from Inventory service purchases
  const purchaseCostUrl = `${invUrl}/purchases/internal/cost-report?${bParam ? `branchIds=${bParam.join(',')}` : ''}&dateFrom=${dateFrom}&dateTo=${dateTo}`;
  const purchaseCostData = await internalGet<{
    currencyGroups: {
      currencyCode: string;
      purchaseCost: number;
      shippingHandling: number;
      importLabourCost: number;
      customsDuty: number;
    }[];
  }>(purchaseCostUrl);
  let crossServiceVendorPurchases = 0;
  let crossServiceShipping = 0;
  let crossServiceImportLabour = 0;
  let crossServiceCustomsDuty = 0;
  if (!purchaseCostData) {
    dataWarnings.push(
      '5004/5005/5014/5015: Inventory service unavailable — purchase costs, shipping, import labour and customs duty may be understated (manual expense entries still counted).',
    );
  } else {
    for (const grp of purchaseCostData.currencyGroups ?? []) {
      const pcResult = convertAmt(grp.purchaseCost, grp.currencyCode, baseCurrency, rates);
      const shResult = convertAmt(grp.shippingHandling, grp.currencyCode, baseCurrency, rates);
      const ilResult = convertAmt(grp.importLabourCost, grp.currencyCode, baseCurrency, rates);
      const cdResult = convertAmt(grp.customsDuty, grp.currencyCode, baseCurrency, rates);
      if (pcResult.warning) {
        if (!currencyWarnings.includes(pcResult.warning)) currencyWarnings.push(pcResult.warning);
      } else crossServiceVendorPurchases += pcResult.value;
      if (shResult.warning) {
        if (!currencyWarnings.includes(shResult.warning)) currencyWarnings.push(shResult.warning);
      } else crossServiceShipping += shResult.value;
      if (ilResult.warning) {
        if (!currencyWarnings.includes(ilResult.warning)) currencyWarnings.push(ilResult.warning);
      } else crossServiceImportLabour += ilResult.value;
      if (cdResult.warning) {
        if (!currencyWarnings.includes(cdResult.warning)) currencyWarnings.push(cdResult.warning);
      } else crossServiceCustomsDuty += cdResult.value;
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
  // 5015: purchases.customs_duty + manual expense entries CUSTOMS_DUTY — expensed directly per
  // business decision (not capitalized into inventory 1006/1009).
  const customsDuty = crossServiceCustomsDuty + (expMap['CUSTOMS_DUTY'] ?? 0);

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
  let otherExpenses = expMap['OTHER'] ?? 0;
  for (const [cat, amt] of Object.entries(expMap)) {
    if (!KNOWN_CATEGORIES.has(cat)) otherExpenses += amt;
  }

  const totalRevenue =
    rentalRevenue +
    leaseRevenue +
    salesRevenue +
    serviceRevenue +
    amcSmaRevenue +
    sparePartSalesRevenue +
    usageRevenue;

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
    otherExpenses;

  const grossProfit = totalRevenue - costOfParts - labourCost;
  const netProfit = totalRevenue - totalExpenses;

  // All-time totals for retained earnings
  const allTimeRevenue = aggByCurrency(allTimeRevRows, baseCurrency, rates, currencyWarnings);
  const allTimeExpenses = Number(allTimeExpAmount[0]?.amount ?? 0);
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
    otherExpenses,
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

export async function computeBalanceSheet(
  db: DataSource,
  branchFilter: string[],
  _asOfDate: string,
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
    allTimeRevRows,
    allTimeExpRows,
    allTimeDepRows,
  ] = await Promise.all([
    // 1001/1002 Cash in hand and at bank
    db.query<{ type: string; currency_code: string | null; amount: string }[]>(`
      SELECT type, COALESCE(currency, '${baseCurrency}') AS currency_code,
             COALESCE(SUM("currentBalance"), 0) AS amount
      FROM cash_bank_accounts
      WHERE "isActive" = true ${bSql('cash_bank_accounts')}
      GROUP BY type, currency
    `),
    // 1003 Invoice AR — INVOICED invoices minus payments received (both payment
    // tables: payment_transactions + legacy payment_ledgers)
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
      WHERE i.status = 'INVOICED'
        AND i."totalAmount" > 0
        AND i."deletedAt" IS NULL
        ${bSql('i')}
      GROUP BY i."currency_code"
    `),
    // 1003 Manual AR — non-security-deposit, without linked invoice
    db.query<{ amount: string }[]>(`
      SELECT COALESCE(SUM(outstanding), 0) AS amount
      FROM manual_receivables
      WHERE status IN ('PENDING', 'PARTIAL', 'OVERDUE')
        AND type != 'SECURITY_DEPOSIT'
        AND "linkedInvoiceId" IS NULL
        ${bSql('manual_receivables')}
    `),
    // 1004 Security Deposits Receivable (paid TO others, held as asset)
    db.query<{ amount: string }[]>(`
      SELECT COALESCE(SUM(outstanding), 0) AS amount
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
    db.query<{ amount: string }[]>(`
      SELECT COALESCE(SUM(outstanding), 0) AS amount
      FROM manual_payables
      WHERE status != 'PAID' ${bSql('manual_payables')}
    `),
    // 2002 Accrued Expenses — APPROVED but not yet PAID expense entries
    db.query<{ amount: string }[]>(`
      SELECT COALESCE(SUM("netAmount"), 0) AS amount
      FROM expense_entries
      WHERE status = 'APPROVED' ${bSql('expense_entries')}
    `),
    // 2003 VAT Payable — output VAT collected from PAID/INVOICED invoices (will subtract remitted below)
    db.query<CcyRow[]>(`
      SELECT COALESCE("currency_code", '${baseCurrency}') AS currency_code,
             COALESCE(SUM(tax_amount), 0) AS amount
      FROM invoices
      WHERE status IN ('PAID', 'INVOICED')
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
    // Equity entries
    db.query<{ type: string; amount: string }[]>(`
      SELECT type, COALESCE(SUM(amount), 0) AS amount
      FROM equity_entries
      WHERE 1=1 ${bSql('equity_entries')}
      GROUP BY type
    `),
    // All-time revenue for retained earnings
    db.query<CcyRow[]>(`
      SELECT COALESCE("currency_code", '${baseCurrency}') AS currency_code,
             COALESCE(SUM("totalAmount" - COALESCE(tax_amount, 0)), 0) AS amount
      FROM invoices
      WHERE status NOT IN ('DRAFT', 'CANCELLED', 'EXPIRED', 'RETAKEN', 'SUPERSEDED')
        AND type NOT IN ('QUOTATION', 'PROFORMA', 'OPENING')
        AND "deletedAt" IS NULL
        ${bSql('invoices')}
      GROUP BY "currency_code"
    `),
    // All-time expenses for retained earnings
    db.query<{ amount: string }[]>(`
      SELECT COALESCE(SUM("netAmount"), 0) AS amount
      FROM expense_entries
      WHERE status IN ('APPROVED', 'PAID') ${bSql('expense_entries')}
    `),
    // All-time depreciation for retained earnings
    db.query<{ amount: string }[]>(`
      SELECT COALESCE(SUM("totalAmount"), 0) AS amount
      FROM depreciation_journal_entries
      WHERE status = 'POSTED' ${bSql('depreciation_journal_entries')}
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

  // ── Liabilities ──────────────────────────────────────────────────────────────
  const accountsPayable = Number(apRows[0]?.amount ?? 0);
  const accruedExpenses = Number(accruedRows[0]?.amount ?? 0);

  const vatCollected = aggByCurrency(vatCollectedRows, baseCurrency, rates, currencyWarnings);
  const vatRemitted = Number(vatRemittedRows[0]?.amount ?? 0);
  const vatPayable = Math.max(0, vatCollected - vatRemitted);

  const securityDepositsReceived = aggByCurrency(
    secDepReceivedRows,
    baseCurrency,
    rates,
    currencyWarnings,
  );

  const deferredRevenue = 0;
  const salaryPayable = 0;

  // ── Equity ───────────────────────────────────────────────────────────────────
  const eqByType: Record<string, number> = {};
  for (const row of equityRows) {
    eqByType[row.type] = Number(row.amount);
  }
  const ownerCapital = (eqByType['SHARE_CAPITAL'] ?? 0) + (eqByType['OWNER_CONTRIBUTION'] ?? 0);
  const reserves = eqByType['RESERVES'] ?? 0;
  const withdrawals = 0;
  const dividends = eqByType['DIVIDEND'] ?? 0;

  // 3002 Retained Earnings — auto-computed from all-time P&L (canonical formula)
  const atRevenue =
    pnlAllTime?.allTimeRevenue ??
    aggByCurrency(allTimeRevRows, baseCurrency, rates, currencyWarnings);
  const atExpenses = pnlAllTime?.allTimeExpenses ?? Number(allTimeExpRows[0]?.amount ?? 0);
  const atDepreciation = pnlAllTime?.allTimeDepreciation ?? Number(allTimeDepRows[0]?.amount ?? 0);
  const retainedEarnings = atRevenue - atExpenses - atDepreciation;

  // ── Totals ───────────────────────────────────────────────────────────────────
  const prepaidExpenses = 0;
  const totalCurrentAssets =
    cashInHand +
    cashAtBank +
    accountsReceivable +
    securityDepositsReceivable +
    prepaidExpenses +
    sparePartsInventory +
    productInventory;
  const totalNonCurrentAssets = equipmentNBV;
  const totalAssets = totalCurrentAssets + totalNonCurrentAssets;

  const totalCurrentLiabilities =
    accountsPayable +
    accruedExpenses +
    vatPayable +
    securityDepositsReceived +
    deferredRevenue +
    salaryPayable;
  const totalNonCurrentLiabilities = 0;
  const totalLiabilities = totalCurrentLiabilities + totalNonCurrentLiabilities;

  const totalEquity = ownerCapital + retainedEarnings + reserves - withdrawals - dividends;
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
    salaryPayable,
    ownerCapital,
    retainedEarnings,
    reserves,
    withdrawals,
    dividends,
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
