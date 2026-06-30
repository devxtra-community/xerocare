'use client';

import React, { Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Download } from 'lucide-react';
import {
  fetchEquitySummary,
  fetchEquityEntries,
  fetchEquityCharts,
} from '@/lib/finance/accountsApi';
import { formatCurrency } from '@/lib/format';
import StatCard from '@/components/StatCard';
import { DonutChart, SimpleLineChart } from '@/components/accounts/charts';
import BranchFilterBar from '@/components/accounts/admin/BranchFilterBar';
import * as XLSX from 'xlsx';

const TYPE_COLORS: Record<string, string> = {
  SHARE_CAPITAL: 'bg-blue-100 text-blue-700',
  RETAINED_EARNINGS: 'bg-emerald-100 text-emerald-700',
  RESERVES: 'bg-purple-100 text-purple-700',
  OWNER_CONTRIBUTION: 'bg-indigo-100 text-indigo-700',
  DIVIDEND: 'bg-red-100 text-red-700',
  PROFIT_TRANSFER: 'bg-green-100 text-green-700',
  LOSS_TRANSFER: 'bg-orange-100 text-orange-700',
  OTHER: 'bg-gray-100 text-gray-700',
};

function EquityContent() {
  const searchParams = useSearchParams();
  const branchIds = searchParams.get('branchIds') ?? '';

  const params: Record<string, string> = {};
  if (branchIds) params.branchIds = branchIds;

  const { data: summary } = useQuery({
    queryKey: ['admin-equity-sum', branchIds],
    queryFn: () => fetchEquitySummary(params),
  });
  const { data: entries = [] } = useQuery({
    queryKey: ['admin-equity-entries', branchIds],
    queryFn: () => fetchEquityEntries(params),
  });
  const { data: charts } = useQuery({
    queryKey: ['admin-equity-charts', branchIds],
    queryFn: () =>
      fetchEquityCharts(params) as Promise<{
        growthTrend: { month: string; equity: number }[];
        composition: { name: string; value: number }[];
      }>,
  });

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      entries.map((e) => ({
        'Entry No': e.entryNo,
        Date: e.date,
        Type: e.type,
        Description: e.description,
        Amount: e.amount,
        Currency: e.currency,
      })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Equity');
    XLSX.writeFile(wb, 'consolidated_equity.xlsx');
  };

  return (
    <div className="bg-gray-50 min-h-full p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Equity — Consolidated</h1>
          <p className="text-sm text-gray-500">All branches in AED</p>
        </div>
        <button
          onClick={exportExcel}
          className="flex items-center gap-1.5 text-sm border rounded-lg px-3 py-2 bg-white hover:bg-gray-50"
        >
          <Download className="h-4 w-4" /> Export
        </button>
      </div>

      <BranchFilterBar />

      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 text-white">
        <p className="text-sm font-medium opacity-80 mb-1">Net Equity (Consolidated)</p>
        <p className="text-4xl font-bold">{formatCurrency(summary?.netEquity ?? 0)}</p>
        <div className="flex gap-6 mt-4 text-sm">
          <span>
            Total Assets: <strong>{formatCurrency(summary?.totalAssets ?? 0)}</strong>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          title="Share Capital"
          value={formatCurrency(summary?.shareCapital ?? 0)}
          subtitle="Paid-in"
        />
        <StatCard
          title="Retained Earnings"
          value={formatCurrency(summary?.retainedEarnings ?? 0)}
          subtitle="Accumulated"
        />
        <StatCard
          title="Owner Contribution"
          value={formatCurrency(summary?.ownerContribution ?? 0)}
          subtitle="Capital input"
        />
        <StatCard title="Total Entries" value={entries.length.toString()} subtitle="Records" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">Equity Composition</h3>
          <DonutChart data={charts?.composition ?? []} height={240} />
        </div>
        <div className="bg-white rounded-xl border p-4">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">Equity Growth Trend</h3>
          <SimpleLineChart
            data={charts?.growthTrend ?? []}
            xKey="month"
            lines={[{ key: 'equity', color: '#6366f1', label: 'Equity' }]}
            height={240}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h3 className="text-sm font-semibold text-gray-700">Recent Equity Entries</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                {['Entry No', 'Date', 'Type', 'Description', 'Amount', 'Currency'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400">
                    No equity entries found
                  </td>
                </tr>
              ) : (
                entries.slice(0, 30).map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{e.entryNo}</td>
                    <td className="px-4 py-3">{String(e.date).slice(0, 10)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[e.type] ?? 'bg-gray-100 text-gray-700'}`}
                      >
                        {e.type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[200px] truncate text-gray-600">
                      {e.description}
                    </td>
                    <td className="px-4 py-3 font-semibold">{formatCurrency(e.amount)}</td>
                    <td className="px-4 py-3 text-gray-500">{e.currency}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function AdminEquityPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading…</div>}>
      <EquityContent />
    </Suspense>
  );
}
