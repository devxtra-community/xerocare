'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, RefreshCw } from 'lucide-react';
import { fetchCashbookEntries, fetchCashBankAccounts } from '@/lib/finance/accountsApi';
import { formatCurrency } from '@/lib/format';
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

type Period = 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'custom';

function getDateRange(
  period: Period,
  customFrom: string,
  customTo: string,
): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  if (period === 'custom') return { from: customFrom, to: customTo };
  if (period === 'this_month') {
    return {
      from: new Date(y, m, 1).toISOString().slice(0, 10),
      to: new Date(y, m + 1, 0).toISOString().slice(0, 10),
    };
  }
  if (period === 'last_month') {
    return {
      from: new Date(y, m - 1, 1).toISOString().slice(0, 10),
      to: new Date(y, m, 0).toISOString().slice(0, 10),
    };
  }
  if (period === 'this_quarter') {
    const q = Math.floor(m / 3);
    return {
      from: new Date(y, q * 3, 1).toISOString().slice(0, 10),
      to: new Date(y, q * 3 + 3, 0).toISOString().slice(0, 10),
    };
  }
  return { from: `${y}-01-01`, to: `${y}-12-31` };
}

function CFRow({
  label,
  value,
  indent = false,
  bold = false,
  highlight,
}: {
  label: string;
  value: number;
  indent?: boolean;
  bold?: boolean;
  highlight?: 'positive' | 'negative' | 'neutral';
}) {
  const color =
    highlight === 'positive'
      ? 'text-emerald-600'
      : highlight === 'negative'
        ? 'text-red-600'
        : 'text-slate-800';
  return (
    <div className={`flex items-center justify-between py-2 ${indent ? 'pl-5' : ''}`}>
      <span
        className={`text-sm ${indent ? 'text-muted-foreground' : bold ? 'font-bold text-slate-800' : 'text-slate-700'}`}
      >
        {label}
      </span>
      <span
        className={`text-sm font-semibold tabular-nums ${bold ? color : value < 0 ? 'text-red-600' : 'text-slate-700'}`}
      >
        {value < 0 ? `(${formatCurrency(Math.abs(value))})` : formatCurrency(value)}
      </span>
    </div>
  );
}

function SectionLabel({ label, color }: { label: string; color: string }) {
  const colors: Record<string, string> = {
    emerald: 'text-emerald-700',
    blue: 'text-blue-700',
    purple: 'text-purple-700',
  };
  return (
    <p
      className={`text-[11px] font-black uppercase tracking-widest pt-3 pb-1 ${colors[color] ?? 'text-muted-foreground'}`}
    >
      {label}
    </p>
  );
}

const INVESTING_CATEGORIES = new Set([
  'EQUIPMENT',
  'ASSET_PURCHASE',
  'ASSET_DISPOSAL',
  'INVESTMENT',
  'CAPEX',
]);
const FINANCING_CATEGORIES = new Set([
  'SECURITY_DEPOSIT',
  'LOAN',
  'CAPITAL',
  'DIVIDEND',
  'FINANCING',
]);

function classifyEntry(category: string): 'operating' | 'investing' | 'financing' {
  const upper = (category ?? '').toUpperCase();
  if (INVESTING_CATEGORIES.has(upper)) return 'investing';
  if (FINANCING_CATEGORIES.has(upper)) return 'financing';
  return 'operating';
}

export default function CashFlowPage() {
  const [period, setPeriod] = useState<Period>('this_month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const { from, to } = useMemo(
    () => getDateRange(period, customFrom, customTo),
    [period, customFrom, customTo],
  );

  const { data: accounts = [], isLoading: loadingAccounts } = useQuery({
    queryKey: ['cf-accounts'],
    queryFn: () => fetchCashBankAccounts(),
    staleTime: 60_000,
  });

  const {
    data: cashbook = [],
    isLoading: loadingCashbook,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['cf-cashbook', from, to],
    queryFn: () => fetchCashbookEntries({ fromDate: from, toDate: to }),
    staleTime: 60_000,
    enabled: !!(from && to),
  });

  const isLoading = loadingAccounts || loadingCashbook;

  const openingBalance = useMemo(
    () => accounts.reduce((s, a) => s + Number(a.openingBalance), 0),
    [accounts],
  );
  const closingBalance = useMemo(
    () => accounts.reduce((s, a) => s + Number(a.currentBalance), 0),
    [accounts],
  );

  const { opReceipts, opPayments, invReceipts, invPayments, finReceipts, finPayments } =
    useMemo(() => {
      let opR = 0,
        opP = 0,
        invR = 0,
        invP = 0,
        finR = 0,
        finP = 0;
      for (const e of cashbook) {
        const cls = classifyEntry(e.category);
        const amt = Number(e.amount);
        if (e.entryType === 'RECEIPT') {
          if (cls === 'operating') opR += amt;
          else if (cls === 'investing') invR += amt;
          else finR += amt;
        } else {
          if (cls === 'operating') opP += amt;
          else if (cls === 'investing') invP += amt;
          else finP += amt;
        }
      }
      return {
        opReceipts: opR,
        opPayments: opP,
        invReceipts: invR,
        invPayments: invP,
        finReceipts: finR,
        finPayments: finP,
      };
    }, [cashbook]);

  const netOperating = opReceipts - opPayments;
  const netInvesting = invReceipts - invPayments;
  const netFinancing = finReceipts - finPayments;
  const netChange = netOperating + netInvesting + netFinancing;

  const exportExcel = () => {
    const rows: (string | number)[][] = [
      ['CASH FLOW STATEMENT', '', `${from} to ${to}`],
      [],
      ['OPERATING ACTIVITIES'],
      ['Cash receipts from customers / operations', opReceipts],
      ['Cash payments to vendors / operations', -opPayments],
      ['NET CASH FROM OPERATIONS', netOperating],
      [],
      ['INVESTING ACTIVITIES'],
      ['Cash receipts from investing', invReceipts],
      ['Cash payments for investing', -invPayments],
      ['NET CASH FROM INVESTING', netInvesting],
      [],
      ['FINANCING ACTIVITIES'],
      ['Cash receipts from financing', finReceipts],
      ['Cash payments for financing', -finPayments],
      ['NET CASH FROM FINANCING', netFinancing],
      [],
      ['NET CHANGE IN CASH', netChange],
      ['Opening Cash Balance (all accounts)', openingBalance],
      ['Closing Cash Balance (all accounts)', closingBalance],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cash Flow');
    XLSX.writeFile(wb, `Cash_Flow_${from}_${to}.xlsx`);
  };

  return (
    <div className="bg-blue-50/50 min-h-full p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-slate-800 tracking-tight">Cash Flow Statement</h3>
          <p className="text-muted-foreground">
            Direct method — {from} to {to}
          </p>
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
              <SelectItem value="custom">Custom</SelectItem>
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
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
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
        <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-center space-y-3">
          <p className="text-red-700 font-medium">Failed to load cash flow data.</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
            <StatCard
              title="Net Operating"
              value={formatCurrency(netOperating)}
              subtitle={`${cashbook.length} cashbook entries`}
            />
            <StatCard
              title="Net Change in Cash"
              value={formatCurrency(netChange)}
              subtitle="Total period movement"
            />
            <StatCard
              title="Closing Balance"
              value={formatCurrency(closingBalance)}
              subtitle="All accounts combined"
            />
          </div>

          <div className="rounded-2xl bg-card shadow-sm border border-slate-100">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="font-bold text-primary text-base">
                Cash Flow Statement — {from} to {to}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {cashbook.length} cashbook entries · {accounts.length} accounts
              </p>
            </div>
            <div className="px-6 py-4 space-y-0.5 max-w-2xl">
              <SectionLabel label="OPERATING ACTIVITIES" color="emerald" />
              <CFRow label="Cash receipts (operations)" value={opReceipts} indent />
              <CFRow label="Cash payments (operations)" value={-opPayments} indent />
              <hr className="my-2 border-border" />
              <CFRow
                label="NET CASH FROM OPERATIONS"
                value={netOperating}
                bold
                highlight={netOperating >= 0 ? 'positive' : 'negative'}
              />
              <hr className="my-2 border-2 border-slate-300" />

              <SectionLabel label="INVESTING ACTIVITIES" color="blue" />
              <CFRow label="Cash receipts from investing" value={invReceipts} indent />
              <CFRow label="Cash payments for investing" value={-invPayments} indent />
              <hr className="my-2 border-border" />
              <CFRow
                label="NET CASH FROM INVESTING"
                value={netInvesting}
                bold
                highlight={netInvesting >= 0 ? 'positive' : 'negative'}
              />
              <hr className="my-2 border-2 border-slate-300" />

              <SectionLabel label="FINANCING ACTIVITIES" color="purple" />
              <CFRow label="Cash receipts from financing" value={finReceipts} indent />
              <CFRow label="Cash payments for financing" value={-finPayments} indent />
              <hr className="my-2 border-border" />
              <CFRow
                label="NET CASH FROM FINANCING"
                value={netFinancing}
                bold
                highlight={netFinancing >= 0 ? 'positive' : 'negative'}
              />
              <hr className="my-2 border-2 border-slate-300" />

              <CFRow
                label="NET CHANGE IN CASH"
                value={netChange}
                bold
                highlight={netChange >= 0 ? 'positive' : 'negative'}
              />
              <CFRow label="Opening Cash Balance (all accounts)" value={openingBalance} indent />
              <hr className="my-2 border-border" />
              <CFRow
                label="CLOSING CASH BALANCE"
                value={closingBalance}
                bold
                highlight={closingBalance >= 0 ? 'positive' : 'negative'}
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Cash movements sourced from cashbook entries for the selected period. Opening & closing
            balances from live cash & bank account records. Cashbook entries are classified as
            Operating / Investing / Financing by category.
          </p>
        </>
      )}
    </div>
  );
}
