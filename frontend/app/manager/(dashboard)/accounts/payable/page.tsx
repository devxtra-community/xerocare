'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Eye, Search, Download } from 'lucide-react';
import { fetchManualPayables, fetchPayableCharts } from '@/lib/finance/accountsApi';
import { formatCurrency } from '@/lib/format';
import StatCard from '@/components/StatCard';
import { DonutChart, HorizontalBarChart, SimpleBarChart } from '@/components/accounts/charts';
import * as XLSX from 'xlsx';

const AGING_COLORS: Record<string, string> = {
  Current: 'bg-emerald-100 text-emerald-700',
  '1-30 days': 'bg-yellow-100 text-yellow-700',
  '31-60 days': 'bg-orange-100 text-orange-700',
  '61-90 days': 'bg-red-100 text-red-700',
  '90+ days': 'bg-red-200 text-red-800',
};

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  PARTIAL: 'bg-blue-100 text-blue-700',
  PAID: 'bg-emerald-100 text-emerald-700',
  OVERDUE: 'bg-red-100 text-red-700',
};

export default function ManagerPayablePage() {
  const [search, setSearch] = useState('');

  const { data: payables = [], isLoading } = useQuery({
    queryKey: ['mgr-payables'],
    queryFn: () => fetchManualPayables(),
  });

  const { data: charts } = useQuery({
    queryKey: ['mgr-pay-charts'],
    queryFn: () =>
      fetchPayableCharts() as Promise<{
        byType: { name: string; value: number }[];
        topVendors: { name: string; value: number }[];
        monthlyPayments: { month: string; amount: number }[];
      }>,
  });

  const filtered = useMemo(
    () =>
      payables.filter(
        (p) =>
          !search ||
          p.payableTo?.toLowerCase().includes(search.toLowerCase()) ||
          p.referenceNo?.toLowerCase().includes(search.toLowerCase()),
      ),
    [payables, search],
  );

  const totalOutstanding = payables.reduce(
    (s, p) => s + (Number(p.amount) - Number(p.amountPaid ?? 0)),
    0,
  );
  const overdue = payables
    .filter((p) => p.aging && p.aging !== 'Current')
    .reduce((s, p) => s + (Number(p.amount) - Number(p.amountPaid ?? 0)), 0);

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      filtered.map((p) => ({
        Ref: p.referenceNo,
        'Payable To': p.payableTo,
        Amount: p.amount,
        Paid: p.amountPaid,
        Outstanding: Number(p.amount) - Number(p.amountPaid ?? 0),
        Status: p.status,
      })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Payables');
    XLSX.writeFile(wb, 'payables.xlsx');
  };

  return (
    <div className="bg-blue-50/50 min-h-full p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Eye className="h-6 w-6 text-blue-600" /> Accounts Payable
          </h1>
          <p className="text-sm text-gray-500">Your branch payables — view only</p>
        </div>
        <div className="flex gap-2">
          <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1">
            <Eye className="h-3 w-3" /> View Only
          </span>
          <button
            onClick={exportExcel}
            className="flex items-center gap-1.5 text-sm border rounded-lg px-3 py-2 bg-white hover:bg-gray-50"
          >
            <Download className="h-4 w-4" /> Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          title="Total Outstanding"
          value={formatCurrency(totalOutstanding)}
          subtitle="All payables"
        />
        <StatCard title="Overdue" value={formatCurrency(overdue)} subtitle="Past due" />
        <StatCard title="Total Entries" value={payables.length.toString()} subtitle="Records" />
        <StatCard title="Shown" value={filtered.length.toString()} subtitle="Filtered" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">By Type</h3>
          <DonutChart data={charts?.byType ?? []} height={220} />
        </div>
        <div className="md:col-span-2 bg-white rounded-xl border p-4">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">Monthly Payments</h3>
          <SimpleBarChart
            data={charts?.monthlyPayments ?? []}
            xKey="month"
            bars={[{ key: 'amount', color: '#ef4444', label: 'Payments' }]}
            height={220}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border p-4">
        <h3 className="text-sm font-semibold text-gray-600 mb-3">Top Payees by Outstanding</h3>
        <HorizontalBarChart data={charts?.topVendors ?? []} height={200} color="#f59e0b" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search payee or reference..."
              className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  {[
                    'Reference',
                    'Payable To',
                    'Type',
                    'Amount',
                    'Paid',
                    'Outstanding',
                    'Aging',
                    'Status',
                  ].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-400">
                      No payables found
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => {
                    const aging = p.aging ?? 'Current';
                    return (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">
                          {p.referenceNo}
                        </td>
                        <td className="px-4 py-3">{p.payableTo}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {p.type?.replace(/_/g, ' ')}
                        </td>
                        <td className="px-4 py-3">{formatCurrency(p.amount)}</td>
                        <td className="px-4 py-3 text-emerald-600">
                          {formatCurrency(p.amountPaid ?? 0)}
                        </td>
                        <td className="px-4 py-3 font-semibold">
                          {formatCurrency(Number(p.amount) - Number(p.amountPaid ?? 0))}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${AGING_COLORS[aging] ?? 'bg-gray-100 text-gray-700'}`}
                          >
                            {aging}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[p.status] ?? 'bg-gray-100 text-gray-700'}`}
                          >
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
