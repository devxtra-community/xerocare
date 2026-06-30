'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Scale, RefreshCw } from 'lucide-react';
import { fetchBalanceSheet } from '@/lib/finance/accountsApi';
import { formatCurrency } from '@/lib/format';
import StatCard from '@/components/StatCard';
import { Button } from '@/components/ui/button';

function BSRow({
  label,
  value,
  indent = false,
  bold = false,
  highlight,
  negative,
}: {
  label: string;
  value: number;
  indent?: boolean;
  bold?: boolean;
  highlight?: 'asset' | 'liability' | 'equity' | 'total';
  negative?: boolean;
}) {
  const colorMap = {
    asset: 'text-blue-600',
    liability: 'text-red-600',
    equity: 'text-purple-600',
    total: 'text-slate-800',
  };
  const display = negative ? -Math.abs(value) : value;
  const textColor =
    bold && highlight ? colorMap[highlight] : display < 0 ? 'text-red-600' : 'text-slate-700';
  return (
    <div className={`flex items-center justify-between py-1.5 ${indent ? 'pl-5' : ''}`}>
      <span
        className={`text-sm ${indent ? 'text-muted-foreground' : bold ? 'font-bold text-slate-800' : 'text-slate-700'}`}
      >
        {label}
      </span>
      <span className={`text-sm font-semibold tabular-nums ${textColor}`}>
        {display < 0 ? `(${formatCurrency(Math.abs(display))})` : formatCurrency(display)}
      </span>
    </div>
  );
}

export default function BalanceSheetPage() {
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().slice(0, 10));

  const {
    data: bs,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['balance-sheet'],
    queryFn: () => fetchBalanceSheet(),
    staleTime: 60_000,
  });

  const assets = bs?.assets;
  const liabilities = bs?.liabilities;
  const equity = bs?.equity;
  const isBalanced = bs?.balanced ?? false;
  const difference = bs?.difference ?? 0;

  const exportCSV = () => {
    if (!bs) return;
    const rows: (string | number)[][] = [
      ['BALANCE SHEET AS OF', asOfDate],
      [],
      ['ASSETS'],
      ['Cash in Hand', assets?.cash ?? 0],
      ['Cash at Bank', assets?.bank ?? 0],
      ['AR - Invoices Outstanding', assets?.invoiceAR ?? 0],
      ['AR - Manual Receivables', assets?.manualReceivables ?? 0],
      ['Total Accounts Receivable', assets?.receivables ?? 0],
      ['Equipment (Gross)', assets?.fixedAssetsGross ?? 0],
      ['Less: Accumulated Depreciation', -(assets?.accumulatedDepreciation ?? 0)],
      ['Net Equipment Value (NBV)', assets?.fixedAssetsNet ?? 0],
      ['TOTAL ASSETS', assets?.total ?? 0],
      [],
      ['LIABILITIES'],
      ['Accounts Payable (Vendors)', liabilities?.payables ?? 0],
      ['Accrued Expenses (Pending)', liabilities?.accruedExpenses ?? 0],
      ['VAT / Tax Payable', liabilities?.vatPayable ?? 0],
      ['TOTAL LIABILITIES', liabilities?.total ?? 0],
      [],
      ['EQUITY'],
      ['Net Equity', equity?.netEquity ?? 0],
      ['TOTAL EQUITY', equity?.total ?? 0],
      [],
      ['TOTAL LIABILITIES & EQUITY', bs?.totalLiabilitiesAndEquity ?? 0],
      ['DIFFERENCE (should be 0)', difference],
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Balance_Sheet_${asOfDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-blue-50/50 min-h-full p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-slate-800 tracking-tight">Balance Sheet</h3>
          <p className="text-muted-foreground">Financial position as of {asOfDate}</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
            As of:
            <input
              type="date"
              className="px-3 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
            />
          </label>
          <Button
            onClick={() => refetch()}
            variant="outline"
            disabled={isFetching}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button onClick={exportCSV} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : isError ? (
        <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-center">
          <p className="text-red-700 font-medium">Failed to load balance sheet. Please refresh.</p>
        </div>
      ) : (
        <>
          <div
            className={`flex items-center gap-2 rounded-xl p-3 border ${isBalanced ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}
          >
            <Scale className={`h-4 w-4 ${isBalanced ? 'text-emerald-600' : 'text-amber-600'}`} />
            <span
              className={`text-sm font-medium ${isBalanced ? 'text-emerald-700' : 'text-amber-700'}`}
            >
              {isBalanced
                ? 'Balance sheet is balanced — Assets = Liabilities + Equity ✓'
                : `Out of balance by ${formatCurrency(difference)} — add equity or manual entries to reconcile`}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
            <StatCard
              title="Total Assets"
              value={formatCurrency(assets?.total ?? 0)}
              subtitle="Cash + Fixed + Receivables"
            />
            <StatCard
              title="Total Liabilities"
              value={formatCurrency(liabilities?.total ?? 0)}
              subtitle="Payable to creditors"
            />
            <StatCard
              title="Total Equity"
              value={formatCurrency(equity?.total ?? 0)}
              subtitle="Owner's net worth"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* ASSETS */}
            <div className="rounded-2xl bg-card shadow-sm border border-slate-100">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="font-black text-blue-700 text-sm uppercase tracking-wide">ASSETS</h3>
              </div>
              <div className="p-5 space-y-0.5">
                <p className="text-xs font-bold uppercase text-muted-foreground mb-2">
                  Current Assets
                </p>
                <BSRow label="Cash in Hand" value={assets?.cash ?? 0} indent />
                <BSRow label="Cash at Bank" value={assets?.bank ?? 0} indent />
                <BSRow
                  label="Accounts Receivable (Invoices)"
                  value={assets?.invoiceAR ?? 0}
                  indent
                />
                <BSRow
                  label="Accounts Receivable (Manual)"
                  value={assets?.manualReceivables ?? 0}
                  indent
                />
                <hr className="my-2 border-border" />
                <BSRow
                  label="Total Current Assets"
                  value={(assets?.cash ?? 0) + (assets?.bank ?? 0) + (assets?.receivables ?? 0)}
                  bold
                  highlight="asset"
                />

                <p className="text-xs font-bold uppercase text-muted-foreground mb-2 mt-4">
                  Non-Current Assets
                </p>
                <BSRow label="Equipment (Gross)" value={assets?.fixedAssetsGross ?? 0} indent />
                <BSRow
                  label="Less: Accumulated Depreciation"
                  value={assets?.accumulatedDepreciation ?? 0}
                  indent
                  negative
                />
                <BSRow
                  label="Net Equipment Value (NBV)"
                  value={assets?.fixedAssetsNet ?? 0}
                  indent
                  bold
                />
                <hr className="my-2 border-border" />
                <BSRow
                  label="Total Non-Current Assets"
                  value={assets?.fixedAssetsNet ?? 0}
                  bold
                  highlight="asset"
                />
                <hr className="my-2 border-2 border-slate-300" />
                <BSRow label="TOTAL ASSETS" value={assets?.total ?? 0} bold highlight="total" />
              </div>
            </div>

            {/* LIABILITIES + EQUITY */}
            <div className="rounded-2xl bg-card shadow-sm border border-slate-100">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="font-black text-red-700 text-sm uppercase tracking-wide">
                  LIABILITIES & EQUITY
                </h3>
              </div>
              <div className="p-5 space-y-0.5">
                <p className="text-xs font-bold uppercase text-muted-foreground mb-2">
                  Current Liabilities
                </p>
                <BSRow
                  label="Accounts Payable (Vendors)"
                  value={liabilities?.payables ?? 0}
                  indent
                />
                <BSRow
                  label="Accrued Expenses (Pending)"
                  value={liabilities?.accruedExpenses ?? 0}
                  indent
                />
                <BSRow label="VAT / Tax Payable" value={liabilities?.vatPayable ?? 0} indent />
                <hr className="my-2 border-border" />
                <BSRow
                  label="Total Current Liabilities"
                  value={liabilities?.total ?? 0}
                  bold
                  highlight="liability"
                />
                <hr className="my-2 border-2 border-slate-300" />
                <BSRow
                  label="TOTAL LIABILITIES"
                  value={liabilities?.total ?? 0}
                  bold
                  highlight="liability"
                />

                <p className="text-xs font-bold uppercase text-muted-foreground mb-2 mt-5">
                  Equity
                </p>
                <BSRow
                  label="Net Equity (from equity entries)"
                  value={equity?.netEquity ?? 0}
                  indent
                />
                <hr className="my-2 border-border" />
                <BSRow label="TOTAL EQUITY" value={equity?.total ?? 0} bold highlight="equity" />
                <hr className="my-2 border-2 border-slate-300" />
                <BSRow
                  label="TOTAL LIABILITIES & EQUITY"
                  value={bs?.totalLiabilitiesAndEquity ?? 0}
                  bold
                  highlight="total"
                />
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Cash & bank from live account balances · Fixed assets from depreciation register (NBV) ·
            AR = outstanding invoices (INVOICED status) + manual receivables · VAT payable = tax
            collected on PAID/INVOICED invoices · Equity from equity entries module
          </p>
        </>
      )}
    </div>
  );
}
