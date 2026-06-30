'use client';

import React, { Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Download } from 'lucide-react';
import { fetchConsolidatedPL } from '@/lib/finance/accountsApi';
import { formatCurrency } from '@/lib/format';
import StatCard from '@/components/StatCard';
import { SimpleBarChart, SimpleLineChart } from '@/components/accounts/charts';
import BranchFilterBar from '@/components/accounts/admin/BranchFilterBar';
import * as XLSX from 'xlsx';

function PLContent() {
  const searchParams = useSearchParams();
  const branchIds = searchParams.get('branchIds') ?? '';
  const period = searchParams.get('period') ?? 'this_year';

  const params: Record<string, string> = { period };
  if (branchIds) params.branchIds = branchIds;

  const { data: pl, isLoading } = useQuery({
    queryKey: ['admin-pl', branchIds, period],
    queryFn: () =>
      fetchConsolidatedPL(params) as Promise<{
        monthly: { month: string; income: number; expenses: number }[];
        totalIncome: number;
        totalExpenses: number;
        netProfit: number;
        margin: number;
      }>,
  });

  const monthly = pl?.monthly ?? [];
  const withNet = monthly.map((r) => ({ ...r, net: r.income - r.expenses }));

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet([
      ...withNet.map((r) => ({
        Month: r.month,
        Income: r.income,
        Expenses: r.expenses,
        'Net P&L': r.net,
      })),
      {
        Month: 'TOTAL',
        Income: pl?.totalIncome ?? 0,
        Expenses: pl?.totalExpenses ?? 0,
        'Net P&L': pl?.netProfit ?? 0,
      },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'P&L');
    XLSX.writeFile(wb, 'consolidated_pl.xlsx');
  };

  return (
    <div className="bg-gray-50 min-h-full p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profit & Loss — Consolidated</h1>
          <p className="text-sm text-gray-500">All branches in AED</p>
        </div>
        <button
          onClick={exportExcel}
          className="flex items-center gap-1.5 text-sm border rounded-lg px-3 py-2 bg-white hover:bg-gray-50"
        >
          <Download className="h-4 w-4" /> Export
        </button>
      </div>

      <BranchFilterBar showPeriod />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(pl?.totalIncome ?? 0)}
          subtitle="Period"
        />
        <StatCard
          title="Total Expenses"
          value={formatCurrency(pl?.totalExpenses ?? 0)}
          subtitle="Period"
        />
        <StatCard title="Net Profit" value={formatCurrency(pl?.netProfit ?? 0)} subtitle="Period" />
        <StatCard
          title="Margin"
          value={`${pl?.margin?.toFixed(1) ?? 0}%`}
          subtitle="Profit margin"
        />
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-gray-400">Loading…</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">
                Monthly Income vs Expenses
              </h3>
              <SimpleBarChart
                data={monthly}
                xKey="month"
                bars={[
                  { key: 'income', color: '#10b981', label: 'Income' },
                  { key: 'expenses', color: '#ef4444', label: 'Expenses' },
                ]}
                height={260}
              />
            </div>
            <div className="bg-white rounded-xl border p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Net Profit Trend</h3>
              <SimpleLineChart
                data={withNet}
                xKey="month"
                lines={[{ key: 'net', color: '#6366f1', label: 'Net P&L' }]}
                height={260}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="px-5 py-4 border-b">
              <h3 className="font-semibold text-gray-800">Monthly P&L Statement</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Month</th>
                    <th className="px-4 py-3 text-right font-medium">Revenue</th>
                    <th className="px-4 py-3 text-right font-medium">Expenses</th>
                    <th className="px-4 py-3 text-right font-medium">Net P&L</th>
                    <th className="px-4 py-3 text-right font-medium">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {withNet.map((row) => {
                    const m = row.income > 0 ? (row.net / row.income) * 100 : 0;
                    return (
                      <tr key={row.month} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{row.month}</td>
                        <td className="px-4 py-3 text-right text-emerald-600">
                          {formatCurrency(row.income)}
                        </td>
                        <td className="px-4 py-3 text-right text-red-600">
                          {formatCurrency(row.expenses)}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-semibold ${row.net >= 0 ? 'text-emerald-700' : 'text-red-700'}`}
                        >
                          {formatCurrency(row.net)}
                        </td>
                        <td
                          className={`px-4 py-3 text-right text-xs ${m >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                        >
                          {m.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-100 font-semibold border-t-2">
                  <tr>
                    <td className="px-4 py-3">Total</td>
                    <td className="px-4 py-3 text-right text-emerald-700">
                      {formatCurrency(pl?.totalIncome ?? 0)}
                    </td>
                    <td className="px-4 py-3 text-right text-red-700">
                      {formatCurrency(pl?.totalExpenses ?? 0)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right ${(pl?.netProfit ?? 0) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}
                    >
                      {formatCurrency(pl?.netProfit ?? 0)}
                    </td>
                    <td className="px-4 py-3 text-right text-xs">{pl?.margin?.toFixed(1) ?? 0}%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function AdminPLPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading…</div>}>
      <PLContent />
    </Suspense>
  );
}
