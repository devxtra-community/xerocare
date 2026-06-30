'use client';

import React, { Suspense, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Search, Download } from 'lucide-react';
import { fetchManualReceivables, fetchReceivableCharts } from '@/lib/finance/accountsApi';
import { formatCurrency } from '@/lib/format';
import StatCard from '@/components/StatCard';
import { DonutChart, SimpleLineChart, HorizontalBarChart } from '@/components/accounts/charts';
import BranchFilterBar from '@/components/accounts/admin/BranchFilterBar';
import * as XLSX from 'xlsx';

const AGING_COLORS: Record<string, string> = {
  Current: 'bg-emerald-100 text-emerald-700',
  '1-30 days': 'bg-yellow-100 text-yellow-700',
  '31-60 days': 'bg-orange-100 text-orange-700',
  '61-90 days': 'bg-red-100 text-red-700',
  '90+ days': 'bg-red-200 text-red-800',
};

function ReceivableContent() {
  const searchParams = useSearchParams();
  const branchIds = searchParams.get('branchIds') ?? '';
  const [search, setSearch] = useState('');

  const params: Record<string, string> = {};
  if (branchIds) params.branchIds = branchIds;

  const { data: manual = [] } = useQuery({
    queryKey: ['admin-receivables', branchIds],
    queryFn: () => fetchManualReceivables(params),
  });
  const { data: charts } = useQuery({
    queryKey: ['admin-rcv-charts', branchIds],
    queryFn: () =>
      fetchReceivableCharts(params) as Promise<{
        collectionRate: { month: string; issued: number; collected: number }[];
        byType: { name: string; value: number }[];
        topCustomers: { name: string; value: number }[];
      }>,
  });

  const filtered = useMemo(
    () =>
      manual.filter(
        (r) =>
          !search ||
          r.customerName?.toLowerCase().includes(search.toLowerCase()) ||
          r.referenceNo?.toLowerCase().includes(search.toLowerCase()),
      ),
    [manual, search],
  );

  const totalOutstanding = manual.reduce((s, r) => s + Number(r.outstanding), 0);
  const overdue = manual
    .filter((r) => r.aging !== 'Current')
    .reduce((s, r) => s + Number(r.outstanding), 0);

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      filtered.map((r) => ({
        Ref: r.referenceNo,
        Customer: r.customerName,
        Amount: r.amount,
        Outstanding: r.outstanding,
        Aging: r.aging,
        Status: r.status,
      })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Receivables');
    XLSX.writeFile(wb, 'consolidated_receivables.xlsx');
  };

  return (
    <div className="bg-gray-50 min-h-full p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Receivables — Consolidated</h1>
          <p className="text-sm text-gray-500">All branches</p>
        </div>
        <button
          onClick={exportExcel}
          className="flex items-center gap-1.5 text-sm border rounded-lg px-3 py-2 bg-white hover:bg-gray-50"
        >
          <Download className="h-4 w-4" /> Export
        </button>
      </div>

      <BranchFilterBar />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          title="Total Outstanding"
          value={formatCurrency(totalOutstanding)}
          subtitle="All branches"
        />
        <StatCard title="Overdue" value={formatCurrency(overdue)} subtitle="Past due date" />
        <StatCard title="Total Entries" value={manual.length.toString()} subtitle="Records" />
        <StatCard title="Shown" value={filtered.length.toString()} subtitle="Filtered" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-white rounded-xl border p-4">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">Collection Rate Trend</h3>
          <SimpleLineChart
            data={charts?.collectionRate ?? []}
            xKey="month"
            lines={[
              { key: 'issued', color: '#3b82f6', label: 'Issued' },
              { key: 'collected', color: '#10b981', label: 'Collected' },
            ]}
            height={220}
          />
        </div>
        <div className="bg-white rounded-xl border p-4">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">By Type</h3>
          <DonutChart data={charts?.byType ?? []} height={220} />
        </div>
      </div>

      <div className="bg-white rounded-xl border p-4">
        <h3 className="text-sm font-semibold text-gray-600 mb-3">Top Customers</h3>
        <HorizontalBarChart data={charts?.topCustomers ?? []} height={200} color="#8b5cf6" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer or reference..."
              className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                {['Reference', 'Customer', 'Type', 'Amount', 'Outstanding', 'Aging', 'Status'].map(
                  (h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400">
                    No receivables found
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.referenceNo}</td>
                    <td className="px-4 py-3">{r.customerName}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {r.type?.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-3">{formatCurrency(r.amount)}</td>
                    <td className="px-4 py-3 font-semibold">{formatCurrency(r.outstanding)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${AGING_COLORS[r.aging] ?? 'bg-gray-100 text-gray-700'}`}
                      >
                        {r.aging}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{r.status}</td>
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

export default function AdminReceivablePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading…</div>}>
      <ReceivableContent />
    </Suspense>
  );
}
