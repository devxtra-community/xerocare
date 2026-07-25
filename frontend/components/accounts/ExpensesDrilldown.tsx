'use client';

import React from 'react';
import {
  DrilldownModal,
  type DrilldownNode,
  type DrilldownColumn,
  type DrilldownFilters,
} from './RevenueDrilldown';
import {
  fetchExpenseEntries,
  fetchAssetRegister,
  type ExpenseEntry,
  type AssetDepreciationRegister,
} from '@/lib/finance/accountsApi';
import { fetchPurchases, type PurchaseOrder } from '@/lib/finance/accounts';
import { formatCurrency } from '@/lib/format';

// ─── Expense drill-down node key → expense_entries category this pulls from ──
// Matches the exact category set each accountsShared.ts P&L line reads.
export const EXPENSE_LINE_CATEGORIES: Record<string, string[]> = {
  COST_OF_PARTS: ['SPARE_PARTS'],
  LABOUR_COST: ['LABOUR'],
  SALARY: ['SALARY'],
  TRAVEL: ['TRAVEL'],
  RENT: ['RENT'],
  UTILITIES: ['UTILITIES'],
  MARKETING: ['MARKETING'],
  MAINTENANCE: ['MAINTENANCE'],
  INSURANCE: ['INSURANCE'],
  IMPORT_LABOUR: ['IMPORT_LABOUR'],
  CUSTOMS_DUTY: ['CUSTOMS_DUTY'],
  OTHER: ['OTHER'],
};

function filterExpenseRows(rows: ExpenseEntry[], f: DrilldownFilters): ExpenseEntry[] {
  let out = rows;
  if (f.search) {
    const needle = f.search.toLowerCase();
    out = out.filter((r) => r.description?.toLowerCase().includes(needle));
  }
  if (f.dateFrom) out = out.filter((r) => r.date?.slice(0, 10) >= f.dateFrom!);
  if (f.dateTo) out = out.filter((r) => r.date?.slice(0, 10) <= f.dateTo!);
  if (f.amountMin) out = out.filter((r) => Number(r.netAmount) >= Number(f.amountMin));
  if (f.amountMax) out = out.filter((r) => Number(r.netAmount) <= Number(f.amountMax));
  return out;
}

const expenseColumns: DrilldownColumn<ExpenseEntry>[] = [
  {
    header: 'Date',
    render: (r) => (
      <span className="font-mono text-xs text-muted-foreground">{r.date?.slice(0, 10)}</span>
    ),
  },
  { header: 'Description', render: (r) => <span className="text-sm">{r.description}</span> },
  {
    header: 'Status',
    render: (r) => (
      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700">
        {r.status}
      </span>
    ),
  },
  {
    header: 'Source',
    render: () => (
      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-50 text-slate-600 border border-slate-200">
        Manual
      </span>
    ),
  },
  {
    header: 'Amount',
    align: 'right',
    render: (r) => (
      <span className="font-bold tabular-nums text-slate-800">
        {formatCurrency(Number(r.netAmount), r.currency)}
      </span>
    ),
  },
];

export function ExpenseLineModal({
  categories,
  title,
  periodFrom,
  periodTo,
  branchId,
  isAdmin,
  branches,
  onClose,
}: {
  categories: string[];
  title: string;
  periodFrom: string;
  periodTo: string;
  branchId?: string;
  isAdmin: boolean;
  branches?: { id: string; name: string }[];
  onClose: () => void;
}) {
  return (
    <DrilldownModal<ExpenseEntry>
      title={title}
      queryKey={`expense-line-${categories.join('-')}`}
      fetchRows={async (f) => {
        const all = await Promise.all(
          categories.map((category) =>
            fetchExpenseEntries({ category, branchId: f.branchId ?? branchId }),
          ),
        );
        return filterExpenseRows(all.flat(), f);
      }}
      columns={expenseColumns}
      getAmount={(r) => Number(r.netAmount)}
      getCurrency={(r) => r.currency}
      searchFilterLabel="Description"
      periodFrom={periodFrom}
      periodTo={periodTo}
      branchId={branchId}
      isAdmin={isAdmin}
      branches={branches}
      onClose={onClose}
    />
  );
}

// ─── Depreciation Expense (5003) ───────────────────────────────────────────────

function filterAssetRows(
  rows: AssetDepreciationRegister[],
  f: DrilldownFilters,
): AssetDepreciationRegister[] {
  let out = rows;
  if (f.customerName) {
    const needle = f.customerName.toLowerCase();
    out = out.filter(
      (a) =>
        (a.assetName ?? '').toLowerCase().includes(needle) ||
        a.assetCategory.toLowerCase().includes(needle) ||
        (a.brand_name ?? '').toLowerCase().includes(needle) ||
        (a.model_name ?? '').toLowerCase().includes(needle),
    );
  }
  if (f.dateFrom) out = out.filter((a) => a.purchaseDate?.slice(0, 10) >= f.dateFrom!);
  if (f.dateTo) out = out.filter((a) => a.purchaseDate?.slice(0, 10) <= f.dateTo!);
  if (f.amountMin) out = out.filter((a) => a.monthlyDep >= Number(f.amountMin));
  if (f.amountMax) out = out.filter((a) => a.monthlyDep <= Number(f.amountMax));
  return out;
}

const depreciationColumns: DrilldownColumn<AssetDepreciationRegister>[] = [
  {
    header: 'Asset',
    render: (a) => (
      <div>
        <div className="text-sm font-medium">{a.model_name || a.assetName || 'Unnamed Asset'}</div>
        {a.brand_name && <div className="text-xs text-muted-foreground">{a.brand_name}</div>}
      </div>
    ),
  },
  {
    header: 'Category',
    render: (a) => <span className="text-xs">{a.assetCategory.replace(/_/g, ' ')}</span>,
  },
  {
    header: 'Purchase Date',
    render: (a) => (
      <span className="font-mono text-xs text-muted-foreground">
        {a.purchaseDate?.slice(0, 10)}
      </span>
    ),
  },
  {
    header: 'Method',
    render: (a) => <span className="text-xs">{a.method.replace(/_/g, ' ')}</span>,
  },
  {
    header: 'Monthly Dep.',
    align: 'right',
    render: (a) => <span className="tabular-nums">{formatCurrency(a.monthlyDep, 'AED')}</span>,
  },
  {
    header: 'Accum. Dep.',
    align: 'right',
    render: (a) => (
      <span className="tabular-nums text-muted-foreground">
        {formatCurrency(a.accumulated, 'AED')}
      </span>
    ),
  },
  {
    header: 'NBV',
    align: 'right',
    render: (a) => (
      <span className="font-bold tabular-nums text-slate-800">{formatCurrency(a.nbv, 'AED')}</span>
    ),
  },
];

export function DepreciationModal({
  periodFrom,
  periodTo,
  branchId,
  isAdmin,
  branches,
  onClose,
}: {
  periodFrom: string;
  periodTo: string;
  branchId?: string;
  isAdmin: boolean;
  branches?: { id: string; name: string }[];
  onClose: () => void;
}) {
  return (
    <DrilldownModal<AssetDepreciationRegister>
      title="Depreciation Expense — Per Asset"
      queryKey="depreciation-assets"
      fetchRows={async (f) => {
        const rows = await fetchAssetRegister({
          status: 'ACTIVE',
          branchId: f.branchId ?? branchId,
        });
        return filterAssetRows(rows, f);
      }}
      columns={depreciationColumns}
      getAmount={(a) => a.monthlyDep}
      getCurrency={() => 'AED'}
      nameFilterLabel="Asset name / category / brand"
      periodFrom={periodFrom}
      periodTo={periodTo}
      branchId={branchId}
      isAdmin={isAdmin}
      branches={branches}
      onClose={onClose}
    />
  );
}

// ─── Vendor Purchase Cost (5004) — Local / International ─────────────────────

function filterPurchaseRows(
  rows: PurchaseOrder[],
  origin: 'DOMESTIC' | 'INTERNATIONAL',
  f: DrilldownFilters,
): PurchaseOrder[] {
  let out = rows.filter((p) => (p.purchaseOrigin ?? 'DOMESTIC') === origin);
  if (f.customerName) {
    const needle = f.customerName.toLowerCase();
    out = out.filter((p) => (p.vendor?.name ?? '').toLowerCase().includes(needle));
  }
  if (f.search) {
    const needle = f.search.toLowerCase();
    out = out.filter((p) => (p.lotId ?? p.id).toLowerCase().includes(needle));
  }
  if (f.dateFrom) out = out.filter((p) => p.createdAt?.slice(0, 10) >= f.dateFrom!);
  if (f.dateTo) out = out.filter((p) => p.createdAt?.slice(0, 10) <= f.dateTo!);
  const vendorCost = (p: PurchaseOrder) =>
    Number(p.purchaseAmount ?? 0) + Number(p.documentationFee ?? 0);
  if (f.amountMin) out = out.filter((p) => vendorCost(p) >= Number(f.amountMin));
  if (f.amountMax) out = out.filter((p) => vendorCost(p) <= Number(f.amountMax));
  return out;
}

const vendorPurchaseColumns: DrilldownColumn<PurchaseOrder>[] = [
  {
    header: 'Vendor',
    render: (p) => <span className="text-sm font-medium">{p.vendor?.name ?? '—'}</span>,
  },
  {
    header: 'PO / Lot Ref',
    render: (p) => (
      <span className="font-mono text-xs text-blue-600">{(p.lotId ?? p.id).slice(0, 8)}</span>
    ),
  },
  {
    header: 'Date',
    render: (p) => (
      <span className="font-mono text-xs text-muted-foreground">{p.createdAt?.slice(0, 10)}</span>
    ),
  },
  { header: 'Country', render: (p) => <span className="text-xs">{p.vendorCountry ?? '—'}</span> },
  {
    header: 'Category',
    render: (p) => <span className="text-xs">{p.purchaseCategory ?? '—'}</span>,
  },
  {
    header: 'Customs Duty',
    align: 'right',
    render: (p) => (
      <span className="text-xs tabular-nums">
        {formatCurrency(Number(p.customsDuty ?? 0), p.currencyCode ?? 'AED')}
      </span>
    ),
  },
  {
    header: 'Shipping',
    align: 'right',
    render: (p) => (
      <span className="text-xs tabular-nums">
        {formatCurrency(
          Number(p.shippingCost ?? 0) +
            Number(p.handlingFee ?? 0) +
            Number(p.transportationCost ?? 0) +
            Number(p.groundfieldCost ?? 0),
          p.currencyCode ?? 'AED',
        )}
      </span>
    ),
  },
  {
    header: 'Labour',
    align: 'right',
    render: (p) => (
      <span className="text-xs tabular-nums">
        {formatCurrency(Number(p.labourCost ?? 0), p.currencyCode ?? 'AED')}
      </span>
    ),
  },
  {
    header: 'VAT / RC VAT',
    align: 'right',
    render: (p) => (
      <span className="text-xs tabular-nums">
        {formatCurrency(
          Number(p.inputVatAmount ?? p.reverseChargeVatAmount ?? 0),
          p.currencyCode ?? 'AED',
        )}
      </span>
    ),
  },
  {
    header: 'Amount',
    align: 'right',
    render: (p) => (
      <span className="font-bold tabular-nums text-slate-800">
        {formatCurrency(
          Number(p.purchaseAmount ?? 0) + Number(p.documentationFee ?? 0),
          p.currencyCode ?? 'AED',
        )}
      </span>
    ),
  },
];

export function VendorPurchaseModal({
  origin,
  periodFrom,
  periodTo,
  branchId,
  isAdmin,
  branches,
  onClose,
}: {
  origin: 'DOMESTIC' | 'INTERNATIONAL';
  periodFrom: string;
  periodTo: string;
  branchId?: string;
  isAdmin: boolean;
  branches?: { id: string; name: string }[];
  onClose: () => void;
}) {
  return (
    <DrilldownModal<PurchaseOrder>
      title={`Vendor Purchase Cost — ${origin === 'DOMESTIC' ? 'Local' : 'International'}`}
      queryKey={`vendor-purchases-${origin}`}
      fetchRows={async (f) => {
        const rows = await fetchPurchases({
          branchId: f.branchId ?? branchId,
          fromDate: f.dateFrom,
          toDate: f.dateTo,
        });
        return filterPurchaseRows(rows, origin, f);
      }}
      columns={vendorPurchaseColumns}
      getAmount={(p) => Number(p.purchaseAmount ?? 0) + Number(p.documentationFee ?? 0)}
      getCurrency={(p) => p.currencyCode ?? 'AED'}
      nameFilterLabel="Vendor name"
      searchFilterLabel="PO / Lot ref"
      periodFrom={periodFrom}
      periodTo={periodTo}
      branchId={branchId}
      isAdmin={isAdmin}
      branches={branches}
      onClose={onClose}
    />
  );
}

// ─── Node tree builder ─────────────────────────────────────────────────────────

export function buildExpensesTree(expenses: {
  costOfParts: { balance: number };
  labourCost: { balance: number };
  depreciation: { balance: number };
  vendorPurchases: { balance: number };
  shippingHandling: { balance: number };
  salaryExpense: { balance: number };
  travelExpense: { balance: number };
  rentExpense: { balance: number };
  utilitiesExpense: { balance: number };
  marketingExpense: { balance: number };
  maintenanceExpense: { balance: number };
  insuranceExpense: { balance: number };
  otherExpenses: { balance: number };
  importLabourCost: { balance: number };
  customsDuty: { balance: number };
}): DrilldownNode[] {
  return [
    {
      key: 'DEPRECIATION',
      label: 'Depreciation Expense',
      amount: expenses.depreciation.balance,
      viewable: true,
    },
    {
      key: 'VENDOR_PURCHASE_COST',
      label: 'Vendor Purchase Cost',
      amount: expenses.vendorPurchases.balance,
      children: [
        { key: 'VENDOR_PURCHASE_LOCAL', label: 'Local', amount: 0, viewable: true },
        { key: 'VENDOR_PURCHASE_INTL', label: 'International', amount: 0, viewable: true },
      ],
    },
    {
      key: 'COST_OF_PARTS',
      label: 'Cost of Parts',
      amount: expenses.costOfParts.balance,
      viewable: true,
      note: 'Shows manually-entered SPARE_PARTS expense rows only — service-ticket COGS (the other contributor to this total) isn’t broken out to transaction level here',
    },
    {
      key: 'LABOUR_COST',
      label: 'Technician Labour',
      amount: expenses.labourCost.balance,
      viewable: true,
      note: 'Shows manually-entered LABOUR expense rows only — service-ticket technician time (the other contributor to this total) isn’t broken out to transaction level here',
    },
    {
      key: 'SHIPPING_HANDLING',
      label: 'Shipping & Handling',
      amount: expenses.shippingHandling.balance,
      viewable: false,
      note: 'Cross-service purchase cost — see Vendor Purchase Cost drill-down for the underlying purchases',
    },
    {
      key: 'SALARY',
      label: 'Salary Expense',
      amount: expenses.salaryExpense.balance,
      viewable: true,
    },
    {
      key: 'TRAVEL',
      label: 'Travel Expense',
      amount: expenses.travelExpense.balance,
      viewable: true,
    },
    { key: 'RENT', label: 'Rent Expense', amount: expenses.rentExpense.balance, viewable: true },
    {
      key: 'UTILITIES',
      label: 'Utilities Expense',
      amount: expenses.utilitiesExpense.balance,
      viewable: true,
    },
    {
      key: 'MARKETING',
      label: 'Marketing Expense',
      amount: expenses.marketingExpense.balance,
      viewable: true,
    },
    {
      key: 'MAINTENANCE',
      label: 'Maintenance Expense',
      amount: expenses.maintenanceExpense.balance,
      viewable: true,
    },
    {
      key: 'INSURANCE',
      label: 'Insurance Expense',
      amount: expenses.insuranceExpense.balance,
      viewable: true,
    },
    {
      key: 'IMPORT_LABOUR',
      label: 'Import / Purchase Labour Cost',
      amount: expenses.importLabourCost.balance,
      viewable: true,
    },
    {
      key: 'CUSTOMS_DUTY',
      label: 'Customs Duty',
      amount: expenses.customsDuty.balance,
      viewable: true,
    },
    {
      key: 'OTHER',
      label: 'Other Expenses',
      amount: expenses.otherExpenses.balance,
      viewable: true,
    },
  ];
}
