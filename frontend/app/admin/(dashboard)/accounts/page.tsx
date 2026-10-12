'use client';

import React, { Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import {
  fetchConsolidatedKPIs,
  fetchBranchPerformance,
  fetchBranchComparison,
  fetchConsolidatedPL,
} from '@/lib/finance/accountsApi';
import { AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { useBranchCurrency } from '@/lib/hooks/useBranchCurrency';
import StatCard from '@/components/StatCard';
import { SimpleBarChart } from '@/components/accounts/charts';
import BranchFilterBar from '@/components/accounts/admin/BranchFilterBar';
import Link from 'next/link';
import { useBranchNameMap } from '@/hooks/useBranchNameMap';

const STATUS_STYLE: Record<string, string> = {
  HEALTHY: 'bg-success/10 text-success',
  WATCH: 'bg-warning/10 text-warning',
  ALERT: 'bg-destructive/10 text-destructive',
};

function AccountsOverviewContent() {
  const currency = useBranchCurrency();
  const { getBranchName } = useBranchNameMap();
  const searchParams = useSearchParams();
  const branchIds = searchParams.get('branchIds') ?? '';
  const period = searchParams.get('period') ?? 'this_year';

  const params: Record<string, string> = { period };
  if (branchIds) params.branchIds = branchIds;

  const { data: kpis, isLoading: kpiLoading } = useQuery({
    queryKey: ['admin-kpis', branchIds, period],
    queryFn: () => fetchConsolidatedKPIs(params),
  });

  const { data: branchPerf = [], isLoading: perfLoading } = useQuery({
    queryKey: ['admin-branch-perf', branchIds, period],
    queryFn: () => fetchBranchPerformance(params),
  });

  const { data: comparison = [] } = useQuery({
    queryKey: ['admin-branch-comparison', branchIds, period],
    queryFn: () =>
      fetchBranchComparison(params) as Promise<
        { name: string; revenue: number; expenses: number; net: number }[]
      >,
  });

  const { data: pl } = useQuery({
    queryKey: ['admin-pl', branchIds, period],
    queryFn: () =>
      fetchConsolidatedPL(params) as Promise<{
        monthly: { month: string; income: number; expenses: number }[];
        dataWarnings?: string[];
      }>,
  });

  const dataWarnings: string[] = pl?.dataWarnings ?? [];

  return (
    <div className="bg-card min-h-full p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-medium text-foreground">
            Accounts — Consolidated View
          </h1>
          <p className="text-sm text-muted-foreground">All branches consolidated in AED</p>
        </div>
      </div>

      <BranchFilterBar showPeriod />

      {dataWarnings.length > 0 && (
        <div className="rounded-xl bg-warning/10 border border-warning/30 p-4 space-y-1">
          <div className="flex items-center gap-2 text-warning font-semibold text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Consolidated figures are incomplete — one or more services were unavailable. Figures
            shown may be understated.
          </div>
          <ul className="pl-6 list-disc space-y-0.5">
            {dataWarnings.map((w, i) => (
              <li key={i} className="text-xs text-warning">
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* KPI Cards */}
      {kpiLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 bg-card rounded-xl border animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard
            title="Net Profit"
            value={formatCurrency(kpis?.netProfit ?? 0, currency)}
            subtitle="Consolidated"
          />
          <StatCard
            title="Total Receivable"
            value={formatCurrency(kpis?.totalReceivable ?? 0, currency)}
            subtitle="Outstanding"
          />
          <StatCard
            title="Total Payable"
            value={formatCurrency(kpis?.totalPayable ?? 0, currency)}
            subtitle="Outstanding"
          />
          <StatCard
            title="Total Cash"
            value={formatCurrency(kpis?.totalCash ?? 0, currency)}
            subtitle="Cash accounts"
          />
          <StatCard
            title="Total Bank"
            value={formatCurrency(kpis?.totalBank ?? 0, currency)}
            subtitle="Bank accounts"
          />
          <StatCard
            title="Overdue 90+"
            value={formatCurrency(kpis?.overdueReceivables ?? 0, currency)}
            subtitle="Critical"
          />
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Monthly Revenue vs Expenses
          </h3>
          <SimpleBarChart
            data={pl?.monthly ?? []}
            xKey="month"
            bars={[
              { key: 'income', color: 'var(--chart-profit)', label: 'Revenue' },
              { key: 'expenses', color: 'var(--destructive)', label: 'Expenses' },
            ]}
            height={240}
            currency={currency}
          />
        </div>

        <div className="bg-card rounded-xl border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Branch Revenue Comparison</h3>
          <SimpleBarChart
            data={comparison}
            xKey="name"
            bars={[
              { key: 'revenue', color: 'var(--chart-blue-mid)', label: 'Revenue' },
              { key: 'expenses', color: 'var(--rent)', label: 'Expenses' },
            ]}
            height={240}
            currency={currency}
          />
        </div>

        <div className="md:col-span-2 bg-card rounded-xl border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Net Profit by Branch</h3>
          <SimpleBarChart
            data={comparison}
            xKey="name"
            bars={[{ key: 'net', color: 'var(--chart-indigo)', label: 'Net Profit' }]}
            height={200}
            currency={currency}
          />
        </div>
      </div>

      {/* Branch Performance Table */}
      <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Branch Performance</h3>
          <span className="text-xs text-muted-foreground">AED consolidated</span>
        </div>
        {perfLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-xs uppercase text-muted-foreground">
                <tr>
                  {[
                    'Branch',
                    'Revenue',
                    'Expenses',
                    'Net Profit',
                    'Margin',
                    'Receivables',
                    'Payables',
                    'Status',
                    '',
                  ].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {branchPerf.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-muted-foreground">
                      No branch data
                    </td>
                  </tr>
                ) : (
                  branchPerf.map((row) => (
                    <tr key={row.branchId} className="hover:bg-muted">
                      <td className="px-4 py-3 text-foreground font-medium">
                        {getBranchName(row.branchId)}
                      </td>
                      <td className="px-4 py-3 text-success">
                        {formatCurrency(row.revenue, currency)}
                      </td>
                      <td className="px-4 py-3 text-destructive">
                        {formatCurrency(row.expenses, currency)}
                      </td>
                      <td
                        className={`px-4 py-3 font-semibold ${row.netProfit >= 0 ? 'text-success' : 'text-destructive'}`}
                      >
                        {formatCurrency(row.netProfit, currency)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {row.marginPct?.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3">{formatCurrency(row.receivables, currency)}</td>
                      <td className="px-4 py-3">{formatCurrency(row.payables, currency)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLE[row.status] ?? 'bg-muted text-foreground'}`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/accounts/branch/${row.branchId}`}
                          className="text-xs text-primary hover:underline"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Profit & Loss', href: '/admin/accounts/profit-loss' },
          { label: 'Balance Sheet', href: '/admin/accounts/cash-bank' },
          { label: 'Receivables', href: '/admin/accounts/receivable' },
          { label: 'Reports Hub', href: '/admin/accounts/reports' },
          { label: 'Data Integrity', href: '/admin/accounts/data-integrity' },
        ].map((l) => (
          <Link
            key={l.label}
            href={l.href}
            className="flex items-center justify-between p-4 bg-card rounded-xl border hover:shadow-md transition-shadow text-sm font-medium text-foreground"
          >
            {l.label} <span className="text-primary">→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function AdminAccountsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading…</div>}>
      <AccountsOverviewContent />
    </Suspense>
  );
}
