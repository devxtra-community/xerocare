'use client';

import React, { Suspense, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Search, FileText } from 'lucide-react';
import { fetchExpenseEntries, fetchExpenseCharts } from '@/lib/finance/accountsApi';
import { fetchBranches } from '@/lib/finance/accounts';
import { getUserFromToken } from '@/lib/auth';
import { formatCurrency } from '@/lib/format';
import { useBranchCurrency } from '@/lib/hooks/useBranchCurrency';
import StatCard from '@/components/StatCard';
import { DonutChart, StackedBarChart } from '@/components/accounts/charts';
import BranchFilterBar from '@/components/accounts/admin/BranchFilterBar';
import StatementDialog, { type SnapshotStatementData } from '@/components/shared/StatementDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  PAID: 'bg-blue-100 text-blue-700',
  REJECTED: 'bg-red-100 text-red-700',
};

function ExpensesContent() {
  const currency = useBranchCurrency();
  const searchParams = useSearchParams();
  const branchIds = searchParams.get('branchIds') ?? '';
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('ALL');
  const [showStatement, setShowStatement] = useState(false);

  const currentUser = getUserFromToken();
  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: fetchBranches,
    staleTime: 5 * 60 * 1000,
  });
  const activeBranch = branchIds
    ? branches.find((b) => b.id === branchIds)
    : (branches.find((b) => b.id === currentUser?.branchId) ?? branches[0]);
  const branchInfo = {
    name: activeBranch?.name ?? 'XeroCare',
    address: activeBranch?.address,
    tax_registration_number: activeBranch?.tax_registration_number,
    country: activeBranch?.country,
  };

  const params: Record<string, string> = {};
  if (branchIds) params.branchIds = branchIds;

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['admin-expenses', branchIds],
    queryFn: () => fetchExpenseEntries(params),
  });

  const { data: charts } = useQuery({
    queryKey: ['admin-exp-charts', branchIds],
    queryFn: () =>
      fetchExpenseCharts(params) as Promise<{
        categoryDonut: { name: string; value: number }[];
        monthlyTrend: Record<string, unknown>[];
        categories: string[];
      }>,
  });

  const categories = [...new Set(expenses.map((e) => e.category))];

  const filtered = expenses.filter((e) => {
    const matchCat = catFilter === 'ALL' || e.category === catFilter;
    const matchSearch = !search || e.description?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const total = filtered.reduce((s, e) => s + Number(e.amount), 0);
  const pending = filtered.filter((e) => e.status === 'PENDING').length;

  const statementData: SnapshotStatementData = {
    kind: 'snapshot',
    title: 'Expenses — Consolidated',
    filters: {
      Search: search || undefined,
      Category: catFilter !== 'ALL' ? catFilter : undefined,
    },
    sections: [
      {
        title: 'Expense Entries',
        rows: filtered.map((e) => ({
          code: e.date?.slice(0, 10) ?? '',
          label: `${e.expenseNo} — ${e.category.replace(/_/g, ' ')} — ${e.description}`,
          value: formatCurrency(e.amount, currency),
        })),
        total: { label: 'Total', value: formatCurrency(total, currency) },
      },
    ],
  };

  return (
    <div className="bg-gray-50 min-h-full p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses — Consolidated</h1>
          <p className="text-sm text-gray-500">All branches</p>
        </div>
        <button
          onClick={() => setShowStatement(true)}
          className="flex items-center gap-1.5 text-sm border rounded-lg px-3 py-2 bg-white hover:bg-gray-50"
        >
          <FileText className="h-4 w-4" /> Generate Statement
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
        <StatCard
          title="All Expenses"
          value={expenses.length.toString()}
          subtitle="Total records"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">Category Breakdown</h3>
          <DonutChart data={charts?.categoryDonut ?? []} height={220} currency={currency} />
        </div>
        <div className="bg-white rounded-xl border p-4">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">Monthly Trend</h3>
          <StackedBarChart
            data={charts?.monthlyTrend ?? []}
            xKey="month"
            keys={charts?.categories ?? []}
            height={220}
            currency={currency}
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
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="border-orange-200 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                      <td className="px-4 py-3 max-w-[200px] truncate">{e.description}</td>
                      <td className="px-4 py-3 font-semibold">
                        {formatCurrency(e.amount, currency)}
                      </td>
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
      {showStatement && (
        <StatementDialog
          open
          onOpenChange={(o) => !o && setShowStatement(false)}
          data={statementData}
          branch={branchInfo}
        />
      )}
    </div>
  );
}

export default function AdminExpensesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading…</div>}>
      <ExpensesContent />
    </Suspense>
  );
}
