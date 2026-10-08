'use client';

import React, { Suspense, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { FileText } from 'lucide-react';
import {
  fetchEquitySummary,
  fetchEquityEntries,
  fetchEquityCharts,
} from '@/lib/finance/accountsApi';
import { fetchBranches } from '@/lib/finance/accounts';
import { getUserFromToken } from '@/lib/auth';
import { formatCurrency } from '@/lib/format';
import { useBranchCurrency } from '@/lib/hooks/useBranchCurrency';
import StatCard from '@/components/StatCard';
import { DonutChart, SimpleLineChart } from '@/components/accounts/charts';
import BranchFilterBar from '@/components/accounts/admin/BranchFilterBar';
import StatementDialog, { type SnapshotStatementData } from '@/components/shared/StatementDialog';
import Pagination from '@/components/Pagination';
import { useTablePagination } from '@/lib/hooks/useTablePagination';

const TYPE_COLORS: Record<string, string> = {
  SHARE_CAPITAL: 'bg-primary/10 text-primary',
  RETAINED_EARNINGS: 'bg-success/10 text-success',
  RESERVES: 'bg-lease/10 text-lease',
  OWNER_CONTRIBUTION: 'bg-primary/10 text-primary',
  DIVIDEND: 'bg-destructive/10 text-destructive',
  PROFIT_TRANSFER: 'bg-success/10 text-success',
  LOSS_TRANSFER: 'bg-warning/10 text-warning',
  OTHER: 'bg-muted text-foreground',
};

function EquityContent() {
  const currency = useBranchCurrency();
  const searchParams = useSearchParams();
  const branchIds = searchParams.get('branchIds') ?? '';
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

  const { data: summary } = useQuery({
    queryKey: ['admin-equity-sum', branchIds],
    queryFn: () => fetchEquitySummary(params),
  });
  const { data: entries = [] } = useQuery({
    queryKey: ['admin-equity-entries', branchIds],
    queryFn: () => fetchEquityEntries(params),
  });
  const entryPaging = useTablePagination(entries, entries.map((entry) => entry.id).join('|'), 10);
  const { data: charts } = useQuery({
    queryKey: ['admin-equity-charts', branchIds],
    queryFn: () =>
      fetchEquityCharts(params) as Promise<{
        growthTrend: { month: string; equity: number }[];
        composition: { name: string; value: number }[];
      }>,
  });

  const statementData: SnapshotStatementData = {
    kind: 'snapshot',
    title: 'Equity — Consolidated',
    sections: [
      {
        title: 'Equity Entries',
        rows: entries.map((e) => ({
          code: String(e.date).slice(0, 10),
          label: `${e.entryNo} — ${e.type.replace(/_/g, ' ')} — ${e.description}`,
          value: formatCurrency(e.amount, e.currency),
        })),
        total: {
          label: 'Net Total',
          value: formatCurrency(
            entries.reduce((s, e) => s + Number(e.amount), 0),
            currency,
          ),
        },
      },
    ],
    summary: [
      { label: 'Net Equity', value: formatCurrency(summary?.netEquity ?? 0, currency), bold: true },
      { label: 'Total Assets', value: formatCurrency(summary?.totalAssets ?? 0, currency) },
    ],
  };

  return (
    <div className="bg-card min-h-full p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-medium text-foreground">Equity — Consolidated</h1>
          <p className="text-sm text-muted-foreground">All branches in AED</p>
        </div>
        <button
          onClick={() => setShowStatement(true)}
          className="flex items-center gap-1.5 text-sm border rounded-lg px-3 py-2 bg-card hover:bg-muted"
        >
          <FileText className="h-4 w-4" /> Generate Statement
        </button>
      </div>

      <BranchFilterBar />

      <div className="bg-gradient-to-r from-primary to-primary rounded-xl p-6 text-primary-foreground">
        <p className="text-sm font-medium opacity-80 mb-1">Net Equity (Consolidated)</p>
        <p className="text-4xl font-bold">{formatCurrency(summary?.netEquity ?? 0, currency)}</p>
        <div className="flex gap-6 mt-4 text-sm">
          <span>
            Total Assets: <strong>{formatCurrency(summary?.totalAssets ?? 0, currency)}</strong>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          title="Share Capital"
          value={formatCurrency(summary?.shareCapital ?? 0, currency)}
          subtitle="Paid-in"
        />
        <StatCard
          title="Retained Earnings"
          value={formatCurrency(summary?.retainedEarnings ?? 0, currency)}
          subtitle="Accumulated"
        />
        <StatCard
          title="Owner Contribution"
          value={formatCurrency(summary?.ownerContribution ?? 0, currency)}
          subtitle="Capital input"
        />
        <StatCard title="Total Entries" value={entries.length.toString()} subtitle="Records" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Equity Composition</h3>
          <DonutChart data={charts?.composition ?? []} height={240} currency={currency} />
        </div>
        <div className="bg-card rounded-xl border p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Equity Growth Trend</h3>
          <SimpleLineChart
            data={charts?.growthTrend ?? []}
            xKey="month"
            lines={[{ key: 'equity', color: 'var(--chart-indigo)', label: 'Equity' }]}
            height={240}
            currency={currency}
          />
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h3 className="text-sm font-semibold text-foreground">Recent Equity Entries</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs uppercase text-muted-foreground">
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
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">
                    No equity entries found
                  </td>
                </tr>
              ) : (
                entryPaging.pageRows.map((e) => (
                  <tr key={e.id} className="hover:bg-muted">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {e.entryNo}
                    </td>
                    <td className="px-4 py-3">{String(e.date).slice(0, 10)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[e.type] ?? 'bg-muted text-foreground'}`}
                      >
                        {e.type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[200px] truncate text-foreground">
                      {e.description}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {formatCurrency(e.amount, currency)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{e.currency}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {entryPaging.total > entryPaging.pageSize && (
            <Pagination
              page={entryPaging.page}
              totalPages={entryPaging.totalPages}
              total={entryPaging.total}
              limit={entryPaging.pageSize}
              onPageChange={entryPaging.setPage}
            />
          )}
        </div>
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

export default function AdminEquityPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading…</div>}>
      <EquityContent />
    </Suspense>
  );
}
