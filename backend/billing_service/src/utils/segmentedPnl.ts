/**
 * Segmented Profit & Loss — profitability by revenue segment (Sale/Rent/Lease and
 * their sub-types) and, per segment, by individual product or contract.
 *
 * Reuses fetchRevenueRows/subCategoryOf from revenueBreakdown.ts as the row
 * source for segment Revenue — the exact same rows the Chart of Accounts Revenue
 * drill-down sums for its 4001/4002 Rental/Lease Revenue lines. One deliberate
 * addition on top: each RENT/LEASE row's `exceededCharge` (usage/overage billing)
 * is folded into segment revenue here (see sumConvertedRows/fetchContractRows
 * below), even though the CoA drill-down leaves it out of 4001/4002 by design
 * (it belongs to the separate 4005 Usage/Copy Revenue line there, which isn't
 * split by plan type). Without this, CPC/CPC_COMBO plans — which bill 100% of
 * their revenue as exceededCharge and carry no monthlyRent at all — would always
 * show zero revenue here, even with real, cash-collected usage billing behind
 * them. So segment Revenue = CoA 4001/4002 drill-down base + that segment's
 * share of 4005 usage revenue; the two are related but no longer identical.
 *
 * Direct cost is genuinely traceable for some segments and not others — see
 * CostBasis on each segment. This was investigated and confirmed against the
 * real schema/data before building (not assumed):
 *   - Product Sale: invoice_items.productId reliably identifies the exact unit
 *     sold; its purchase_price is real but manually entered (data-quality risk,
 *     not a linkage gap) — marked ACTUAL.
 *   - Spare Part Sale: spare_parts.purchase_price is a single stale "first cost"
 *     per SKU, never updated on restock — no per-unit/batch cost exists. Marked
 *     APPROXIMATE (quantity × current SKU cost).
 *   - Rent/Lease: product_allocations links a contract to a specific machine,
 *     but is optional/unenforced at contract creation. Where an allocation DOES
 *     exist, direct cost = that machine's own depreciation (asset_depreciation_register,
 *     prorated to the allocation's overlap with the period) + its service/labour
 *     cost (ven_inv_service, grouped by productId). Where no allocation, or no
 *     depreciation/service record exists for the allocated machine, marked
 *     UNAVAILABLE — never silently shown as a real zero.
 *
 * Indirect/overhead costs (Salary, Rent, Utilities, Marketing, Maintenance,
 * Insurance, Import Labour, Customs Duty, Other) are allocated pro-rata by each
 * segment's share of total revenue — labeled as an ALLOCATED ESTIMATE, not a
 * traced cost, on every segment.
 */

import { DataSource } from 'typeorm';
import { convertAmt, loadExchangeRates, computeProfitAndLoss } from './accountsShared';
import { calculateDepreciation } from './depreciation';
import {
  fetchRevenueRows,
  subCategoryOf,
  type RevenueTopCategory,
  type RevenueRow,
} from './revenueBreakdown';

export const PLAN_TYPES = ['FIXED_LIMIT', 'FIXED_COMBO', 'FIXED_FLAT', 'CPC', 'CPC_COMBO'] as const;
export const PLAN_TYPE_LABELS: Record<string, string> = {
  FIXED_LIMIT: 'Fixed Limit',
  FIXED_COMBO: 'Fixed Combo',
  FIXED_FLAT: 'Fixed Flat Rate',
  CPC: 'CPC',
  CPC_COMBO: 'CPC Combo',
};

export type CostBasis = 'ACTUAL' | 'APPROXIMATE' | 'UNAVAILABLE';

export interface SegmentPnl {
  key: string; // 'PRODUCT_SALE' | 'SPAREPART_SALE' | plan type | 'EMI' | `FSM_${planType}`
  label: string;
  topCategory: RevenueTopCategory;
  revenue: number;
  directCost: number;
  directCostBasis: CostBasis;
  directCostNote: string;
  grossProfit: number;
  allocatedOverhead: number;
  netProfit: number;
  grossMarginPct: number | null;
  netMarginPct: number | null;
  invoiceIds: string[]; // for the "View Source" revenue drill-down and per-product/contract detail
}

export interface SegmentedPnlResult {
  segments: SegmentPnl[];
  totalRevenue: number;
  totalDirectCost: number;
  totalGrossProfit: number;
  totalAllocatedOverhead: number;
  totalNetProfit: number;
  overheadPool: number;
  currency: string;
  currencyWarnings: string[];
  dataWarnings: string[];
}

async function internalCall<T>(
  url: string,
  method: 'GET' | 'POST' = 'GET',
  body?: unknown,
): Promise<T | null> {
  try {
    const { sign } = await import('jsonwebtoken');
    const token = sign(
      { userId: 'billing_service', role: 'ADMIN' },
      process.env.ACCESS_SECRET as string,
      { expiresIn: '1m' },
    );
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      method,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        'x-internal-service': 'billing',
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function sumConvertedRows(
  rows: RevenueRow[],
  baseCurrency: string,
  rates: Map<string, number>,
  currencyWarnings: string[],
): number {
  let total = 0;
  for (const row of rows) {
    // exceededCharge is null for SALE rows and RENT/LEASE advance rows, and the
    // real usage/overage amount for RENT/LEASE usage-period rows — see the
    // file-level comment above for why it's included here.
    const rowAmount = row.amount + (row.exceededCharge ?? 0);
    const { value, warning } = convertAmt(rowAmount, row.currencyCode, baseCurrency, rates);
    if (warning) {
      if (!currencyWarnings.includes(warning)) currencyWarnings.push(warning);
      continue;
    }
    total += value;
  }
  return total;
}

// ─── Sale direct cost: invoice_items → products/spare_parts unit cost ─────────

interface SaleCostResult {
  cost: number;
  basis: CostBasis;
  note: string;
}

async function computeSaleDirectCosts(
  db: DataSource,
  invUrl: string,
  invoiceIds: string[],
): Promise<{ productSale: SaleCostResult; sparePartSale: SaleCostResult }> {
  const unavailable = (note: string): SaleCostResult => ({ cost: 0, basis: 'UNAVAILABLE', note });

  if (invoiceIds.length === 0) {
    return {
      productSale: { cost: 0, basis: 'ACTUAL', note: 'No Product Sale invoices in this period.' },
      sparePartSale: {
        cost: 0,
        basis: 'ACTUAL',
        note: 'No Spare Part Sale invoices in this period.',
      },
    };
  }

  const items = await db.query<
    {
      invoiceId: string;
      itemType: string;
      productId: string | null;
      sparePartId: string | null;
      quantity: number;
    }[]
  >(
    `
    SELECT "invoiceId", "itemType", "productId", "sparePartId", COALESCE(quantity, 1) AS quantity
    FROM invoice_items
    WHERE "invoiceId" = ANY($1)
      AND "deletedAt" IS NULL
      AND (
        ("itemType" = 'PRODUCT' AND "productId" IS NOT NULL)
        OR ("itemType" = 'SPARE_PART' AND "sparePartId" IS NOT NULL)
      )
    `,
    [invoiceIds],
  );

  const productItems = items.filter((i) => i.itemType === 'PRODUCT');
  const sparePartItems = items.filter((i) => i.itemType === 'SPARE_PART');
  const productIds = [...new Set(productItems.map((i) => i.productId as string))];
  const sparePartIds = [...new Set(sparePartItems.map((i) => i.sparePartId as string))];

  const [productCostData, sparePartCostData] = await Promise.all([
    productIds.length
      ? internalCall<{
          success: boolean;
          data: { id: string; purchase_price: string | number | null }[];
        }>(`${invUrl}/products/batch`, 'POST', { productIds })
      : null,
    sparePartIds.length
      ? internalCall<{
          success: boolean;
          data: { id: string; purchase_price: string | number | null }[];
        }>(`${invUrl}/spare-parts/batch`, 'POST', { sparePartIds })
      : null,
  ]);

  if (productIds.length > 0 && !productCostData) {
    return {
      productSale: unavailable(
        'Inventory service unavailable — could not fetch product purchase prices for cost matching.',
      ),
      sparePartSale:
        sparePartIds.length > 0 && !sparePartCostData
          ? unavailable('Inventory service unavailable — could not fetch spare part costs.')
          : {
              cost: 0,
              basis: 'APPROXIMATE',
              note: 'Average-cost approximation (current SKU purchase price).',
            },
    };
  }

  const productCostMap = new Map(
    (productCostData?.data ?? []).map((p) => [p.id, Number(p.purchase_price ?? 0)]),
  );
  const sparePartCostMap = new Map(
    (sparePartCostData?.data ?? []).map((p) => [p.id, Number(p.purchase_price ?? 0)]),
  );

  let productSaleCost = 0;
  let productsMissingCost = 0;
  for (const item of productItems) {
    const cost = productCostMap.get(item.productId as string);
    if (cost === undefined) {
      productsMissingCost += 1;
      continue;
    }
    productSaleCost += cost * Number(item.quantity || 1);
  }

  let sparePartSaleCost = 0;
  for (const item of sparePartItems) {
    const cost = sparePartCostMap.get(item.sparePartId as string) ?? 0;
    sparePartSaleCost += cost * Number(item.quantity || 1);
  }

  const productBasis: CostBasis = productItems.length === 0 ? 'ACTUAL' : 'ACTUAL';
  const productNote =
    productsMissingCost > 0
      ? `${productsMissingCost} of ${productItems.length} sold unit(s) have no purchase price on record — their cost is excluded, so this figure is understated.`
      : 'Actual purchase price of the exact unit(s) sold (invoice_items.productId → products.purchase_price).';

  return {
    productSale: {
      cost: productSaleCost,
      basis:
        productsMissingCost > 0 && productsMissingCost === productItems.length
          ? 'UNAVAILABLE'
          : productBasis,
      note: productNote,
    },
    sparePartSale: {
      cost: sparePartSaleCost,
      basis: sparePartIds.length === 0 ? 'ACTUAL' : 'APPROXIMATE',
      note:
        sparePartIds.length === 0
          ? 'No Spare Part Sale invoices in this period.'
          : 'Average-cost approximation — spare_parts.purchase_price is a single "first cost" per SKU, never updated on restock, so this is not a true per-unit cost.',
    },
  };
}

// ─── Rent/Lease direct cost: product_allocations → depreciation + service cost ─

interface MachineCostResult {
  cost: number;
  basis: CostBasis;
  note: string;
  allocatedContracts: number;
}

const MS_PER_DAY = 86400000;
const AVG_DAYS_PER_MONTH = 30.44;

async function computeMachineDirectCost(
  db: DataSource,
  invUrl: string,
  invoiceIds: string[],
  dateFrom: string,
  dateTo: string,
): Promise<MachineCostResult> {
  if (invoiceIds.length === 0) {
    return {
      cost: 0,
      basis: 'ACTUAL',
      note: 'No contracts in this period.',
      allocatedContracts: 0,
    };
  }

  const allocations = await db.query<
    {
      contractId: string;
      productId: string | null;
      startTimestamp: string;
      endTimestamp: string | null;
    }[]
  >(
    `
    SELECT "contractId", "productId", "startTimestamp", "endTimestamp"
    FROM product_allocations
    WHERE "contractId" = ANY($1) AND "productId" IS NOT NULL
    `,
    [invoiceIds],
  );

  const allocatedContractIds = new Set(allocations.map((a) => a.contractId));

  if (allocations.length === 0) {
    return {
      cost: 0,
      basis: 'UNAVAILABLE',
      note: `No machine is allocated to any of the ${invoiceIds.length} contract(s) in this segment — machine allocation is optional at contract creation and wasn't recorded here, so direct cost cannot be traced.`,
      allocatedContracts: 0,
    };
  }

  const productIds = [...new Set(allocations.map((a) => a.productId as string))];
  const periodStart = new Date(dateFrom);
  const periodEnd = new Date(dateTo);

  const [depRows, serviceCostData] = await Promise.all([
    db.query<
      {
        productId: string;
        purchasePrice: string;
        salvageValue: string;
        usefulLifeMonths: number;
        annualDepreciationPct: string;
        method: string;
        purchaseDate: string;
      }[]
    >(
      `
      SELECT "productId", "purchasePrice", "salvageValue", "usefulLifeMonths",
             "annualDepreciationPct", method, "purchaseDate"
      FROM asset_depreciation_register
      WHERE "productId" = ANY($1) AND status != 'DISPOSED'
      `,
      [productIds],
    ),
    internalCall<{ success: boolean; data: { productId: string; amount: number }[] }>(
      `${invUrl}/service/internal/cogs-report-by-product?productIds=${productIds.join(',')}&dateFrom=${dateFrom}&dateTo=${dateTo}`,
    ),
  ]);

  const monthlyDepByProduct = new Map<string, number>();
  for (const d of depRows) {
    const result = calculateDepreciation({
      purchasePrice: Number(d.purchasePrice),
      salvageValue: Number(d.salvageValue),
      usefulLifeMonths: Number(d.usefulLifeMonths),
      annualDepreciationPct: Number(d.annualDepreciationPct),
      method: d.method as 'STRAIGHT_LINE' | 'DECLINING_BALANCE',
      purchaseDate: new Date(d.purchaseDate),
    });
    monthlyDepByProduct.set(
      d.productId,
      (monthlyDepByProduct.get(d.productId) ?? 0) + result.monthlyDep,
    );
  }

  let depreciationCost = 0;
  for (const a of allocations) {
    const monthlyDep = monthlyDepByProduct.get(a.productId as string);
    if (!monthlyDep) continue;
    const allocStart = new Date(a.startTimestamp);
    const allocEnd = a.endTimestamp ? new Date(a.endTimestamp) : periodEnd;
    const overlapStart = allocStart > periodStart ? allocStart : periodStart;
    const overlapEnd = allocEnd < periodEnd ? allocEnd : periodEnd;
    if (overlapEnd <= overlapStart) continue;
    const overlapDays = (overlapEnd.getTime() - overlapStart.getTime()) / MS_PER_DAY;
    depreciationCost += monthlyDep * (overlapDays / AVG_DAYS_PER_MONTH);
  }

  let serviceCost = 0;
  if (serviceCostData) {
    for (const row of serviceCostData.data) serviceCost += Number(row.amount) || 0;
  }

  const hasDep = depRows.length > 0;
  const hasService = !!serviceCostData && serviceCostData.data.length > 0;
  const missingContracts = invoiceIds.length - allocatedContractIds.size;

  let note: string;
  let basis: CostBasis;
  if (!hasDep && !hasService) {
    basis = 'UNAVAILABLE';
    note = `Machine allocated for ${allocations.length} of ${invoiceIds.length} contract(s), but no depreciation register entry or service record exists for the allocated machine(s) — direct cost cannot be traced yet.`;
  } else {
    basis = 'ACTUAL';
    const parts: string[] = [];
    parts.push(
      `${allocatedContractIds.size} of ${invoiceIds.length} contract(s) have a machine allocated — depreciation + service cost traced for those.`,
    );
    if (missingContracts > 0) {
      parts.push(
        `${missingContracts} contract(s) have no machine allocated and contribute $0 direct cost.`,
      );
    }
    if (!hasDep) parts.push('No depreciation register entries found for the allocated machine(s).');
    if (!serviceCostData)
      parts.push('Service cost report was unavailable — labour/parts cost may be understated.');
    note = parts.join(' ');
  }

  return {
    cost: depreciationCost + serviceCost,
    basis,
    note,
    allocatedContracts: allocatedContractIds.size,
  };
}

// ─── Segment builder ────────────────────────────────────────────────────────

function buildSegment(
  key: string,
  label: string,
  topCategory: RevenueTopCategory,
  revenue: number,
  directCost: number,
  directCostBasis: CostBasis,
  directCostNote: string,
  invoiceIds: string[],
): SegmentPnl {
  const grossProfit = revenue - directCost;
  return {
    key,
    label,
    topCategory,
    revenue: +revenue.toFixed(2),
    directCost: +directCost.toFixed(2),
    directCostBasis,
    directCostNote,
    grossProfit: +grossProfit.toFixed(2),
    allocatedOverhead: 0, // filled in after all segments are built (needs totalRevenue)
    netProfit: +grossProfit.toFixed(2), // filled in after allocation
    grossMarginPct: revenue > 0 ? +((grossProfit / revenue) * 100).toFixed(2) : null,
    netMarginPct: null, // filled in after allocation
    invoiceIds,
  };
}

// ─── Top-level orchestration ────────────────────────────────────────────────

export async function computeSegmentedPnl(
  db: DataSource,
  branchFilter: string[],
  dateFrom: string,
  dateTo: string,
  baseCurrency: string,
  invUrl: string,
): Promise<SegmentedPnlResult> {
  const currencyWarnings: string[] = [];
  const dataWarnings: string[] = [];
  const rates = await loadExchangeRates(db, baseCurrency);

  const [saleRows, rentRows, leaseRows, pl] = await Promise.all([
    fetchRevenueRows(db, 'SALE', branchFilter, dateFrom, dateTo),
    fetchRevenueRows(db, 'RENT', branchFilter, dateFrom, dateTo),
    fetchRevenueRows(db, 'LEASE', branchFilter, dateFrom, dateTo),
    computeProfitAndLoss(db, branchFilter, dateFrom, dateTo, baseCurrency, invUrl),
  ]);

  const productSaleRows = saleRows.filter((r) => subCategoryOf(r) === 'PRODUCT_SALE');
  const sparePartSaleRows = saleRows.filter((r) => subCategoryOf(r) === 'SPAREPART_SALE');
  const saleInvoiceIds = [
    ...new Set([...productSaleRows, ...sparePartSaleRows].map((r) => r.invoiceId)),
  ];
  const saleCosts = await computeSaleDirectCosts(db, invUrl, saleInvoiceIds);

  const segments: SegmentPnl[] = [];

  segments.push(
    buildSegment(
      'PRODUCT_SALE',
      'Product Sale',
      'SALE',
      sumConvertedRows(productSaleRows, baseCurrency, rates, currencyWarnings),
      saleCosts.productSale.cost,
      saleCosts.productSale.basis,
      saleCosts.productSale.note,
      [...new Set(productSaleRows.map((r) => r.invoiceId))],
    ),
  );
  segments.push(
    buildSegment(
      'SPAREPART_SALE',
      'Spare Part Sale',
      'SALE',
      sumConvertedRows(sparePartSaleRows, baseCurrency, rates, currencyWarnings),
      saleCosts.sparePartSale.cost,
      saleCosts.sparePartSale.basis,
      saleCosts.sparePartSale.note,
      [...new Set(sparePartSaleRows.map((r) => r.invoiceId))],
    ),
  );

  for (const pt of PLAN_TYPES) {
    const rows = rentRows.filter((r) => subCategoryOf(r) === pt);
    const invoiceIds = [...new Set(rows.map((r) => r.invoiceId))];
    const revenue = sumConvertedRows(rows, baseCurrency, rates, currencyWarnings);
    const directCost = await computeMachineDirectCost(db, invUrl, invoiceIds, dateFrom, dateTo);
    segments.push(
      buildSegment(
        pt,
        PLAN_TYPE_LABELS[pt],
        'RENT',
        revenue,
        directCost.cost,
        directCost.basis,
        directCost.note,
        invoiceIds,
      ),
    );
  }

  const emiRows = leaseRows.filter((r) => subCategoryOf(r) === 'EMI');
  const emiInvoiceIds = [...new Set(emiRows.map((r) => r.invoiceId))];
  const emiCost = await computeMachineDirectCost(db, invUrl, emiInvoiceIds, dateFrom, dateTo);
  segments.push(
    buildSegment(
      'EMI',
      'Lease — EMI',
      'LEASE',
      sumConvertedRows(emiRows, baseCurrency, rates, currencyWarnings),
      emiCost.cost,
      emiCost.basis,
      emiCost.note,
      emiInvoiceIds,
    ),
  );

  for (const pt of PLAN_TYPES) {
    const rows = leaseRows.filter((r) => subCategoryOf(r) === `FSM_${pt}`);
    const invoiceIds = [...new Set(rows.map((r) => r.invoiceId))];
    const revenue = sumConvertedRows(rows, baseCurrency, rates, currencyWarnings);
    const directCost = await computeMachineDirectCost(db, invUrl, invoiceIds, dateFrom, dateTo);
    segments.push(
      buildSegment(
        `FSM_${pt}`,
        `Lease — FSM (${PLAN_TYPE_LABELS[pt]})`,
        'LEASE',
        revenue,
        directCost.cost,
        directCost.basis,
        directCost.note,
        invoiceIds,
      ),
    );
  }

  // Overhead pool: only the categories with no traceable link to a specific
  // product/contract. Deliberately excludes costOfParts/labourCost/depreciationExpense
  // (traced above, or attempted to be, at the segment level), vendorPurchases (a
  // separate, period-expensed purchasing cost — see the dataWarning below), and
  // shippingHandling (tied to those same vendor purchases).
  const overheadPool =
    pl.salaryExpense +
    pl.travelExpense +
    pl.rentExpense +
    pl.utilitiesExpense +
    pl.marketingExpense +
    pl.maintenanceExpense +
    pl.insuranceExpense +
    pl.importLabourCost +
    pl.customsDuty +
    pl.otherExpenses;

  const totalRevenue = segments.reduce((s, seg) => s + seg.revenue, 0);
  for (const seg of segments) {
    seg.allocatedOverhead =
      totalRevenue > 0 ? +(overheadPool * (seg.revenue / totalRevenue)).toFixed(2) : 0;
    seg.netProfit = +(seg.grossProfit - seg.allocatedOverhead).toFixed(2);
    seg.netMarginPct = seg.revenue > 0 ? +((seg.netProfit / seg.revenue) * 100).toFixed(2) : null;
  }

  dataWarnings.push(
    'Segment Net Profit will NOT sum exactly to the company-wide Income Statement Net Profit. ' +
      'The Income Statement expenses 100% of Vendor Purchases (5004) in the period they were made, ' +
      'regardless of whether those goods have sold yet; segment Direct Cost instead uses the actual ' +
      'purchase price of only the units that sold. These are two different, both-correct accounting bases — ' +
      'they only coincide when everything purchased in a period is also sold within it.',
  );

  const totalDirectCost = segments.reduce((s, seg) => s + seg.directCost, 0);
  const totalGrossProfit = segments.reduce((s, seg) => s + seg.grossProfit, 0);
  const totalAllocatedOverhead = segments.reduce((s, seg) => s + seg.allocatedOverhead, 0);
  const totalNetProfit = segments.reduce((s, seg) => s + seg.netProfit, 0);

  return {
    segments,
    totalRevenue: +totalRevenue.toFixed(2),
    totalDirectCost: +totalDirectCost.toFixed(2),
    totalGrossProfit: +totalGrossProfit.toFixed(2),
    totalAllocatedOverhead: +totalAllocatedOverhead.toFixed(2),
    totalNetProfit: +totalNetProfit.toFixed(2),
    overheadPool: +overheadPool.toFixed(2),
    currency: baseCurrency,
    currencyWarnings,
    dataWarnings,
  };
}

// ─── Per-product drill-down (Product Sale / Spare Part Sale) ──────────────────
// One row per invoice line item actually sold — the exact units behind the
// segment's Direct Cost figure above, not a re-aggregation.

export interface ProductSaleRow {
  invoiceItemId: string;
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  date: string;
  productId: string | null;
  sparePartId: string | null;
  itemLabel: string; // model/brand or part name — filled in after cross-service enrichment
  serialNumber: string | null;
  quantity: number;
  revenue: number;
  cost: number;
  costBasis: CostBasis;
  profit: number;
}

export async function fetchSaleProductRows(
  db: DataSource,
  invUrl: string,
  branchFilter: string[],
  dateFrom: string,
  dateTo: string,
  segmentKey: 'PRODUCT_SALE' | 'SPAREPART_SALE',
): Promise<ProductSaleRow[]> {
  const saleRows = await fetchRevenueRows(db, 'SALE', branchFilter, dateFrom, dateTo);
  const relevantRows = saleRows.filter((r) => subCategoryOf(r) === segmentKey);
  const invoiceIds = [...new Set(relevantRows.map((r) => r.invoiceId))];
  if (invoiceIds.length === 0) return [];

  const itemType = segmentKey === 'PRODUCT_SALE' ? 'PRODUCT' : 'SPARE_PART';
  const items = await db.query<
    {
      id: string;
      invoiceId: string;
      invoiceNumber: string;
      customer_name: string | null;
      createdAt: string;
      productId: string | null;
      sparePartId: string | null;
      serialNumber: string | null;
      quantity: number;
      unitPrice: string;
      discountAmount: string;
    }[]
  >(
    `
    SELECT ii.id, ii."invoiceId", i."invoiceNumber", i.customer_name,
           TO_CHAR(i."createdAt", 'YYYY-MM-DD') AS "createdAt",
           ii."productId", ii."sparePartId", ii."serialNumber",
           COALESCE(ii.quantity, 1) AS quantity, COALESCE(ii."unitPrice", 0) AS "unitPrice",
           COALESCE(ii."discountAmount", 0) AS "discountAmount"
    FROM invoice_items ii
    JOIN invoices i ON i.id = ii."invoiceId"
    WHERE ii."invoiceId" = ANY($1) AND ii."deletedAt" IS NULL AND ii."itemType" = $2
    ORDER BY i."createdAt" DESC
    `,
    [invoiceIds, itemType],
  );

  const productIds = [...new Set(items.map((i) => i.productId).filter((x): x is string => !!x))];
  const sparePartIds = [
    ...new Set(items.map((i) => i.sparePartId).filter((x): x is string => !!x)),
  ];

  const [productData, sparePartData] = await Promise.all([
    productIds.length
      ? internalCall<{
          success: boolean;
          data: {
            id: string;
            purchase_price: string | number | null;
            brand_name?: string;
            model_name?: string;
            brand?: string;
          }[];
        }>(`${invUrl}/products/batch`, 'POST', { productIds })
      : null,
    sparePartIds.length
      ? internalCall<{
          success: boolean;
          data: {
            id: string;
            purchase_price: string | number | null;
            part_name?: string;
            brand?: string;
          }[];
        }>(`${invUrl}/spare-parts/batch`, 'POST', { sparePartIds })
      : null,
  ]);

  const productMap = new Map((productData?.data ?? []).map((p) => [p.id, p]));
  const sparePartMap = new Map((sparePartData?.data ?? []).map((p) => [p.id, p]));

  return items.map((item) => {
    const quantity = Number(item.quantity || 1);
    const revenue = Number(item.unitPrice) * quantity - Number(item.discountAmount);
    let cost = 0;
    let costBasis: CostBasis = 'UNAVAILABLE';
    let itemLabel = 'Unknown';

    if (item.productId) {
      const p = productMap.get(item.productId);
      if (p) {
        cost = Number(p.purchase_price ?? 0) * quantity;
        costBasis = 'ACTUAL';
        itemLabel =
          [p.brand_name ?? p.brand, p.model_name].filter(Boolean).join(' — ') || 'Product';
      } else if (productIds.length > 0 && !productData) {
        itemLabel = 'Product (inventory service unavailable)';
      }
    } else if (item.sparePartId) {
      const sp = sparePartMap.get(item.sparePartId);
      if (sp) {
        cost = Number(sp.purchase_price ?? 0) * quantity;
        costBasis = 'APPROXIMATE';
        itemLabel = [sp.brand, sp.part_name].filter(Boolean).join(' — ') || 'Spare Part';
      } else if (sparePartIds.length > 0 && !sparePartData) {
        itemLabel = 'Spare Part (inventory service unavailable)';
      }
    }

    return {
      invoiceItemId: item.id,
      invoiceId: item.invoiceId,
      invoiceNumber: item.invoiceNumber,
      customerName: item.customer_name ?? 'Unknown Customer',
      date: item.createdAt,
      productId: item.productId,
      sparePartId: item.sparePartId,
      itemLabel,
      serialNumber: item.serialNumber,
      quantity,
      revenue: +revenue.toFixed(2),
      cost: +cost.toFixed(2),
      costBasis,
      profit: +(revenue - cost).toFixed(2),
    };
  });
}

// ─── Per-contract drill-down (Rent / Lease sub-types) ──────────────────────────
// One row per contract (invoice) in the segment — its own period revenue,
// allocated machine (if any), and that machine's own direct cost.

export interface ContractPnlRow {
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  revenue: number;
  productId: string | null;
  machineLabel: string | null;
  serialNumber: string | null;
  directCost: number;
  costBasis: CostBasis;
  profit: number;
  note: string;
}

export async function fetchContractRows(
  db: DataSource,
  invUrl: string,
  branchFilter: string[],
  dateFrom: string,
  dateTo: string,
  segmentKey: string,
): Promise<ContractPnlRow[]> {
  const topCategory: RevenueTopCategory =
    segmentKey === 'EMI' || segmentKey.startsWith('FSM_') ? 'LEASE' : 'RENT';
  const rows = await fetchRevenueRows(db, topCategory, branchFilter, dateFrom, dateTo);
  const relevantRows = rows.filter((r) => subCategoryOf(r) === segmentKey);
  if (relevantRows.length === 0) return [];

  // Rows for one contract (advance + usage periods) are always in that contract's
  // own currency, so a straight sum is correct here — no cross-currency conversion
  // needed for a per-contract breakdown (unlike the segment-level total, which mixes
  // contracts across currencies and does convert, in computeSegmentedPnl above).
  const revenueByInvoice = new Map<
    string,
    { revenue: number; customerName: string; invoiceNumber: string }
  >();
  for (const r of relevantRows) {
    // Include exceededCharge (usage/overage billing) alongside the base amount —
    // see sumConvertedRows above; without it this per-contract detail wouldn't
    // sum to the segment total it drills into for CPC/CPC_COMBO plans.
    const rowRevenue = r.amount + (r.exceededCharge ?? 0);
    const existing = revenueByInvoice.get(r.invoiceId);
    if (existing) existing.revenue += rowRevenue;
    else
      revenueByInvoice.set(r.invoiceId, {
        revenue: rowRevenue,
        customerName: r.customerName,
        invoiceNumber: r.invoiceNumber,
      });
  }

  const invoiceIds = [...revenueByInvoice.keys()];

  const allocations = await db.query<
    {
      contractId: string;
      productId: string | null;
      serialNumber: string;
      startTimestamp: string;
      endTimestamp: string | null;
    }[]
  >(
    `
    SELECT "contractId", "productId", "serialNumber", "startTimestamp", "endTimestamp"
    FROM product_allocations
    WHERE "contractId" = ANY($1)
    ORDER BY "startTimestamp" DESC
    `,
    [invoiceIds],
  );

  const allocByContract = new Map<string, (typeof allocations)[number]>();
  for (const a of allocations) {
    // One row per contract in this view — prefer the currently-active allocation
    // (no endTimestamp) if a device was swapped mid-contract.
    const existing = allocByContract.get(a.contractId);
    if (!existing || (!a.endTimestamp && existing.endTimestamp))
      allocByContract.set(a.contractId, a);
  }

  const productIds = [
    ...new Set(allocations.map((a) => a.productId).filter((x): x is string => !!x)),
  ];
  const periodStart = new Date(dateFrom);
  const periodEnd = new Date(dateTo);

  const [depRows, productData, serviceCostData] = await Promise.all([
    productIds.length
      ? db.query<
          {
            productId: string;
            purchasePrice: string;
            salvageValue: string;
            usefulLifeMonths: number;
            annualDepreciationPct: string;
            method: string;
            purchaseDate: string;
          }[]
        >(
          `
          SELECT "productId", "purchasePrice", "salvageValue", "usefulLifeMonths",
                 "annualDepreciationPct", method, "purchaseDate"
          FROM asset_depreciation_register
          WHERE "productId" = ANY($1) AND status != 'DISPOSED'
          `,
          [productIds],
        )
      : [],
    productIds.length
      ? internalCall<{
          success: boolean;
          data: { id: string; brand_name?: string; model_name?: string; brand?: string }[];
        }>(`${invUrl}/products/batch`, 'POST', { productIds })
      : null,
    productIds.length
      ? internalCall<{ success: boolean; data: { productId: string; amount: number }[] }>(
          `${invUrl}/service/internal/cogs-report-by-product?productIds=${productIds.join(',')}&dateFrom=${dateFrom}&dateTo=${dateTo}`,
        )
      : null,
  ]);

  const monthlyDepByProduct = new Map<string, number>();
  for (const d of depRows) {
    const result = calculateDepreciation({
      purchasePrice: Number(d.purchasePrice),
      salvageValue: Number(d.salvageValue),
      usefulLifeMonths: Number(d.usefulLifeMonths),
      annualDepreciationPct: Number(d.annualDepreciationPct),
      method: d.method as 'STRAIGHT_LINE' | 'DECLINING_BALANCE',
      purchaseDate: new Date(d.purchaseDate),
    });
    monthlyDepByProduct.set(
      d.productId,
      (monthlyDepByProduct.get(d.productId) ?? 0) + result.monthlyDep,
    );
  }
  const productLabelMap = new Map((productData?.data ?? []).map((p) => [p.id, p]));
  const serviceCostByProduct = new Map(
    (serviceCostData?.data ?? []).map((r) => [r.productId, Number(r.amount) || 0]),
  );

  return invoiceIds.map((invoiceId) => {
    const rev = revenueByInvoice.get(invoiceId)!;
    const allocation = allocByContract.get(invoiceId);

    if (!allocation || !allocation.productId) {
      return {
        invoiceId,
        invoiceNumber: rev.invoiceNumber,
        customerName: rev.customerName,
        revenue: +rev.revenue.toFixed(2),
        productId: null,
        machineLabel: null,
        serialNumber: null,
        directCost: 0,
        costBasis: 'UNAVAILABLE' as CostBasis,
        profit: +rev.revenue.toFixed(2),
        note: 'No machine allocated to this contract — direct cost cannot be traced.',
      };
    }

    const monthlyDep = monthlyDepByProduct.get(allocation.productId) ?? 0;
    let depCost = 0;
    if (monthlyDep > 0) {
      const allocStart = new Date(allocation.startTimestamp);
      const allocEnd = allocation.endTimestamp ? new Date(allocation.endTimestamp) : periodEnd;
      const overlapStart = allocStart > periodStart ? allocStart : periodStart;
      const overlapEnd = allocEnd < periodEnd ? allocEnd : periodEnd;
      if (overlapEnd > overlapStart) {
        const overlapDays = (overlapEnd.getTime() - overlapStart.getTime()) / MS_PER_DAY;
        depCost = monthlyDep * (overlapDays / AVG_DAYS_PER_MONTH);
      }
    }
    const serviceCost = serviceCostByProduct.get(allocation.productId) ?? 0;
    const directCost = depCost + serviceCost;
    const hasCost = monthlyDep > 0 || serviceCost > 0;
    const label = productLabelMap.get(allocation.productId);

    return {
      invoiceId,
      invoiceNumber: rev.invoiceNumber,
      customerName: rev.customerName,
      revenue: +rev.revenue.toFixed(2),
      productId: allocation.productId,
      machineLabel: label
        ? [label.brand_name ?? label.brand, label.model_name].filter(Boolean).join(' — ')
        : 'Allocated machine',
      serialNumber: allocation.serialNumber,
      directCost: +directCost.toFixed(2),
      costBasis: hasCost ? ('ACTUAL' as CostBasis) : ('UNAVAILABLE' as CostBasis),
      profit: +(rev.revenue - directCost).toFixed(2),
      note: hasCost
        ? 'Depreciation + service/labour cost for the allocated machine, prorated to this period.'
        : 'Machine allocated, but no depreciation register entry or service record exists for it yet.',
    };
  });
}
