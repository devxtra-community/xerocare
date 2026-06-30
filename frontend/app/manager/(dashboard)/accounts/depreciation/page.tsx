'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Eye, Search, Download } from 'lucide-react';
import {
  fetchAssetRegister,
  fetchDepreciationCharts,
  AssetDepreciationRegister,
} from '@/lib/finance/accountsApi';
import { formatCurrency } from '@/lib/format';
import StatCard from '@/components/StatCard';
import { SimpleBarChart, SimpleLineChart } from '@/components/accounts/charts';
import * as XLSX from 'xlsx';

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  DISPOSED: 'bg-red-100 text-red-700',
  FULLY_DEPRECIATED: 'bg-gray-100 text-gray-600',
};

export default function ManagerDepreciationPage() {
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('ALL');

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['mgr-assets'],
    queryFn: () => fetchAssetRegister(),
  });

  const { data: charts } = useQuery({
    queryKey: ['mgr-dep-charts'],
    queryFn: () =>
      fetchDepreciationCharts() as Promise<{
        costVsNbv: { name: string; cost: number; nbv: number }[];
        monthlyCharge: { month: string; amount: number }[];
      }>,
  });

  const categories = [...new Set(assets.map((a) => a.method))];

  const filtered = assets.filter((a) => {
    const matchCat = catFilter === 'ALL' || a.method === catFilter;
    const matchSearch =
      !search ||
      a.id?.toLowerCase().includes(search.toLowerCase()) ||
      a.productId?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const totalCost = assets.reduce((s, a) => s + Number(a.purchasePrice ?? 0), 0);
  const totalNBV = assets.reduce((s, a) => s + Number(a.nbv ?? 0), 0);
  const totalAccDep = assets.reduce((s, a) => s + Number(a.accumulated ?? 0), 0);
  const activeCount = assets.filter((a) => a.status === 'ACTIVE').length;

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      filtered.map((a: AssetDepreciationRegister) => ({
        ID: a.id,
        'Product ID': a.productId,
        'Purchase Date': a.purchaseDate,
        'Purchase Price': a.purchasePrice,
        'Acc. Depreciation': a.accumulated,
        NBV: a.nbv,
        Method: a.method,
        Status: a.status,
      })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Assets');
    XLSX.writeFile(wb, 'asset_register.xlsx');
  };

  return (
    <div className="bg-blue-50/50 min-h-full p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Eye className="h-6 w-6 text-blue-600" /> Depreciation & Assets
          </h1>
          <p className="text-sm text-gray-500">Your branch asset register — view only</p>
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
        <StatCard title="Total Cost" value={formatCurrency(totalCost)} subtitle="Purchase value" />
        <StatCard title="Total NBV" value={formatCurrency(totalNBV)} subtitle="Net book value" />
        <StatCard
          title="Accumulated Dep."
          value={formatCurrency(totalAccDep)}
          subtitle="Total depreciated"
        />
        <StatCard title="Active Assets" value={activeCount.toString()} subtitle="In use" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">Cost vs Net Book Value</h3>
          <SimpleBarChart
            data={charts?.costVsNbv ?? []}
            xKey="name"
            bars={[
              { key: 'cost', color: '#3b82f6', label: 'Cost' },
              { key: 'nbv', color: '#10b981', label: 'NBV' },
            ]}
            height={240}
          />
        </div>
        <div className="bg-white rounded-xl border p-4">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">Monthly Depreciation Charge</h3>
          <SimpleLineChart
            data={charts?.monthlyCharge ?? []}
            xKey="month"
            lines={[{ key: 'amount', color: '#f59e0b', label: 'Depreciation' }]}
            height={240}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or code..."
              className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Methods</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  {[
                    'Asset ID',
                    'Product ID',
                    'Purchase Date',
                    'Purchase Price',
                    'Acc. Dep.',
                    'NBV',
                    'Method',
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
                      No assets found
                    </td>
                  </tr>
                ) : (
                  filtered.map((a: AssetDepreciationRegister) => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">
                        {a.id.slice(0, 8)}…
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">
                        {a.productId.slice(0, 8)}…
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {String(a.purchaseDate).slice(0, 10)}
                      </td>
                      <td className="px-4 py-3">{formatCurrency(a.purchasePrice)}</td>
                      <td className="px-4 py-3 text-red-600">{formatCurrency(a.accumulated)}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-700">
                        {formatCurrency(a.nbv)}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {a.method?.replace(/_/g, ' ')}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[a.status] ?? 'bg-gray-100 text-gray-700'}`}
                        >
                          {a.status?.replace(/_/g, ' ')}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
