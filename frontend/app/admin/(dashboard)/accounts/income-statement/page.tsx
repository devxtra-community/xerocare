'use client';

import React, { Suspense, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Download, RefreshCw, AlertTriangle } from 'lucide-react';
import { fetchProfitLoss } from '@/lib/finance/accountsApi';
import { formatCurrency } from '@/lib/format';
import { useBranchCurrency } from '@/lib/hooks/useBranchCurrency';
import StatCard from '@/components/StatCard';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import * as XLSX from 'xlsx';
import BranchFilterBar from '@/components/accounts/admin/BranchFilterBar';

type Period = 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'last_year' | 'custom';

const REVENUE_LABELS: Record<string, string> = {
  RENT: 'Rental Revenue',
  LEASE: 'Lease Revenue',
  SALE: 'Sales Revenue (Direct & Product)',
  SERVICE: 'Service Revenue (Chargeable)',
  AMC_SMA: 'AMC / SMA / FSMA Revenue',
  SPAREPART_SALE: 'Spare Parts Sales Revenue',
  USAGE: 'Usage / Copy Revenue (Overage)',
};

const EXPENSE_LABELS: Record<string, string> = {
  SPARE_PARTS: 'Cost of Spare Parts (COGS)',
  LABOUR: 'Service Labour Cost',
  DEPRECIATION: 'Depreciation Expense',
  VENDOR_PURCHASE: 'Vendor / Inventory Purchases',
  SHIPPING_HANDLING: 'Shipping & Handling',
  SALARY: 'Salary Expense',
  TRAVEL: 'Travel & Transportation',
  RENT: 'Rent Expense',
  UTILITIES: 'Utilities & Bills',
  MARKETING: 'Marketing & Advertising',
  MAINTENANCE: 'Maintenance & Repairs',
  INSURANCE: 'Insurance',
  OTHER: 'Other Expenses',
};

function PLRow({
  label,
  value,
  indent = 0,
  bold = false,
  highlight,
}: {
  label: string;
  value: number;
  indent?: number;
  bold?: boolean;
  highlight?: 'green' | 'red' | 'blue';
}) {
  const currency = useBranchCurrency();
  const color =
    highlight === 'green'
      ? 'text-emerald-700'
      : highlight === 'red'
        ? 'text-red-600'
        : highlight === 'blue'
          ? 'text-blue-700'
          : 'text-slate-800';
  return (
    <div
      className={`flex items-center justify-between py-1.5 ${bold ? 'font-bold' : 'font-normal'}`}
    >
      <span
        className={`text-sm ${bold ? 'text-slate-800' : 'text-slate-600'} ${indent > 0 ? 'pl-5' : ''}`}
      >
        {label}
      </span>
      <span
        className={`text-sm font-semibold tabular-nums ${bold ? color : value < 0 ? 'text-red-600' : 'text-slate-700'}`}
      >
        {value < 0
          ? `(${formatCurrency(Math.abs(value), currency)})`
          : formatCurrency(value, currency)}
      </span>
    </div>
  );
}

function Divider({ thick }: { thick?: boolean }) {
  return <hr className={`my-1 ${thick ? 'border-2 border-slate-300' : 'border-slate-100'}`} />;
}

function SectionHeader({ label }: { label: string }) {
  return (
    <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground pt-3 pb-1">
      {label}
    </p>
  );
}

function IncomeStatementContent() {
  const currency = useBranchCurrency();
  const searchParams = useSearchParams();
  const branchIds = searchParams.get('branchIds') ?? '';

  const [period, setPeriod] = useState<Period>('this_month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const queryParams: Record<string, string> = {};
  if (branchIds) queryParams.branchIds = branchIds;
  if (period === 'custom') {
    if (customFrom) queryParams.fromDate = customFrom;
    if (customTo) queryParams.toDate = customTo;
  } else {
    queryParams.period = period;
  }

  const {
    data: pl,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['admin-profit-loss', branchIds, period, customFrom, customTo],
    queryFn: () => fetchProfitLoss(queryParams),
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    enabled: period !== 'custom' || (!!customFrom && !!customTo),
  });

  const revenueByType = pl?.revenueByType ?? {};
  const expByCategory = pl?.expByCategory ?? {};
  const totalRevenue = pl?.totalRevenue ?? 0;
  const totalExpenses = pl?.totalExpenses ?? 0;
  const netProfit = pl?.netProfit ?? 0;
  const totalTax = pl?.totalTax ?? 0;
  const grossProfit = totalRevenue - totalExpenses;
  const margin = pl?.margin ?? 0;
  const dataWarnings = pl?.dataWarnings ?? [];

  const revenueLines = Object.entries(revenueByType).filter(([, v]) => v !== 0);
  const expenseLines = Object.entries(expByCategory).filter(([, v]) => v !== 0);

  const dateLabel = pl ? `${pl.fromDate} to ${pl.toDate}` : '…';

  const exportExcel = () => {
    if (!pl) return;
    const rows: (string | number)[][] = [
      ['INCOME STATEMENT / PROFIT & LOSS', '', `${pl.fromDate} to ${pl.toDate}`],
      [],
      ['REVENUE'],
      ...revenueLines.map(([type, amt]) => [REVENUE_LABELS[type] ?? type, amt]),
      ['TOTAL REVENUE', totalRevenue],
      [],
      ['EXPENSES BY CATEGORY'],
      ...expenseLines.map(([cat, amt]) => [EXPENSE_LABELS[cat] ?? cat, amt]),
      ['TOTAL EXPENSES', totalExpenses],
      [],
      ['GROSS PROFIT', grossProfit],
      ['Tax Collected (from invoices)', totalTax],
      ['NET PROFIT', netProfit],
      ['NET MARGIN %', `${margin.toFixed(2)}%`],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Income Statement');
    XLSX.writeFile(wb, `Income_Statement_${pl.fromDate}_${pl.toDate}.xlsx`);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-muted-foreground">Profit &amp; Loss — {dateLabel}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-44 bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="this_quarter">This Quarter</SelectItem>
              <SelectItem value="this_year">This Year</SelectItem>
              <SelectItem value="last_year">Last Year</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          {period === 'custom' && (
            <>
              <input
                type="date"
                className="px-3 py-2 rounded-lg border border-border bg-card text-sm"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
              <span className="text-sm text-muted-foreground">to</span>
              <input
                type="date"
                className="px-3 py-2 rounded-lg border border-border bg-card text-sm"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
              />
            </>
          )}
          <Button
            onClick={() => refetch()}
            variant="outline"
            disabled={isFetching}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button
            onClick={exportExcel}
            disabled={!pl || dataWarnings.length > 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4" /> Export Excel
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : isError ? (
        <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-center">
          <p className="text-red-700 font-medium">
            Failed to load profit &amp; loss data. Please refresh.
          </p>
        </div>
      ) : (
        <>
          {dataWarnings.length > 0 && (
            <div className="rounded-xl bg-amber-50 border border-amber-300 p-4 space-y-1">
              <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Data incomplete — some figures may be understated.
              </div>
              <ul className="pl-6 list-disc space-y-0.5">
                {dataWarnings.map((w, i) => (
                  <li key={i} className="text-xs text-amber-700">
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Total Revenue"
              value={formatCurrency(totalRevenue, currency)}
              subtitle={`${pl?.invoiceCount ?? 0} invoices in period`}
            />
            <StatCard
              title="Total Expenses"
              value={formatCurrency(totalExpenses, currency)}
              subtitle={`${pl?.expenseCount ?? 0} expense entries`}
            />
            <StatCard
              title="Net Profit"
              value={formatCurrency(netProfit, currency)}
              subtitle={`${margin.toFixed(1)}% margin`}
            />
          </div>

          <div className="rounded-2xl bg-card shadow-sm overflow-hidden border border-slate-100">
            <div className="px-6 py-4 border-b border-border bg-muted/20">
              <h3 className="font-bold text-primary text-base">
                Profit &amp; Loss Statement — {dateLabel}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {pl?.invoiceCount ?? 0} invoices · {pl?.expenseCount ?? 0} expense entries
              </p>
            </div>
            <div className="px-6 py-4 space-y-0.5 max-w-2xl">
              <SectionHeader label="REVENUE" />
              {revenueLines.length === 0 ? (
                <PLRow label="No revenue in this period" value={0} indent={1} />
              ) : (
                revenueLines.map(([type, amt]) => (
                  <PLRow key={type} label={REVENUE_LABELS[type] ?? type} value={amt} indent={1} />
                ))
              )}
              <Divider />
              <PLRow label="TOTAL REVENUE" value={totalRevenue} bold highlight="blue" />
              <Divider thick />

              <SectionHeader label="OPERATING EXPENSES" />
              {expenseLines.length === 0 ? (
                <PLRow label="No expenses in this period" value={0} indent={1} />
              ) : (
                expenseLines.map(([cat, amt]) => (
                  <PLRow key={cat} label={EXPENSE_LABELS[cat] ?? cat} value={amt} indent={1} />
                ))
              )}
              <Divider />
              <PLRow label="TOTAL EXPENSES" value={totalExpenses} bold highlight="red" />
              <Divider thick />

              <PLRow
                label="GROSS PROFIT"
                value={grossProfit}
                bold
                highlight={grossProfit >= 0 ? 'green' : 'red'}
              />
              <PLRow label="Tax Collected (from invoices)" value={totalTax} indent={1} />
              <Divider thick />
              <PLRow
                label="NET PROFIT"
                value={netProfit}
                bold
                highlight={netProfit >= 0 ? 'green' : 'red'}
              />
              <div className="pt-2">
                <p className="text-xs text-muted-foreground">
                  Net Margin:{' '}
                  <span
                    className={`font-semibold ${margin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                  >
                    {margin.toFixed(2)}%
                  </span>
                </p>
              </div>
            </div>
          </div>

          {(pl?.monthly?.length ?? 0) > 0 && (
            <div className="rounded-2xl bg-card shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <h3 className="font-semibold text-slate-800">Monthly Breakdown</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
                    <tr>
                      {['Month', 'Revenue', 'Expenses', 'Net Profit'].map((h) => (
                        <th key={h} className="px-5 py-3 text-left font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pl?.monthly.map((row) => (
                      <tr key={row.month} className="hover:bg-muted/10">
                        <td className="px-5 py-3 font-medium text-slate-700">{row.month}</td>
                        <td className="px-5 py-3 text-emerald-600">
                          {formatCurrency(row.revenue, currency)}
                        </td>
                        <td className="px-5 py-3 text-red-600">
                          {formatCurrency(row.expenses, currency)}
                        </td>
                        <td
                          className={`px-5 py-3 font-semibold ${row.net >= 0 ? 'text-emerald-700' : 'text-red-700'}`}
                        >
                          {row.net < 0
                            ? `(${formatCurrency(Math.abs(row.net), currency)})`
                            : formatCurrency(row.net, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function AdminIncomeStatementPage() {
  return (
    <div className="bg-blue-50/50 min-h-full p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-slate-800 tracking-tight">Income Statement</h3>
          <p className="text-muted-foreground">Profit &amp; Loss — across branches</p>
        </div>
        <Suspense>
          <BranchFilterBar />
        </Suspense>
      </div>
      <Suspense>
        <IncomeStatementContent />
      </Suspense>
    </div>
  );
}
