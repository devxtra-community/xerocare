'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Eye, Search, Download } from 'lucide-react';
import { fetchExpenseEntries, fetchExpenseCharts } from '@/lib/finance/accountsApi';
import { formatCurrency } from '@/lib/format';
import StatCard from '@/components/StatCard';
import { DonutChart, StackedBarChart } from '@/components/accounts/charts';
import * as XLSX from 'xlsx';

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  PAID: 'bg-blue-100 text-blue-700',
  REJECTED: 'bg-red-100 text-red-700',
};

export default function ManagerExpensesPage() {
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('ALL');

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['mgr-expenses'],
    queryFn: () => fetchExpenseEntries({}),
  });

  const { data: charts } = useQuery({
    queryKey: ['mgr-exp-charts'],
    queryFn: () =>
      fetchExpenseCharts() as Promise<{
        categoryDonut: { name: string; value: number }[];
        monthlyTrend: Record<string, unknown>[];
        categories: string[];
        statusDistribution: { name: string; value: number }[];
      }>,
  });

  const categories = [...new Set(expenses.map((e) => e.category))];

  const filtered = expenses.filter((e) => {
    const matchCat = catFilter === 'ALL' || e.category === catFilter;
    const matchSearch = !search || e.description?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const total = filtered.reduce((s, e) => s + Number(e.netAmount ?? e.amount), 0);
  const pending = filtered.filter((e) => e.status === 'PENDING').length;

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      filtered.map((e) => ({
        'Expense #': e.expenseNo,
        Date: e.date,
        Category: e.category,
        Description: e.description,
        Amount: e.amount,
        Status: e.status,
      })),
    );
    XLSX.utils.book_append_sheet(XLSX.utils.book_new(), ws, 'Expenses');
  };

  return (
    <div className="bg-blue-50/50 min-h-full p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Eye className="h-6 w-6 text-blue-600" /> Expenses
          </h1>
          <p className="text-sm text-gray-500">Your branch expenses — view only</p>
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
        <StatCard title="Total Amount" value={formatCurrency(total)} subtitle="Filtered" />
        <StatCard title="Pending" value={pending.toString()} subtitle="Awaiting approval" />
        <StatCard title="Entries" value={filtered.length.toString()} subtitle="Shown" />
        <StatCard
          title="All Expenses"
          value={expenses.length.toString()}
          subtitle="Total records"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">Category Breakdown</h3>
          <DonutChart data={charts?.categoryDonut ?? []} height={220} />
        </div>
        <div className="bg-white rounded-xl border p-4">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">Monthly Trend</h3>
          <StackedBarChart
            data={charts?.monthlyTrend ?? []}
            xKey="month"
            keys={charts?.categories ?? []}
            height={220}
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
              placeholder="Search expenses..."
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
                  {['Expense #', 'Date', 'Category', 'Description', 'Amount', 'Status'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-400">
                      No expenses found
                    </td>
                  </tr>
                ) : (
                  filtered.map((e) => (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{e.expenseNo}</td>
                      <td className="px-4 py-3">{e.date?.slice(0, 10)}</td>
                      <td className="px-4 py-3">{e.category.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3 max-w-[200px] truncate" title={e.description}>
                        {e.description}
                      </td>
                      <td className="px-4 py-3 font-semibold">{formatCurrency(e.amount)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[e.status] ?? 'bg-gray-100 text-gray-700'}`}
                        >
                          {e.status}
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
