'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Search, Filter, BookMarked } from 'lucide-react';
import {
  fetchARInvoices,
  fetchPayments,
  fetchPurchases,
  fetchPayroll,
  CHART_OF_ACCOUNTS,
  type InvoiceSummary,
  type PaymentRecord,
  type PurchaseOrder,
  type PayrollRecord,
} from '@/lib/finance/accounts';
import { formatCurrency } from '@/lib/format';
import StatCard from '@/components/StatCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import * as XLSX from 'xlsx';

interface GLEntry {
  date: string;
  account: string;
  description: string;
  source: string;
  debit: number;
  credit: number;
  currency: string;
}

const SOURCE_COLORS: Record<string, string> = {
  'AR Invoice': 'bg-blue-100 text-blue-700',
  Payment: 'bg-emerald-100 text-emerald-700',
  'Purchase Order': 'bg-orange-100 text-orange-700',
  Payroll: 'bg-purple-100 text-purple-700',
};

export default function GeneralLedgerPage() {
  const [search, setSearch] = useState('');
  const [accountFilter, setAccountFilter] = useState('ALL');
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));

  const {
    data: invoices = [],
    isLoading: invLoading,
    isError: invError,
    refetch: refetchInv,
  } = useQuery<InvoiceSummary[]>({
    queryKey: ['gl-invoices'],
    queryFn: () => fetchARInvoices(),
    staleTime: 60_000,
  });
  const {
    data: payments = [],
    isLoading: payLoading,
    isError: payError,
    refetch: refetchPay,
  } = useQuery<PaymentRecord[]>({
    queryKey: ['gl-payments'],
    queryFn: () => fetchPayments(),
    staleTime: 60_000,
  });
  const {
    data: purchases = [],
    isLoading: poLoading,
    isError: poError,
    refetch: refetchPo,
  } = useQuery<PurchaseOrder[]>({
    queryKey: ['gl-purchases'],
    queryFn: () => fetchPurchases(),
    staleTime: 60_000,
  });
  const {
    data: payroll = [],
    isLoading: prLoading,
    isError: prError,
    refetch: refetchPr,
  } = useQuery<PayrollRecord[]>({
    queryKey: ['gl-payroll'],
    queryFn: () => fetchPayroll(),
    staleTime: 60_000,
  });

  const isLoading = invLoading || payLoading || poLoading || prLoading;
  const isError = invError || payError || poError || prError;
  const refetchAll = () => {
    refetchInv();
    refetchPay();
    refetchPo();
    refetchPr();
  };

  const entries: GLEntry[] = useMemo(() => {
    const rows: GLEntry[] = [];
    invoices.forEach((inv) => {
      const revenueAcc =
        inv.saleType === 'RENT'
          ? '4001 Rental Revenue'
          : inv.saleType === 'LEASE'
            ? '4002 Lease Revenue'
            : '4003 Sales Revenue';
      rows.push({
        date: inv.createdAt?.slice(0, 10) ?? '',
        account: '1003 Accounts Receivable',
        description: `Invoice ${inv.invoiceNumber} — ${inv.customerName}`,
        source: 'AR Invoice',
        debit: inv.totalAmount,
        credit: 0,
        currency: inv.currency,
      });
      rows.push({
        date: inv.createdAt?.slice(0, 10) ?? '',
        account: revenueAcc,
        description: `Invoice ${inv.invoiceNumber} — ${inv.customerName}`,
        source: 'AR Invoice',
        debit: 0,
        credit: inv.totalAmount,
        currency: inv.currency,
      });
      if ((inv.taxAmount ?? 0) > 0)
        rows.push({
          date: inv.createdAt?.slice(0, 10) ?? '',
          account: '2003 VAT / Tax Payable',
          description: `VAT on Invoice ${inv.invoiceNumber}`,
          source: 'AR Invoice',
          debit: 0,
          credit: inv.taxAmount ?? 0,
          currency: inv.currency,
        });
    });
    payments.forEach((p) => {
      const cashAcc = p.method === 'CASH' ? '1001 Cash in Hand' : '1002 Cash at Bank';
      rows.push({
        date: p.paymentDate?.slice(0, 10) ?? '',
        account: cashAcc,
        description: `Payment received — ${p.method}`,
        source: 'Payment',
        debit: p.amount,
        credit: 0,
        currency: p.currency,
      });
      rows.push({
        date: p.paymentDate?.slice(0, 10) ?? '',
        account: '1003 Accounts Receivable',
        description: 'Payment received',
        source: 'Payment',
        debit: 0,
        credit: p.amount,
        currency: p.currency,
      });
    });
    purchases.forEach((p) => {
      rows.push({
        date: p.createdAt?.slice(0, 10) ?? '',
        account: '5004 Vendor Purchase Cost',
        description: `Purchase from ${p.vendorName}`,
        source: 'Purchase Order',
        debit: p.totalCost,
        credit: 0,
        currency: p.currency ?? 'AED',
      });
      rows.push({
        date: p.createdAt?.slice(0, 10) ?? '',
        account: '2001 Accounts Payable',
        description: `Purchase from ${p.vendorName}`,
        source: 'Purchase Order',
        debit: 0,
        credit: p.totalCost,
        currency: p.currency ?? 'AED',
      });
      if ((p.shipping ?? 0) + (p.handling ?? 0) > 0)
        rows.push({
          date: p.createdAt?.slice(0, 10) ?? '',
          account: '5005 Shipping & Handling',
          description: `Freight on PO from ${p.vendorName}`,
          source: 'Purchase Order',
          debit: (p.shipping ?? 0) + (p.handling ?? 0),
          credit: 0,
          currency: p.currency ?? 'AED',
        });
    });
    payroll.forEach((p) => {
      const dateStr = `${p.year}-${String(p.month).padStart(2, '0')}-28`;
      rows.push({
        date: dateStr,
        account: '5006 Employee Salary Expense',
        description: `Payroll ${p.year}-${String(p.month).padStart(2, '0')}`,
        source: 'Payroll',
        debit: p.netSalary,
        credit: 0,
        currency: 'AED',
      });
      rows.push({
        date: dateStr,
        account: '1002 Cash at Bank',
        description: `Payroll disbursement ${p.year}-${String(p.month).padStart(2, '0')}`,
        source: 'Payroll',
        debit: 0,
        credit: p.netSalary,
        currency: 'AED',
      });
    });
    return rows.sort((a, b) => a.date.localeCompare(b.date));
  }, [invoices, payments, purchases, payroll]);

  const filtered = useMemo(
    () =>
      entries.filter((e) => {
        const matchDate = (!fromDate || e.date >= fromDate) && (!toDate || e.date <= toDate);
        const matchAccount = accountFilter === 'ALL' || e.account.startsWith(accountFilter);
        const matchSearch =
          !search ||
          e.description.toLowerCase().includes(search.toLowerCase()) ||
          e.account.toLowerCase().includes(search.toLowerCase());
        return matchDate && matchAccount && matchSearch;
      }),
    [entries, fromDate, toDate, accountFilter, search],
  );

  const withBalance = useMemo(() => {
    const result = [];
    let balance = 0;
    for (const e of filtered) {
      balance += e.debit - e.credit;
      result.push({ ...e, runningBalance: balance });
    }
    return result;
  }, [filtered]);

  const totalDebit = filtered.reduce((s, e) => s + e.debit, 0);
  const totalCredit = filtered.reduce((s, e) => s + e.credit, 0);

  const uniqueAccounts = useMemo(() => {
    const set = new Set(entries.map((e) => e.account.slice(0, 4)));
    return ['ALL', ...Array.from(set).sort()];
  }, [entries]);

  const exportExcel = () => {
    const rows = withBalance.map((e) => ({
      Date: e.date,
      Account: e.account,
      Description: e.description,
      Source: e.source,
      Debit: e.debit,
      Credit: e.credit,
      'Running Balance': e.runningBalance,
      Currency: e.currency,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'General Ledger');
    XLSX.writeFile(wb, `General_Ledger_${fromDate}_${toDate}.xlsx`);
  };

  return (
    <div className="bg-blue-50/50 min-h-full p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-slate-800 tracking-tight">General Ledger</h3>
          <p className="text-muted-foreground">
            All financial transactions with double-entry records
          </p>
        </div>
        <Button
          onClick={exportExcel}
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
        >
          <Download className="h-4 w-4" /> Export Excel
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
        <StatCard
          title="Total Entries"
          value={filtered.length.toString()}
          subtitle="In selected period"
        />
        <StatCard title="Total Debits" value={formatCurrency(totalDebit)} subtitle="Debit side" />
        <StatCard
          title="Total Credits"
          value={formatCurrency(totalCredit)}
          subtitle="Credit side"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 bg-card p-4 rounded-xl border border-slate-100 shadow-sm flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-10 bg-muted/50 border-none"
            placeholder="Search description or account..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
          <Select value={accountFilter} onValueChange={setAccountFilter}>
            <SelectTrigger className="w-48 bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {uniqueAccounts.map((a) => {
                if (a === 'ALL')
                  return (
                    <SelectItem key="ALL" value="ALL">
                      All Accounts
                    </SelectItem>
                  );
                const acc = CHART_OF_ACCOUNTS.find((c) => c.code === a);
                return (
                  <SelectItem key={a} value={a}>
                    {a} {acc?.name ?? ''}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <input
            type="date"
            className="px-3 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
          <span className="text-sm text-muted-foreground">to</span>
          <input
            type="date"
            className="px-3 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
      </div>

      {/* Loading / Error */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : isError ? (
        <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-center space-y-3">
          <p className="text-red-700 font-medium">Failed to load ledger data.</p>
          <button
            onClick={refetchAll}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors"
          >
            Retry
          </button>
        </div>
      ) : null}

      {/* Table */}
      {!isLoading && !isError && (
        <div className="bg-card rounded-xl shadow-sm border border-slate-100 p-1">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="pl-4 w-24 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Date
                </TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Account
                </TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Description
                </TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Source
                </TableHead>
                <TableHead className="text-right w-28 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Debit
                </TableHead>
                <TableHead className="text-right w-28 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Credit
                </TableHead>
                <TableHead className="text-right w-32 pr-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Balance
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {withBalance.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-20 text-muted-foreground">
                    <BookMarked className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    No ledger entries found
                  </TableCell>
                </TableRow>
              ) : (
                withBalance.map((e, i) => (
                  <TableRow key={i} className="hover:bg-blue-50/50 transition-colors">
                    <TableCell className="pl-4 font-mono text-xs text-muted-foreground">
                      {e.date}
                    </TableCell>
                    <TableCell className="text-xs font-medium">{e.account}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[260px] truncate">
                      {e.description}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${SOURCE_COLORS[e.source] ?? 'bg-slate-100 text-slate-600'}`}
                      >
                        {e.source}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-blue-600 font-semibold text-sm">
                      {e.debit > 0 ? formatCurrency(e.debit, e.currency) : '—'}
                    </TableCell>
                    <TableCell className="text-right text-emerald-600 font-semibold text-sm">
                      {e.credit > 0 ? formatCurrency(e.credit, e.currency) : '—'}
                    </TableCell>
                    <TableCell
                      className={`text-right font-bold text-sm pr-4 ${e.runningBalance < 0 ? 'text-red-600' : 'text-slate-800'}`}
                    >
                      {formatCurrency(Math.abs(e.runningBalance))}
                      {e.runningBalance < 0 ? ' Cr' : ' Dr'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {withBalance.length > 0 && (
            <div className="border-t bg-muted/30 px-4 py-3 flex items-center gap-8 rounded-b-xl">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex-1">
                Totals
              </span>
              <span className="text-sm font-black text-blue-600 w-28 text-right">
                {formatCurrency(totalDebit)}
              </span>
              <span className="text-sm font-black text-emerald-600 w-28 text-right">
                {formatCurrency(totalCredit)}
              </span>
              <span className="text-sm font-black text-slate-800 w-32 text-right pr-4">
                {formatCurrency(Math.abs(totalDebit - totalCredit))}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
