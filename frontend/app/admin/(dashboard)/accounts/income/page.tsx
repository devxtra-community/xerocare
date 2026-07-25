'use client';

import React, { Suspense, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Search, Download, Eye } from 'lucide-react';
import { fetchIncomeEntries } from '@/lib/finance/accountsApi';
import { formatCurrency } from '@/lib/format';
import { useBranchCurrency } from '@/lib/hooks/useBranchCurrency';
import StatCard from '@/components/StatCard';
import BranchFilterBar from '@/components/accounts/admin/BranchFilterBar';
import { IncomeEntryDetailModal } from '@/components/accounts/IncomeEntryDetailModal';
import * as XLSX from 'xlsx';

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  RECEIVED: 'bg-blue-100 text-blue-700',
  REJECTED: 'bg-red-100 text-red-700',
};

function IncomeContent() {
  const currency = useBranchCurrency();
  const searchParams = useSearchParams();
  const branchIds = searchParams.get('branchIds') ?? '';
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('ALL');
  const [viewingId, setViewingId] = useState<string | null>(null);

  const params: Record<string, string> = {};
  if (branchIds) params.branchIds = branchIds;

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['admin-income', branchIds],
    queryFn: () => fetchIncomeEntries(params),
  });

  const categories = [...new Set(entries.map((e) => e.category))];

  const filtered = entries.filter((e) => {
    const matchCat = catFilter === 'ALL' || e.category === catFilter;
    const matchSearch = !search || e.description?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const total = filtered.reduce((s, e) => s + Number(e.netAmount), 0);
  const pending = filtered.filter((e) => e.status === 'PENDING').length;

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      filtered.map((e) => ({
        'Income #': e.incomeNo,
        Date: e.date,
        Category: e.category,
        Description: e.description,
        Amount: e.netAmount,
        Status: e.status,
      })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Income');
    XLSX.writeFile(wb, 'consolidated_income.xlsx');
  };

  return (
    <div className="bg-gray-50 min-h-full p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Income — Consolidated</h1>
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
          title="Total Amount"
          value={formatCurrency(total, currency)}
          subtitle="Filtered"
        />
        <StatCard title="Pending" value={pending.toString()} subtitle="Awaiting approval" />
        <StatCard title="Entries" value={filtered.length.toString()} subtitle="Shown" />
        <StatCard title="All Income" value={entries.length.toString()} subtitle="Total records" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search income..."
              className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Categories</option>
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
                  {['Income #', 'Date', 'Category', 'Description', 'Amount', 'Status', ''].map(
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
                      No income entries found
                    </td>
                  </tr>
                ) : (
                  filtered.map((e) => (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{e.incomeNo}</td>
                      <td className="px-4 py-3">{e.date?.slice(0, 10)}</td>
                      <td className="px-4 py-3">{e.category.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3 max-w-[200px] truncate">{e.description}</td>
                      <td className="px-4 py-3 font-semibold">
                        {formatCurrency(Number(e.netAmount), currency)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[e.status] ?? 'bg-gray-100 text-gray-700'}`}
                        >
                          {e.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setViewingId(e.id)}
                          className="p-1.5 rounded-md hover:bg-blue-50 text-blue-600"
                          title="View full details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {viewingId && <IncomeEntryDetailModal id={viewingId} onClose={() => setViewingId(null)} />}
    </div>
  );
}

export default function AdminIncomePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading…</div>}>
      <IncomeContent />
    </Suspense>
  );
}
