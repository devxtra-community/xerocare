'use client';

import React, { Suspense, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Search, Download } from 'lucide-react';
import {
  fetchAssetRegister,
  fetchDepreciationCharts,
  AssetDepreciationRegister,
} from '@/lib/finance/accountsApi';
import { formatCurrency } from '@/lib/format';
import { useBranchCurrency } from '@/lib/hooks/useBranchCurrency';
import StatCard from '@/components/StatCard';
import { SimpleBarChart, SimpleLineChart } from '@/components/accounts/charts';
import BranchFilterBar from '@/components/accounts/admin/BranchFilterBar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import * as XLSX from 'xlsx';
import Pagination from '@/components/Pagination';
import { useTablePagination } from '@/lib/hooks/useTablePagination';

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'bg-success/10 text-success',
  DISPOSED: 'bg-destructive/10 text-destructive',
  FULLY_DEPRECIATED: 'bg-muted text-foreground',
  SUSPENDED: 'bg-warning/10 text-warning',
};

function DepreciationContent() {
  const currency = useBranchCurrency();
  const searchParams = useSearchParams();
  const branchIds = searchParams.get('branchIds') ?? '';
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');

  const params: Record<string, string> = {};
  if (branchIds) params.branchIds = branchIds;

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['admin-assets', branchIds],
    queryFn: () => fetchAssetRegister(params),
  });
  const { data: charts } = useQuery({
    queryKey: ['admin-dep-charts', branchIds],
    queryFn: () =>
      fetchDepreciationCharts(params) as Promise<{
        costVsNbv: { name: string; cost: number; nbv: number }[];
        monthlyCharge: { month: string; amount: number }[];
      }>,
  });

  const methods = [...new Set(assets.map((a) => a.method))];

  const filtered = assets.filter((a) => {
    const matchMethod = methodFilter === 'ALL' || a.method === methodFilter;
    const matchSearch =
      !search ||
      a.id?.toLowerCase().includes(search.toLowerCase()) ||
      a.productId?.toLowerCase().includes(search.toLowerCase());
    return matchMethod && matchSearch;
  });
  const assetPaging = useTablePagination(filtered, `${search}|${methodFilter}`, 10);

  const totalCost = assets.reduce((s, a) => s + Number(a.purchasePrice ?? 0), 0);
  const totalNBV = assets.reduce((s, a) => s + Number(a.nbv ?? 0), 0);
  const totalAccDep = assets.reduce((s, a) => s + Number(a.accumulated ?? 0), 0);
  const activeCount = assets.filter((a) => a.status === 'ACTIVE').length;

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      filtered.map((a) => ({
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
    XLSX.writeFile(wb, 'consolidated_assets.xlsx');
  };

  return (
    <div className="bg-muted min-h-full p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-medium text-foreground">
            Depreciation & Assets — Consolidated
          </h1>
          <p className="text-sm text-muted-foreground">All branches</p>
        </div>
        <button
          onClick={exportExcel}
          className="flex items-center gap-1.5 text-sm border rounded-lg px-3 py-2 bg-card hover:bg-muted"
        >
          <Download className="h-4 w-4" /> Export
        </button>
      </div>

      <BranchFilterBar />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          title="Total Cost"
          value={formatCurrency(totalCost, currency)}
          subtitle="Purchase value"
        />
        <StatCard
          title="Total NBV"
          value={formatCurrency(totalNBV, currency)}
          subtitle="Net book value"
        />
        <StatCard
          title="Accumulated Dep."
          value={formatCurrency(totalAccDep, currency)}
          subtitle="Total depreciated"
        />
        <StatCard title="Active Assets" value={activeCount.toString()} subtitle="In use" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Cost vs Net Book Value (by Category)
          </h3>
          <SimpleBarChart
            data={charts?.costVsNbv ?? []}
            xKey="name"
            bars={[
              { key: 'cost', color: 'var(--chart-blue-mid)', label: 'Cost' },
              { key: 'nbv', color: 'var(--chart-profit)', label: 'NBV' },
            ]}
            height={240}
            currency={currency}
          />
        </div>
        <div className="bg-card rounded-xl border p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Monthly Depreciation Charge
          </h3>
          <SimpleLineChart
            data={charts?.monthlyCharge ?? []}
            xKey="month"
            lines={[{ key: 'amount', color: 'var(--chart-expense)', label: 'Depreciation' }]}
            height={240}
            currency={currency}
          />
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ID or product..."
              className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <Select value={methodFilter} onValueChange={setMethodFilter}>
            <SelectTrigger className="border-warning/30 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Methods</SelectItem>
              {methods.map((m) => (
                <SelectItem key={m} value={m}>
                  {m.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-xs uppercase text-muted-foreground">
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
                    <td colSpan={8} className="text-center py-8 text-muted-foreground">
                      No assets found
                    </td>
                  </tr>
                ) : (
                  assetPaging.pageRows.map((a: AssetDepreciationRegister) => (
                    <tr key={a.id} className="hover:bg-muted">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {a.id.slice(0, 8)}…
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {a.productId?.slice(0, 8) ?? '—'}…
                      </td>
                      <td className="px-4 py-3">{String(a.purchaseDate).slice(0, 10)}</td>
                      <td className="px-4 py-3">{formatCurrency(a.purchasePrice, currency)}</td>
                      <td className="px-4 py-3 text-destructive">
                        {formatCurrency(a.accumulated, currency)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-success">
                        {formatCurrency(a.nbv, currency)}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {a.method.replace(/_/g, ' ')}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[a.status] ?? 'bg-muted text-foreground'}`}
                        >
                          {a.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {assetPaging.total > assetPaging.pageSize && (
              <Pagination
                page={assetPaging.page}
                totalPages={assetPaging.totalPages}
                total={assetPaging.total}
                limit={assetPaging.pageSize}
                onPageChange={assetPaging.setPage}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminDepreciationPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading…</div>}>
      <DepreciationContent />
    </Suspense>
  );
}
