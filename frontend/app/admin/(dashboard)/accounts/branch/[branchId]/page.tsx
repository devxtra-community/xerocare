'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { Building2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import {
  fetchConsolidatedKPIs,
  fetchConsolidatedPL,
  fetchConsolidatedBalanceSheet,
} from '@/lib/finance/accountsApi';
import { formatCurrency } from '@/lib/format';
import { useBranchCurrency } from '@/lib/hooks/useBranchCurrency';
import StatCard from '@/components/StatCard';
import { SimpleBarChart, SimpleLineChart } from '@/components/accounts/charts';
import { useBranchNameMap } from '@/hooks/useBranchNameMap';

export default function BranchDeepDivePage() {
  const currency = useBranchCurrency();
  const { getBranchName } = useBranchNameMap();
  const { branchId } = useParams<{ branchId: string }>();

  const params = { branchIds: branchId };

  const { data: kpis, isLoading } = useQuery({
    queryKey: ['admin-branch-kpis', branchId],
    queryFn: () => fetchConsolidatedKPIs(params),
  });

  const { data: pl } = useQuery({
    queryKey: ['admin-branch-pl', branchId],
    queryFn: () =>
      fetchConsolidatedPL(params) as Promise<{
        monthly: { month: string; income: number; expenses: number }[];
      }>,
  });

  const { data: bs } = useQuery({
    queryKey: ['admin-branch-bs', branchId],
    queryFn: () =>
      fetchConsolidatedBalanceSheet(params) as Promise<{
        totalAssets: number;
        totalLiabilities: number;
        totalEquity: number;
        cashAndBank: number;
        receivables: number;
        payables: number;
      }>,
  });

  return (
    <div className="bg-muted min-h-full p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/accounts"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="h-4 w-px bg-muted" />
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-medium text-foreground">Branch Deep Dive</h1>
          <span className="bg-primary/10 text-primary text-xs font-semibold px-2 py-0.5 rounded">
            {getBranchName(branchId)}
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-muted-foreground">Loading branch data…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard
              title="Net Profit"
              value={formatCurrency(kpis?.netProfit ?? 0, currency)}
              subtitle="This period"
            />
            <StatCard
              title="Total Receivable"
              value={formatCurrency(kpis?.totalReceivable ?? 0, currency)}
              subtitle="Outstanding"
            />
            <StatCard
              title="Total Payable"
              value={formatCurrency(kpis?.totalPayable ?? 0, currency)}
              subtitle="Outstanding"
            />
            <StatCard
              title="Cash"
              value={formatCurrency(kpis?.totalCash ?? 0, currency)}
              subtitle="Cash accounts"
            />
            <StatCard
              title="Bank"
              value={formatCurrency(kpis?.totalBank ?? 0, currency)}
              subtitle="Bank accounts"
            />
            <StatCard
              title="Overdue"
              value={formatCurrency(kpis?.overdueReceivables ?? 0, currency)}
              subtitle="90+ days"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card rounded-xl border p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">
                Monthly Income vs Expenses
              </h3>
              <SimpleBarChart
                data={pl?.monthly ?? []}
                xKey="month"
                bars={[
                  { key: 'income', color: 'var(--chart-profit)', label: 'Income' },
                  { key: 'expenses', color: 'var(--destructive)', label: 'Expenses' },
                ]}
                height={240}
                currency={currency}
              />
            </div>

            <div className="bg-card rounded-xl border p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Balance Sheet Snapshot</h3>
              <div className="space-y-3">
                {[
                  { label: 'Total Assets', value: bs?.totalAssets ?? 0, color: 'text-primary' },
                  {
                    label: 'Total Liabilities',
                    value: bs?.totalLiabilities ?? 0,
                    color: 'text-destructive',
                  },
                  { label: 'Total Equity', value: bs?.totalEquity ?? 0, color: 'text-success' },
                  { label: 'Cash & Bank', value: bs?.cashAndBank ?? 0, color: 'text-foreground' },
                  { label: 'Receivables', value: bs?.receivables ?? 0, color: 'text-foreground' },
                  { label: 'Payables', value: bs?.payables ?? 0, color: 'text-foreground' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <span className="text-sm text-foreground">{item.label}</span>
                    <span className={`text-sm font-semibold ${item.color}`}>
                      {formatCurrency(item.value, currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Net Profit Trend</h3>
            <SimpleLineChart
              data={(pl?.monthly ?? []).map((r) => ({ ...r, net: r.income - r.expenses }))}
              xKey="month"
              lines={[{ key: 'net', color: 'var(--chart-indigo)', label: 'Net P&L' }]}
              height={200}
              currency={currency}
            />
          </div>
        </>
      )}
    </div>
  );
}
