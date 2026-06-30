'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Info } from 'lucide-react';
import {
  fetchARInvoices,
  fetchPurchases,
  fetchBranches,
  getDateRangeForPeriod,
  type InvoiceSummary,
  type PurchaseOrder,
  type Branch,
} from '@/lib/finance/accounts';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import * as XLSX from 'xlsx';

type Period = 'month' | 'quarter' | 'year' | 'custom';

type TaxRow = {
  ref: string;
  party: string;
  date?: string;
  taxableAmount: number;
  vatRate: string;
  vatAmount: number;
  currency: string;
};

function TaxTable({
  title,
  rows,
  type,
}: {
  title: string;
  rows: TaxRow[];
  type: 'output' | 'input';
}) {
  const headerCls = type === 'output' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700';
  const amtCls = type === 'output' ? 'text-emerald-600' : 'text-red-600';
  return (
    <div className="bg-card rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className={`px-4 py-3 border-b border-border ${headerCls}`}>
        <h3 className="font-bold text-sm">{title}</h3>
      </div>
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="pl-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Reference
            </TableHead>
            <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {type === 'output' ? 'Customer' : 'Vendor'}
            </TableHead>
            <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Date
            </TableHead>
            <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Taxable Amount
            </TableHead>
            <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              VAT %
            </TableHead>
            <TableHead className="text-right pr-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              VAT Amount
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                No records in this period
              </TableCell>
            </TableRow>
          ) : (
            rows.map((r, i) => (
              <TableRow key={i} className="hover:bg-blue-50/50 transition-colors">
                <TableCell className="pl-4 font-mono text-xs">{r.ref}</TableCell>
                <TableCell className="font-medium text-slate-800">{r.party}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.date}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(r.taxableAmount, r.currency)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">{r.vatRate}%</TableCell>
                <TableCell className={`text-right font-bold pr-4 ${amtCls}`}>
                  {formatCurrency(r.vatAmount, r.currency)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {rows.length > 0 && (
        <div className="border-t bg-muted/30 px-4 py-3 flex justify-end rounded-b-xl">
          <span className={`text-sm font-black ${amtCls}`}>
            Total: {formatCurrency(rows.reduce((s, r) => s + r.vatAmount, 0))}
          </span>
        </div>
      )}
    </div>
  );
}

export default function TaxReportPage() {
  const [period, setPeriod] = useState<Period>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [branchFilter, setBranchFilter] = useState('ALL');

  const { from, to } = useMemo(
    () => getDateRangeForPeriod(period, customFrom, customTo),
    [period, customFrom, customTo],
  );

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn: fetchBranches,
    staleTime: 600_000,
  });
  const {
    data: invoices = [],
    isLoading: invLoading,
    isError: invError,
    refetch: refetchInv,
  } = useQuery<InvoiceSummary[]>({
    queryKey: ['tax-ar-invoices', from, to],
    queryFn: () => fetchARInvoices({ fromDate: from, toDate: to }),
    staleTime: 60_000,
  });
  const {
    data: purchases = [],
    isLoading: poLoading,
    isError: poError,
    refetch: refetchPo,
  } = useQuery<PurchaseOrder[]>({
    queryKey: ['tax-purchases', from, to],
    queryFn: () => fetchPurchases({ fromDate: from, toDate: to }),
    staleTime: 60_000,
  });
  const isError = invError || poError;
  const refetchAll = () => {
    refetchInv();
    refetchPo();
  };

  const filteredInvoices = useMemo(
    () => (branchFilter === 'ALL' ? invoices : invoices.filter((i) => i.branchId === branchFilter)),
    [invoices, branchFilter],
  );
  const filteredPurchases = useMemo(
    () =>
      branchFilter === 'ALL' ? purchases : purchases.filter((p) => p.branchId === branchFilter),
    [purchases, branchFilter],
  );

  const outputTaxRows: TaxRow[] = filteredInvoices
    .filter((i) => (i.taxAmount ?? 0) > 0)
    .map((i) => ({
      ref: i.invoiceNumber,
      party: i.customerName,
      date: i.createdAt?.slice(0, 10),
      taxableAmount: i.totalAmount - (i.taxAmount ?? 0),
      vatRate:
        i.totalAmount > 0
          ? (((i.taxAmount ?? 0) / (i.totalAmount - (i.taxAmount ?? 0))) * 100).toFixed(1)
          : '5.0',
      vatAmount: i.taxAmount ?? 0,
      currency: i.currency,
    }));

  const inputTaxRows: TaxRow[] = filteredPurchases.map((p) => ({
    ref: (p.id?.slice(0, 8) ?? '') + '...',
    party: p.vendorName,
    date: p.createdAt?.slice(0, 10),
    taxableAmount: p.totalCost,
    vatRate: '5.0',
    vatAmount: p.totalCost * 0.05,
    currency: p.currency ?? 'AED',
  }));

  const totalOutputTax = outputTaxRows.reduce((s, r) => s + r.vatAmount, 0);
  const totalInputTax = inputTaxRows.reduce((s, r) => s + r.vatAmount, 0);
  const netVatPayable = totalOutputTax - totalInputTax;

  const exportExcel = () => {
    const rows = [
      ...outputTaxRows.map((r) => ({ ...r, 'Tax Type': 'Output (Customer)' })),
      ...inputTaxRows.map((r) => ({ ...r, 'Tax Type': 'Input (Vendor)' })),
    ];
    const ws = XLSX.utils.json_to_sheet(
      rows.map((r) => ({
        Reference: r.ref,
        Party: r.party,
        Date: r.date,
        'Taxable Amount': r.taxableAmount,
        'VAT Rate %': r.vatRate,
        'VAT Amount': r.vatAmount,
        Currency: r.currency,
        'Tax Type': r['Tax Type'],
      })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'VAT Report');
    XLSX.writeFile(wb, `VAT_Report_${from}_${to}.xlsx`);
  };

  return (
    <div className="bg-blue-50/50 min-h-full p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-slate-800 tracking-tight">Tax Report (VAT)</h3>
          <p className="text-muted-foreground">Gulf VAT compliance — Output vs Input tax</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-44 bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
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
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-44 bg-card border-border">
              <SelectValue placeholder="All Branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Branches</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name} ({b.currency})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={exportExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          >
            <Download className="h-4 w-4" /> Export Excel
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
        <StatCard
          title="Output Tax (Collected)"
          value={formatCurrency(totalOutputTax)}
          subtitle={`From ${outputTaxRows.length} invoices`}
        />
        <StatCard
          title="Input Tax (Paid)"
          value={formatCurrency(totalInputTax)}
          subtitle={`From ${inputTaxRows.length} purchase orders`}
        />
        <StatCard
          title="Net VAT Payable"
          value={formatCurrency(netVatPayable)}
          subtitle="Output − Input"
        />
      </div>

      {/* Info note */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
        <p className="text-sm text-blue-700">
          UAE VAT rate is 5%. Qatar currently has 0% VAT for most supplies. Input tax on vendor
          purchases is estimated at 5% — verify with actual vendor invoices for accurate filing.
        </p>
      </div>

      {invLoading || poLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : isError ? (
        <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-center space-y-3">
          <p className="text-red-700 font-medium">Failed to load tax data. Please retry.</p>
          <button
            onClick={refetchAll}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          <TaxTable
            title="Output Tax — Collected from Customers"
            rows={outputTaxRows}
            type="output"
          />
          <TaxTable
            title="Input Tax — Paid to Vendors (Estimated)"
            rows={inputTaxRows}
            type="input"
          />
        </>
      )}
    </div>
  );
}
