'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Scale, RefreshCw, AlertTriangle, FileText } from 'lucide-react';
import { getChartOfAccounts, type ChartOfAccountsResponse } from '@/lib/finance/accountsApi';
import { fetchBranches } from '@/lib/finance/accounts';
import { getUserFromToken } from '@/lib/auth';
import { formatCurrency } from '@/lib/format';
import StatCard from '@/components/StatCard';
import { Button } from '@/components/ui/button';
import StatementDialog, { type SnapshotStatementData } from '@/components/shared/StatementDialog';
import CustomAccountRows from '@/components/accounts/CustomAccountRows';
import { DrilldownTree, type DrilldownNode } from '@/components/accounts/RevenueDrilldown';
import { buildAssetsTree } from '@/components/accounts/AssetsDrilldown';
import { buildLiabilitiesTree } from '@/components/accounts/LiabilitiesDrilldown';
import { buildEquityTree } from '@/components/accounts/EquityDrilldown';
import {
  LineItemDetailDispatcher,
  type DrilldownSection,
} from '@/components/accounts/LineItemDetailDispatcher';

// Period defaults match the Chart of Accounts page's own default (year-to-date) —
// asset/liability/equity balances themselves are always "as of today" server-side
// regardless of this range; it only affects the modals' own default date filters.
function currentYearFrom() {
  return `${new Date().getFullYear()}-01-01`;
}
function currentYearTo() {
  return new Date().toISOString().slice(0, 10);
}

// A plain, non-viewable row for figures that are purely informational components
// of another (viewable) line — e.g. Equipment Gross Cost / Accumulated Depreciation
// feeding into the single viewable Net Book Value line, matching how the Chart of
// Accounts page treats the exact same two figures.
function PlainRow({
  label,
  value,
  currency,
  note,
}: {
  label: string;
  value: number;
  currency: string;
  note?: string;
}) {
  return (
    <div className="grid grid-cols-12 px-5 py-3 items-center text-sm">
      <span className="col-span-6 pl-5 text-muted-foreground">
        {label}
        {note && (
          <span className="block text-[11px] font-normal text-muted-foreground">{note}</span>
        )}
      </span>
      <span
        className={`col-span-5 text-right font-medium tabular-nums ${value < 0 ? 'text-red-600' : 'text-slate-700'}`}
      >
        {formatCurrency(value, currency)}
      </span>
      <span className="col-span-1" />
    </div>
  );
}

function TotalRow({
  label,
  value,
  currency,
  grand = false,
}: {
  label: string;
  value: number;
  currency: string;
  grand?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between px-5 py-2.5 mt-1 ${
        grand ? 'border-t-2 border-slate-300 pt-3' : 'border-t border-border bg-slate-50/60'
      }`}
    >
      <span className="text-sm font-bold text-slate-800">{label}</span>
      <span
        className={`text-sm font-bold tabular-nums ${value < 0 ? 'text-red-600' : 'text-slate-800'}`}
      >
        {formatCurrency(value, currency)}
      </span>
    </div>
  );
}

export default function BalanceSheetPage() {
  const [showStatement, setShowStatement] = useState(false);
  const [viewingLineItem, setViewingLineItem] = useState<{
    section: DrilldownSection;
    node: DrilldownNode;
  } | null>(null);

  const currentUser = getUserFromToken();
  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: fetchBranches,
    staleTime: 5 * 60 * 1000,
  });
  const activeBranch = branches.find((b) => b.id === currentUser?.branchId) ?? branches[0];
  const branchInfo = {
    name: activeBranch?.name ?? 'XeroCare',
    address: activeBranch?.address,
    tax_registration_number: activeBranch?.tax_registration_number,
    country: activeBranch?.country,
  };

  const periodFrom = currentYearFrom();
  const periodTo = currentYearTo();

  // Same endpoint, same query the Chart of Accounts page uses for its own Assets/
  // Liabilities/Equity breakdown — the Balance Sheet is a different presentation of
  // identical figures, not a second calculation, so it reads from the exact same
  // source (down to the queryKey, so a warm CoA-page cache is reused here too).
  const { data, isLoading, isError, refetch, isFetching } = useQuery<ChartOfAccountsResponse>({
    queryKey: ['chart-of-accounts', periodFrom, periodTo],
    queryFn: () => getChartOfAccounts({ periodFrom, periodTo }),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const currency = data?.currency ?? 'AED';
  const assetsTree = data ? buildAssetsTree(data.assets) : [];
  const liabilitiesTree = data ? buildLiabilitiesTree(data.liabilities.currentLiabilities) : [];
  const equityTree = data ? buildEquityTree(data.equity) : [];

  const isBalanced = data?.summary.accountingEquation.isBalanced ?? false;
  const difference = data?.summary.accountingEquation.difference ?? 0;
  const dataWarnings = data?.warnings ?? [];

  const fmt = (n: number) => formatCurrency(n, currency);
  const statementData: SnapshotStatementData = {
    kind: 'snapshot',
    title: 'Balance Sheet',
    asOfDate: data?.asOfDate,
    sections: data
      ? [
          {
            title: 'Assets — Current',
            rows: [
              ...assetsTree
                .filter((n) => n.key !== 'EQUIPMENT_ASSETS')
                .map((n) => ({ label: n.label, value: fmt(n.amount) })),
              ...data.assets.currentAssets.custom.map((c) => ({
                label: c.name,
                value: fmt(c.balance),
              })),
            ],
            total: {
              label: 'Total Current Assets',
              value: fmt(data.assets.currentAssets.totalCurrentAssets),
            },
          },
          {
            title: 'Assets — Non-Current',
            rows: [
              {
                label: 'Equipment (Gross)',
                value: fmt(data.assets.nonCurrentAssets.equipmentGrossCost.balance),
              },
              {
                label: 'Less: Accumulated Depreciation',
                value: fmt(-data.assets.nonCurrentAssets.accumulatedDepreciation.balance),
              },
              {
                label: 'Net Equipment Value (NBV)',
                value: fmt(data.assets.nonCurrentAssets.equipmentNBV),
              },
              ...data.assets.nonCurrentAssets.custom.map((c) => ({
                label: c.name,
                value: fmt(c.balance),
              })),
            ],
            total: {
              label: 'Total Non-Current Assets',
              value: fmt(data.assets.nonCurrentAssets.totalNonCurrentAssets),
            },
          },
          {
            title: 'Liabilities',
            rows: [
              ...liabilitiesTree.map((n) => ({ label: n.label, value: fmt(n.amount) })),
              ...data.liabilities.currentLiabilities.custom.map((c) => ({
                label: c.name,
                value: fmt(c.balance),
              })),
            ],
            total: { label: 'Total Liabilities', value: fmt(data.liabilities.totalLiabilities) },
          },
          {
            title: 'Equity',
            rows: [
              ...equityTree.map((n) => ({ label: n.label, value: fmt(n.amount) })),
              ...data.equity.custom.map((c) => ({ label: c.name, value: fmt(c.balance) })),
            ],
            total: { label: 'Total Equity', value: fmt(data.equity.totalEquity) },
          },
        ]
      : [],
    summary: data
      ? [
          { label: 'Total Assets', value: fmt(data.assets.totalAssets) },
          {
            label: 'Total Liabilities & Equity',
            value: fmt(data.summary.accountingEquation.totalLiabilitiesPlusEquity),
          },
          {
            label: isBalanced ? 'Balanced ✓' : 'Difference',
            value: fmt(difference),
            bold: true,
          },
        ]
      : [],
  };

  return (
    <div className="bg-blue-50/50 min-h-full p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-slate-800 tracking-tight">Balance Sheet</h3>
          <p className="text-muted-foreground">Financial position as of {data?.asOfDate ?? '…'}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => refetch()}
            variant="outline"
            disabled={isFetching}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button
            onClick={() => setShowStatement(true)}
            disabled={!data || dataWarnings.length > 0}
            title={
              dataWarnings.length > 0
                ? 'Generate disabled: some figures may be incomplete due to service warnings'
                : undefined
            }
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText className="h-4 w-4" /> Generate Statement
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : isError || !data ? (
        <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-center">
          <p className="text-red-700 font-medium">Failed to load balance sheet. Please refresh.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {dataWarnings.length > 0 && (
            <div className="rounded-xl bg-amber-50 border border-amber-300 p-4 space-y-1">
              <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Data incomplete — some figures below may be understated. Statement generation is
                disabled until resolved.
              </div>
              <ul className="pl-6 list-disc space-y-0.5">
                {dataWarnings.map((w: string, i: number) => (
                  <li key={i} className="text-xs text-amber-700">
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div
            className={`flex items-center gap-2 rounded-xl p-3 border ${isBalanced ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}
          >
            <Scale className={`h-4 w-4 ${isBalanced ? 'text-emerald-600' : 'text-amber-600'}`} />
            <span
              className={`text-sm font-medium ${isBalanced ? 'text-emerald-700' : 'text-amber-700'}`}
            >
              {isBalanced
                ? 'Balance sheet is balanced — Assets = Liabilities + Equity ✓'
                : `Out of balance by ${formatCurrency(difference, currency)} — add equity or manual entries to reconcile`}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
            <StatCard
              title="Total Assets"
              value={fmt(data.assets.totalAssets)}
              subtitle="Cash + Fixed + Receivables + Inventory"
            />
            <StatCard
              title="Total Liabilities"
              value={fmt(data.liabilities.totalLiabilities)}
              subtitle="Payable to creditors"
            />
            <StatCard
              title="Total Equity"
              value={fmt(data.equity.totalEquity)}
              subtitle="Owner's net worth"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* ASSETS */}
            <div className="rounded-2xl bg-card shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="font-black text-blue-700 text-sm uppercase tracking-wide">ASSETS</h3>
              </div>
              <div className="divide-y divide-border">
                <div className="px-5 py-2 bg-muted/30 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Current Assets
                </div>
                {assetsTree
                  .filter((n) => n.key !== 'EQUIPMENT_ASSETS')
                  .map((n) => (
                    <DrilldownTree
                      key={n.key}
                      node={n}
                      currency={currency}
                      onView={(node) => setViewingLineItem({ section: 'ASSET', node })}
                    />
                  ))}
                <CustomAccountRows accounts={data.assets.currentAssets.custom} canManage={false} />
                <TotalRow
                  label="Total Current Assets"
                  value={data.assets.currentAssets.totalCurrentAssets}
                  currency={currency}
                />

                <div className="px-5 py-2 bg-muted/30 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Non-Current Assets
                </div>
                <PlainRow
                  label="Equipment (Gross Cost)"
                  value={data.assets.nonCurrentAssets.equipmentGrossCost.balance}
                  currency={currency}
                />
                <PlainRow
                  label="Less: Accumulated Depreciation"
                  value={-data.assets.nonCurrentAssets.accumulatedDepreciation.balance}
                  currency={currency}
                />
                {assetsTree
                  .filter((n) => n.key === 'EQUIPMENT_ASSETS')
                  .map((n) => (
                    <DrilldownTree
                      key={n.key}
                      node={{ ...n, label: 'Net Equipment Value (NBV)' }}
                      currency={currency}
                      onView={(node) => setViewingLineItem({ section: 'ASSET', node })}
                    />
                  ))}
                <CustomAccountRows
                  accounts={data.assets.nonCurrentAssets.custom}
                  canManage={false}
                />
                <TotalRow
                  label="Total Non-Current Assets"
                  value={data.assets.nonCurrentAssets.totalNonCurrentAssets}
                  currency={currency}
                />
                <TotalRow
                  label="TOTAL ASSETS"
                  value={data.assets.totalAssets}
                  currency={currency}
                  grand
                />
              </div>
            </div>

            {/* LIABILITIES + EQUITY */}
            <div className="rounded-2xl bg-card shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="font-black text-red-700 text-sm uppercase tracking-wide">
                  LIABILITIES & EQUITY
                </h3>
              </div>
              <div className="divide-y divide-border">
                <div className="px-5 py-2 bg-muted/30 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Current Liabilities
                </div>
                {liabilitiesTree.map((n) => (
                  <DrilldownTree
                    key={n.key}
                    node={n}
                    currency={currency}
                    onView={(node) => setViewingLineItem({ section: 'LIABILITY', node })}
                  />
                ))}
                <CustomAccountRows
                  accounts={data.liabilities.currentLiabilities.custom}
                  canManage={false}
                />
                <CustomAccountRows
                  accounts={data.liabilities.nonCurrentLiabilities.custom}
                  canManage={false}
                />
                <TotalRow
                  label="TOTAL LIABILITIES"
                  value={data.liabilities.totalLiabilities}
                  currency={currency}
                  grand
                />

                <div className="px-5 py-2 bg-muted/30 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Equity
                </div>
                {equityTree.map((n) => (
                  <DrilldownTree
                    key={n.key}
                    node={n}
                    currency={currency}
                    onView={(node) => setViewingLineItem({ section: 'EQUITY', node })}
                  />
                ))}
                <CustomAccountRows accounts={data.equity.custom} canManage={false} />
                <TotalRow
                  label="TOTAL EQUITY"
                  value={data.equity.totalEquity}
                  currency={currency}
                />
                <TotalRow
                  label="TOTAL LIABILITIES & EQUITY"
                  value={data.summary.accountingEquation.totalLiabilitiesPlusEquity}
                  currency={currency}
                  grand
                />
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Same live balances as Chart of Accounts · Cash &amp; bank from live account balances ·
            Fixed assets from depreciation register (NBV) · AR = outstanding invoices + manual
            receivables · Inventory from live spare parts / product stock value · VAT payable = tax
            collected minus reclaimable input VAT minus remitted · Retained Earnings = all-time
            revenue − all-time expenses (incl. vendor purchases/COGS) − all-time depreciation
          </p>
        </div>
      )}

      {viewingLineItem && (
        <LineItemDetailDispatcher
          section={viewingLineItem.section}
          node={viewingLineItem.node}
          periodFrom={periodFrom}
          periodTo={periodTo}
          isAdmin={currentUser?.role === 'ADMIN'}
          cashBankPagePath="/finance/accounts/cash-bank"
          assetsPagePath="/finance/accounts/assets"
          onClose={() => setViewingLineItem(null)}
        />
      )}
      {showStatement && data && (
        <StatementDialog
          open
          onOpenChange={(o) => !o && setShowStatement(false)}
          data={statementData}
          branch={branchInfo}
        />
      )}
    </div>
  );
}
