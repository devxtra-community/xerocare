'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { Building2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import {
  fetchConsolidatedKPIs,
  fetchConsolidatedPL,
  fetchConsolidatedBalanceSheet,
} from '@/lib/finance/accountsApi';
import { formatCurrency } from '@/lib/format';
import StatCard from '@/components/StatCard';
import { SimpleBarChart, SimpleLineChart } from '@/components/accounts/charts';

export default function BranchDeepDivePage() {
  const { branchId } = useParams<{ branchId: string }>();

  const params = { branchIds: branchId };

  const { data: kpis, isLoading } = useQuery({
    queryKey: ['admin-branch-kpis', branchId],
    queryFn: () => fetchConsolidatedKPIs(params),
  });

  const { data: pl } = useQuery({
    queryKey: ['admin-branch-pl', branchId],
    queryFn: () =>
      fetchConsolidatedPL(params) as Promise<{
        monthly: { month: string; income: number; expenses: number }[];
      }>,
  });

  const { data: bs } = useQuery({
    queryKey: ['admin-branch-bs', branchId],
    queryFn: () =>
      fetchConsolidatedBalanceSheet(params) as Promise<{
        totalAssets: number;
        totalLiabilities: number;
        totalEquity: number;
        cashAndBank: number;
        receivables: number;
        payables: number;
      }>,
  });

  return (
    <div className="bg-gray-50 min-h-full p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/accounts"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="h-4 w-px bg-gray-300" />
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-blue-600" />
          <h1 className="text-xl font-bold text-gray-900">Branch Deep Dive</h1>
          <span className="bg-blue-100 text-blue-700 text-xs font-mono px-2 py-0.5 rounded">
            {branchId?.slice(0, 8)}…
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-gray-400">Loading branch data…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard
              title="Net Profit"
              value={formatCurrency(kpis?.netProfit ?? 0)}
              subtitle="This period"
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
              title="Cash"
              value={formatCurrency(kpis?.totalCash ?? 0)}
              subtitle="Cash accounts"
            />
            <StatCard
              title="Bank"
              value={formatCurrency(kpis?.totalBank ?? 0)}
              subtitle="Bank accounts"
            />
            <StatCard
              title="Overdue"
              value={formatCurrency(kpis?.overdueReceivables ?? 0)}
              subtitle="90+ days"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">
                Monthly Income vs Expenses
              </h3>
              <SimpleBarChart
                data={pl?.monthly ?? []}
                xKey="month"
                bars={[
                  { key: 'income', color: '#10b981', label: 'Income' },
                  { key: 'expenses', color: '#ef4444', label: 'Expenses' },
                ]}
                height={240}
              />
            </div>

            <div className="bg-white rounded-xl border p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Balance Sheet Snapshot</h3>
              <div className="space-y-3">
                {[
                  { label: 'Total Assets', value: bs?.totalAssets ?? 0, color: 'text-blue-600' },
                  {
                    label: 'Total Liabilities',
                    value: bs?.totalLiabilities ?? 0,
                    color: 'text-red-600',
                  },
                  { label: 'Total Equity', value: bs?.totalEquity ?? 0, color: 'text-emerald-600' },
                  { label: 'Cash & Bank', value: bs?.cashAndBank ?? 0, color: 'text-gray-700' },
                  { label: 'Receivables', value: bs?.receivables ?? 0, color: 'text-gray-700' },
                  { label: 'Payables', value: bs?.payables ?? 0, color: 'text-gray-700' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <span className="text-sm text-gray-600">{item.label}</span>
                    <span className={`text-sm font-semibold ${item.color}`}>
                      {formatCurrency(item.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Net Profit Trend</h3>
            <SimpleLineChart
              data={(pl?.monthly ?? []).map((r) => ({ ...r, net: r.income - r.expenses }))}
              xKey="month"
              lines={[{ key: 'net', color: '#6366f1', label: 'Net P&L' }]}
              height={200}
            />
          </div>
        </>
      )}
    </div>
  );
}
