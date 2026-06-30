'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, RefreshCw, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { fetchDayBook } from '@/lib/finance/accountsApi';
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

type Period = 'today' | 'this_week' | 'this_month' | 'custom';

function getDateRange(
  period: Period,
  customFrom: string,
  customTo: string,
): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const today = now.toISOString().slice(0, 10);
  if (period === 'custom') return { from: customFrom, to: customTo };
  if (period === 'today') return { from: today, to: today };
  if (period === 'this_week') {
    const day = now.getDay(); // 0 = Sun
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((day + 6) % 7));
    return { from: monday.toISOString().slice(0, 10), to: today };
  }
  // this_month
  return {
    from: new Date(y, m, 1).toISOString().slice(0, 10),
    to: new Date(y, m + 1, 0).toISOString().slice(0, 10),
  };
}

function fmtDate(d: string): string {
  const date = new Date(d);
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function DayBookPage() {
  const [period, setPeriod] = useState<Period>('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const { from, to } = useMemo(
    () => getDateRange(period, customFrom, customTo),
    [period, customFrom, customTo],
  );

  const {
    data: dayBook,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['daybook', from, to],
    queryFn: () => fetchDayBook({ fromDate: from, toDate: to }),
    staleTime: 60_000,
    enabled: !!(from && to),
  });

  const totals = dayBook?.totals ?? {
    totalReceipts: 0,
    totalPayments: 0,
    net: 0,
    transactionCount: 0,
  };
  const days = dayBook?.days ?? [];

  const exportExcel = () => {
    const rows: (string | number)[][] = [
      ['DAY BOOK', '', `${from} to ${to}`],
      [],
      ['Date', 'Reference', 'Type', 'Category', 'Description', 'Mode', 'Receipt', 'Payment'],
    ];
    for (const day of days) {
      for (const e of day.entries) {
        rows.push([
          day.date,
          e.referenceNo,
          e.entryType,
          e.category,
          e.description ?? '',
          e.paymentMode ?? '',
          e.entryType === 'RECEIPT' ? Number(e.amount) : '',
          e.entryType === 'PAYMENT' ? Number(e.amount) : '',
        ]);
      }
      rows.push([`${day.date} TOTALS`, '', '', '', '', '', day.totalReceipts, day.totalPayments]);
      rows.push([]);
    }
    rows.push(['GRAND TOTAL', '', '', '', '', '', totals.totalReceipts, totals.totalPayments]);
    rows.push(['NET', totals.net]);
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Day Book');
    XLSX.writeFile(wb, `Day_Book_${from}_${to}.xlsx`);
  };

  return (
    <div className="bg-blue-50/50 min-h-full p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-slate-800 tracking-tight">Day Book</h3>
          <p className="text-muted-foreground">
            Daily cash receipts &amp; payments — {from} to {to}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-44 bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="this_week">This Week</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
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
            disabled={days.length === 0}
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
          <p className="text-red-700 font-medium">Failed to load day book data.</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
            <StatCard
              title="Total Earnings"
              value={formatCurrency(totals.totalReceipts)}
              subtitle="Cash received"
            />
            <StatCard
              title="Total Expenses"
              value={formatCurrency(totals.totalPayments)}
              subtitle="Cash paid out"
            />
            <StatCard
              title="Net Cash"
              value={formatCurrency(totals.net)}
              subtitle={totals.net >= 0 ? 'Surplus' : 'Deficit'}
            />
            <StatCard
              title="Transactions"
              value={String(totals.transactionCount)}
              subtitle={`${days.length} day(s)`}
            />
          </div>

          {days.length === 0 ? (
            <div className="rounded-2xl bg-card shadow-sm border border-slate-100 p-12 text-center">
              <p className="text-muted-foreground">No transactions in this period.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {days.map((day) => (
                <div
                  key={day.date}
                  className="rounded-2xl bg-card shadow-sm border border-slate-100 overflow-hidden"
                >
                  <div className="px-6 py-4 border-b border-border flex flex-wrap items-center justify-between gap-3 bg-slate-50/60">
                    <div>
                      <h3 className="font-bold text-slate-800 text-base">{fmtDate(day.date)}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {day.transactionCount} transaction(s)
                      </p>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <span className="text-emerald-600 font-semibold">
                        + {formatCurrency(day.totalReceipts)}
                      </span>
                      <span className="text-red-600 font-semibold">
                        − {formatCurrency(day.totalPayments)}
                      </span>
                      <span
                        className={`font-bold ${day.net >= 0 ? 'text-slate-800' : 'text-red-600'}`}
                      >
                        Net {formatCurrency(day.net)}
                      </span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                          <th className="px-6 py-2 font-semibold">Reference</th>
                          <th className="px-4 py-2 font-semibold">Category</th>
                          <th className="px-4 py-2 font-semibold">Description</th>
                          <th className="px-4 py-2 font-semibold">Mode</th>
                          <th className="px-4 py-2 font-semibold text-right">Receipt</th>
                          <th className="px-6 py-2 font-semibold text-right">Payment</th>
                        </tr>
                      </thead>
                      <tbody>
                        {day.entries.map((e) => (
                          <tr key={e.id} className="border-b border-border/60 hover:bg-slate-50/60">
                            <td className="px-6 py-2.5 font-medium text-slate-700">
                              <span className="inline-flex items-center gap-1.5">
                                {e.entryType === 'RECEIPT' ? (
                                  <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-600" />
                                ) : (
                                  <ArrowUpRight className="h-3.5 w-3.5 text-red-600" />
                                )}
                                {e.referenceNo}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-slate-600">{e.category}</td>
                            <td className="px-4 py-2.5 text-slate-600">{e.description ?? '—'}</td>
                            <td className="px-4 py-2.5 text-slate-600">{e.paymentMode ?? '—'}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-emerald-600">
                              {e.entryType === 'RECEIPT' ? formatCurrency(Number(e.amount)) : ''}
                            </td>
                            <td className="px-6 py-2.5 text-right tabular-nums text-red-600">
                              {e.entryType === 'PAYMENT' ? formatCurrency(Number(e.amount)) : ''}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Earnings are cash receipts (customer payments). Expenses are cash payments (paid
            expenses). Entries are auto-posted from invoice receipts and expense payments, plus any
            manual cashbook entries.
          </p>
        </>
      )}
    </div>
  );
}
