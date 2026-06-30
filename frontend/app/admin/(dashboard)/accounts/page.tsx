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
import { formatCurrency } from '@/lib/format';
import StatCard from '@/components/StatCard';
import { SimpleBarChart } from '@/components/accounts/charts';
import BranchFilterBar from '@/components/accounts/admin/BranchFilterBar';
import Link from 'next/link';

const STATUS_STYLE: Record<string, string> = {
  HEALTHY: 'bg-emerald-100 text-emerald-700',
  WATCH: 'bg-yellow-100 text-yellow-700',
  ALERT: 'bg-red-100 text-red-700',
};

function AccountsOverviewContent() {
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
      }>,
  });

  return (
    <div className="bg-gray-50 min-h-full p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Accounts — Consolidated View</h1>
          <p className="text-sm text-gray-500">All branches consolidated in AED</p>
        </div>
      </div>

      <BranchFilterBar showPeriod />

      {/* KPI Cards */}
      {kpiLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 bg-white rounded-xl border animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard
            title="Net Profit"
            value={formatCurrency(kpis?.netProfit ?? 0)}
            subtitle="Consolidated"
          />
          <StatCard
            title="Total Receivable"
            value={formatCurrency(kpis?.totalReceivable ?? 0)}
            subtitle="Outstanding"
          />
          <StatCard
            title="Total Payable"
            value={formatCurrency(kpis?.totalPayable ?? 0)}
            subtitle="Outstanding"
          />
          <StatCard
            title="Total Cash"
            value={formatCurrency(kpis?.totalCash ?? 0)}
            subtitle="Cash accounts"
          />
          <StatCard
            title="Total Bank"
            value={formatCurrency(kpis?.totalBank ?? 0)}
            subtitle="Bank accounts"
          />
          <StatCard
            title="Overdue 90+"
            value={formatCurrency(kpis?.overdueReceivables ?? 0)}
            subtitle="Critical"
          />
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Monthly Revenue vs Expenses</h3>
          <SimpleBarChart
            data={pl?.monthly ?? []}
            xKey="month"
            bars={[
              { key: 'income', color: '#10b981', label: 'Revenue' },
              { key: 'expenses', color: '#ef4444', label: 'Expenses' },
            ]}
            height={240}
          />
        </div>

        <div className="bg-white rounded-xl border p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Branch Revenue Comparison</h3>
          <SimpleBarChart
            data={comparison}
            xKey="name"
            bars={[
              { key: 'revenue', color: '#3b82f6', label: 'Revenue' },
              { key: 'expenses', color: '#f97316', label: 'Expenses' },
            ]}
            height={240}
          />
        </div>

        <div className="md:col-span-2 bg-white rounded-xl border p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Net Profit by Branch</h3>
          <SimpleBarChart
            data={comparison}
            xKey="name"
            bars={[{ key: 'net', color: '#6366f1', label: 'Net Profit' }]}
            height={200}
          />
        </div>
      </div>

      {/* Branch Performance Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Branch Performance</h3>
          <span className="text-xs text-gray-400">AED consolidated</span>
        </div>
        {perfLoading ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  {[
                    'Branch ID',
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
                    <td colSpan={9} className="text-center py-8 text-gray-400">
                      No branch data
                    </td>
                  </tr>
                ) : (
                  branchPerf.map((row) => (
                    <tr key={row.branchId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">
                        {row.branchId.slice(0, 8)}…
                      </td>
                      <td className="px-4 py-3 text-emerald-600">{formatCurrency(row.revenue)}</td>
                      <td className="px-4 py-3 text-red-600">{formatCurrency(row.expenses)}</td>
                      <td
                        className={`px-4 py-3 font-semibold ${row.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}
                      >
                        {formatCurrency(row.netProfit)}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{row.marginPct?.toFixed(1)}%</td>
                      <td className="px-4 py-3">{formatCurrency(row.receivables)}</td>
                      <td className="px-4 py-3">{formatCurrency(row.payables)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLE[row.status] ?? 'bg-gray-100 text-gray-600'}`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/accounts/branch/${row.branchId}`}
                          className="text-xs text-blue-600 hover:underline"
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
        ].map((l) => (
          <Link
            key={l.label}
            href={l.href}
            className="flex items-center justify-between p-4 bg-white rounded-xl border hover:shadow-md transition-shadow text-sm font-medium text-gray-700"
          >
            {l.label} <span className="text-blue-500">→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function AdminAccountsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading…</div>}>
      <AccountsOverviewContent />
    </Suspense>
  );
}
