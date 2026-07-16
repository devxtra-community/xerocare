'use client';

import React, { Suspense, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import {
  getChartOfAccounts,
  type AccountBalance,
  type ChartOfAccountsResponse,
} from '@/lib/finance/accountsApi';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import BranchFilterBar from '@/components/accounts/admin/BranchFilterBar';

function currentYearFrom() {
  return `${new Date().getFullYear()}-01-01`;
}
function currentYearTo() {
  return new Date().toISOString().slice(0, 10);
}

function Bal({ ab, negative }: { ab: AccountBalance; negative?: boolean }) {
  const val = negative ? -ab.balance : ab.balance;
  const isNeg = val < 0;
  return (
    <span className={`font-bold tabular-nums ${isNeg ? 'text-red-600' : 'text-slate-800'}`}>
      {formatCurrency(val, ab.currency)}
    </span>
  );
}

function Row({ ab, negative }: { ab: AccountBalance; negative?: boolean }) {
  return (
    <div className="grid grid-cols-12 px-5 py-3 items-center hover:bg-blue-50/50 transition-colors text-sm">
      <span className="col-span-1 font-mono text-xs text-muted-foreground font-medium">
        {ab.code}
      </span>
      <span className="col-span-5 font-medium text-slate-800">{ab.name}</span>
      <span className="col-span-6 text-right">
        <Bal ab={ab} negative={negative} />
      </span>
    </div>
  );
}

function SubTotal({ label, value, currency }: { label: string; value: number; currency: string }) {
  return (
    <div className="grid grid-cols-12 px-5 py-2.5 border-t border-slate-200 bg-slate-50/60 text-sm">
      <span className="col-span-6 font-semibold text-slate-700">{label}</span>
      <span
        className={`col-span-6 text-right font-bold tabular-nums ${value < 0 ? 'text-red-600' : 'text-slate-800'}`}
      >
        {formatCurrency(value, currency)}
      </span>
    </div>
  );
}

function SectionHeader({
  title,
  open,
  onToggle,
  accent,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  accent: string;
}) {
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center justify-between px-5 py-3.5 border-l-4 ${accent} hover:opacity-90 transition-opacity`}
    >
      <div className="flex items-center gap-3">
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="font-bold text-sm text-slate-800">{title}</span>
      </div>
    </button>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="rounded-2xl bg-card shadow-sm border border-slate-100 overflow-hidden"
        >
          <div className="h-12 bg-slate-100 animate-pulse" />
          <div className="p-4 space-y-2">
            {[...Array(4)].map((_, j) => (
              <div key={j} className="h-10 bg-gray-100 animate-pulse rounded" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ChartOfAccountsContent() {
  const searchParams = useSearchParams();
  const branchIds = searchParams.get('branchIds') ?? '';

  const [periodFrom, setPeriodFrom] = useState(currentYearFrom());
  const [periodTo, setPeriodTo] = useState(currentYearTo());
  const [openSections, setOpenSections] = useState(
    new Set(['assets', 'liabilities', 'equity', 'income', 'expenses']),
  );

  const queryParams = branchIds
    ? { periodFrom, periodTo, branchIds: [branchIds] }
    : { periodFrom, periodTo };

  const { data, isLoading, isError, refetch, isFetching } = useQuery<ChartOfAccountsResponse>({
    queryKey: ['admin-chart-of-accounts', branchIds, periodFrom, periodTo],
    queryFn: () => getChartOfAccounts(queryParams),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const toggle = (key: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const currency = data?.currency ?? 'AED';

  if (isLoading) return <LoadingSkeleton />;

  if (isError)
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <p className="text-red-500 font-medium">Failed to load Chart of Accounts</p>
        <Button onClick={() => refetch()} variant="outline">
          Retry
        </Button>
      </div>
    );

  if (!data) return null;

  const { assets, liabilities, equity, income, expenses, summary } = data;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">Live balances as of {data.asOfDate}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="bg-card rounded-2xl border border-slate-100 shadow-sm p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Period for Income &amp; Expenses
        </p>
        <div className="flex flex-wrap gap-3 items-end">
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            From
            <Input
              type="date"
              value={periodFrom}
              onChange={(e) => setPeriodFrom(e.target.value)}
              className="w-44"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            To
            <Input
              type="date"
              value={periodTo}
              onChange={(e) => setPeriodTo(e.target.value)}
              className="w-44"
            />
          </label>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Asset, liability, and equity balances are always shown as of today ({data.asOfDate}).
          Income and expense figures reflect the selected period above.
        </p>
      </div>

      <div
        className={`p-3 rounded-xl flex items-center gap-2 text-sm font-medium ${
          summary.accountingEquation.isBalanced
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}
      >
        {summary.accountingEquation.isBalanced ? '✅' : '⚠️'}
        {summary.accountingEquation.isBalanced
          ? 'Accounts are balanced — Assets = Liabilities + Equity'
          : `Out of balance by ${formatCurrency(summary.accountingEquation.difference, currency)}`}
        <span className="ml-auto text-xs font-normal opacity-70">
          Assets: {formatCurrency(summary.accountingEquation.totalAssets, currency)} | L+E:{' '}
          {formatCurrency(summary.accountingEquation.totalLiabilitiesPlusEquity, currency)}
        </span>
      </div>

      {/* ASSETS */}
      <div className="rounded-2xl bg-card shadow-sm overflow-hidden border border-slate-100">
        <SectionHeader
          title="Assets"
          open={openSections.has('assets')}
          onToggle={() => toggle('assets')}
          accent="border-l-blue-500 bg-blue-50/60"
        />
        {openSections.has('assets') && (
          <div className="divide-y divide-border">
            <div className="px-5 py-2 bg-muted/30 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Current Assets
            </div>
            <Row ab={assets.currentAssets.cashInHand} />
            <Row ab={assets.currentAssets.cashAtBank} />
            <Row ab={assets.currentAssets.accountsReceivable} />
            <Row ab={assets.currentAssets.securityDepositsReceivable} />
            <Row ab={assets.currentAssets.prepaidExpenses} />
            <Row ab={assets.currentAssets.sparePartsInventory} />
            <Row ab={assets.currentAssets.productInventory} />
            <SubTotal
              label="Total Current Assets"
              value={assets.currentAssets.totalCurrentAssets}
              currency={currency}
            />
            <div className="px-5 py-2 bg-muted/30 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Non-Current Assets
            </div>
            <Row ab={assets.nonCurrentAssets.equipmentGrossCost} />
            <Row ab={assets.nonCurrentAssets.accumulatedDepreciation} negative />
            <div className="grid grid-cols-12 px-5 py-2.5 text-sm">
              <span className="col-span-6 font-medium text-slate-600 pl-4">
                Equipment Net Book Value
              </span>
              <span className="col-span-6 text-right font-semibold tabular-nums text-slate-700">
                {formatCurrency(assets.nonCurrentAssets.equipmentNBV, currency)}
              </span>
            </div>
            <SubTotal
              label="Total Non-Current Assets"
              value={assets.nonCurrentAssets.totalNonCurrentAssets}
              currency={currency}
            />
            <SubTotal label="TOTAL ASSETS" value={assets.totalAssets} currency={currency} />
          </div>
        )}
      </div>

      {/* LIABILITIES */}
      <div className="rounded-2xl bg-card shadow-sm overflow-hidden border border-slate-100">
        <SectionHeader
          title="Liabilities"
          open={openSections.has('liabilities')}
          onToggle={() => toggle('liabilities')}
          accent="border-l-red-500 bg-red-50/60"
        />
        {openSections.has('liabilities') && (
          <div className="divide-y divide-border">
            <div className="px-5 py-2 bg-muted/30 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Current Liabilities
            </div>
            <Row ab={liabilities.currentLiabilities.accountsPayable} />
            <Row ab={liabilities.currentLiabilities.accruedExpenses} />
            <Row ab={liabilities.currentLiabilities.vatPayable} />
            <Row ab={liabilities.currentLiabilities.securityDepositsReceived} />
            <Row ab={liabilities.currentLiabilities.deferredRevenue} />
            <Row ab={liabilities.currentLiabilities.salaryPayable} />
            <SubTotal
              label="Total Current Liabilities"
              value={liabilities.currentLiabilities.totalCurrentLiabilities}
              currency={currency}
            />
            <SubTotal
              label="TOTAL LIABILITIES"
              value={liabilities.totalLiabilities}
              currency={currency}
            />
          </div>
        )}
      </div>

      {/* EQUITY */}
      <div className="rounded-2xl bg-card shadow-sm overflow-hidden border border-slate-100">
        <SectionHeader
          title="Equity"
          open={openSections.has('equity')}
          onToggle={() => toggle('equity')}
          accent="border-l-purple-500 bg-purple-50/60"
        />
        {openSections.has('equity') && (
          <div className="divide-y divide-border">
            <Row ab={equity.ownerCapital} />
            <Row ab={equity.retainedEarnings} />
            <Row ab={equity.reserves} />
            <Row ab={equity.lessWithdrawals} negative />
            <Row ab={equity.lessDividends} negative />
            <SubTotal label="TOTAL EQUITY" value={equity.totalEquity} currency={currency} />
          </div>
        )}
      </div>

      {/* INCOME */}
      <div className="rounded-2xl bg-card shadow-sm overflow-hidden border border-slate-100">
        <SectionHeader
          title="Income / Revenue"
          open={openSections.has('income')}
          onToggle={() => toggle('income')}
          accent="border-l-emerald-500 bg-emerald-50/60"
        />
        {openSections.has('income') && (
          <div className="divide-y divide-border">
            <div className="px-5 py-2 bg-muted/30 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Period: {data.periodFrom} → {data.periodTo}
            </div>
            <Row ab={income.rentalRevenue} />
            <Row ab={income.leaseRevenue} />
            <Row ab={income.salesRevenue} />
            <Row ab={income.serviceRevenue} />
            <Row ab={income.usageRevenue} />
            <Row ab={income.amcSmaRevenue} />
            <Row ab={income.sparePartSales} />
            <SubTotal label="TOTAL INCOME" value={income.totalIncome} currency={currency} />
          </div>
        )}
      </div>

      {/* EXPENSES */}
      <div className="rounded-2xl bg-card shadow-sm overflow-hidden border border-slate-100">
        <SectionHeader
          title="Expenses"
          open={openSections.has('expenses')}
          onToggle={() => toggle('expenses')}
          accent="border-l-orange-500 bg-orange-50/60"
        />
        {openSections.has('expenses') && (
          <div className="divide-y divide-border">
            <div className="px-5 py-2 bg-muted/30 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Period: {data.periodFrom} → {data.periodTo}
            </div>
            <Row ab={expenses.costOfParts} />
            <Row ab={expenses.labourCost} />
            <Row ab={expenses.depreciation} />
            <Row ab={expenses.vendorPurchases} />
            <Row ab={expenses.shippingHandling} />
            <Row ab={expenses.salaryExpense} />
            <Row ab={expenses.travelExpense} />
            <Row ab={expenses.rentExpense} />
            <Row ab={expenses.utilitiesExpense} />
            <Row ab={expenses.marketingExpense} />
            <Row ab={expenses.maintenanceExpense} />
            <Row ab={expenses.insuranceExpense} />
            <Row ab={expenses.importLabourCost} />
            <Row ab={expenses.customsDuty} />
            <Row ab={expenses.otherExpenses} />
            <SubTotal label="TOTAL EXPENSES" value={expenses.totalExpenses} currency={currency} />
          </div>
        )}
      </div>

      {/* P&L Summary */}
      <div className="rounded-2xl bg-card shadow-sm border border-slate-100 p-5 space-y-2">
        <p className="text-sm font-bold text-slate-700 uppercase tracking-widest">
          P&amp;L Summary ({data.periodFrom} → {data.periodTo})
        </p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex justify-between px-3 py-2 bg-slate-50 rounded-lg">
            <span className="text-muted-foreground">Total Income</span>
            <span className="font-bold tabular-nums">
              {formatCurrency(income.totalIncome, currency)}
            </span>
          </div>
          <div className="flex justify-between px-3 py-2 bg-slate-50 rounded-lg">
            <span className="text-muted-foreground">Total Expenses</span>
            <span className="font-bold tabular-nums">
              {formatCurrency(expenses.totalExpenses, currency)}
            </span>
          </div>
          <div className="flex justify-between px-3 py-2 bg-blue-50 rounded-lg">
            <span className="text-slate-700 font-medium">Gross Profit</span>
            <span
              className={`font-bold tabular-nums ${summary.grossProfit < 0 ? 'text-red-600' : 'text-blue-700'}`}
            >
              {formatCurrency(summary.grossProfit, currency)}
            </span>
          </div>
          <div
            className={`flex justify-between px-3 py-2 rounded-lg ${summary.netProfit >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}
          >
            <span className="text-slate-700 font-medium">Net Profit</span>
            <span
              className={`font-bold tabular-nums ${summary.netProfit < 0 ? 'text-red-600' : 'text-emerald-700'}`}
            >
              {formatCurrency(summary.netProfit, currency)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminChartOfAccountsPage() {
  return (
    <div className="bg-blue-50/50 min-h-full p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-slate-800 tracking-tight">Chart of Accounts</h3>
          <p className="text-muted-foreground">Master ledger — across branches</p>
        </div>
        <Suspense>
          <BranchFilterBar />
        </Suspense>
      </div>
      <Suspense>
        <ChartOfAccountsContent />
      </Suspense>
    </div>
  );
}
