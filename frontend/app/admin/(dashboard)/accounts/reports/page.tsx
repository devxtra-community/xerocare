'use client';

import React, { Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Download, FileText, BarChart2, TrendingUp, Scale, BookOpen, PieChart } from 'lucide-react';
import { fetchConsolidatedBalanceSheet, fetchConsolidatedPL } from '@/lib/finance/accountsApi';
import { formatCurrency } from '@/lib/format';
import BranchFilterBar from '@/components/accounts/admin/BranchFilterBar';
import * as XLSX from 'xlsx';

function ReportsContent() {
  const searchParams = useSearchParams();
  const branchIds = searchParams.get('branchIds') ?? '';
  const period = searchParams.get('period') ?? 'this_year';

  const params: Record<string, string> = { period };
  if (branchIds) params.branchIds = branchIds;

  const { data: bs } = useQuery({
    queryKey: ['admin-bs', branchIds, period],
    queryFn: () =>
      fetchConsolidatedBalanceSheet(params) as Promise<{
        totalAssets: number;
        totalLiabilities: number;
        totalEquity: number;
        cashAndBank: number;
        receivables: number;
        payables: number;
        fixedAssets: number;
        currentLiabilities: number;
        longTermLiabilities: number;
      }>,
  });

  const { data: pl } = useQuery({
    queryKey: ['admin-pl-rep', branchIds, period],
    queryFn: () =>
      fetchConsolidatedPL(params) as Promise<{
        monthly: { month: string; income: number; expenses: number }[];
        totalIncome: number;
        totalExpenses: number;
        netProfit: number;
        margin: number;
      }>,
  });

  const exportBalanceSheet = () => {
    if (!bs) return;
    const rows = [
      { Item: '=== ASSETS ===', Amount: '' },
      { Item: 'Cash & Bank', Amount: bs.cashAndBank },
      { Item: 'Receivables', Amount: bs.receivables },
      { Item: 'Fixed Assets (NBV)', Amount: bs.fixedAssets ?? 0 },
      { Item: 'TOTAL ASSETS', Amount: bs.totalAssets },
      { Item: '', Amount: '' },
      { Item: '=== LIABILITIES ===', Amount: '' },
      { Item: 'Payables', Amount: bs.payables },
      { Item: 'Current Liabilities', Amount: bs.currentLiabilities ?? 0 },
      { Item: 'Long-term Liabilities', Amount: bs.longTermLiabilities ?? 0 },
      { Item: 'TOTAL LIABILITIES', Amount: bs.totalLiabilities },
      { Item: '', Amount: '' },
      { Item: '=== EQUITY ===', Amount: '' },
      { Item: 'TOTAL EQUITY', Amount: bs.totalEquity },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Balance Sheet');
    XLSX.writeFile(wb, 'balance_sheet.xlsx');
  };

  const exportPL = () => {
    if (!pl) return;
    const rows = [
      ...(pl.monthly ?? []).map((r) => ({
        Month: r.month,
        Revenue: r.income,
        Expenses: r.expenses,
        'Net P&L': r.income - r.expenses,
      })),
      {
        Month: 'TOTAL',
        Revenue: pl.totalIncome,
        Expenses: pl.totalExpenses,
        'Net P&L': pl.netProfit,
      },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'P&L');
    XLSX.writeFile(wb, 'profit_loss.xlsx');
  };

  const reports = [
    {
      title: 'Balance Sheet',
      description: 'Assets, Liabilities, and Equity snapshot',
      icon: Scale,
      color: 'text-blue-600 bg-blue-50',
      onExport: exportBalanceSheet,
    },
    {
      title: 'Profit & Loss',
      description: 'Revenue, expenses, and net profit by period',
      icon: TrendingUp,
      color: 'text-emerald-600 bg-emerald-50',
      onExport: exportPL,
    },
    {
      title: 'Cash Flow',
      description: 'Cash receipts and payments summary',
      icon: BookOpen,
      color: 'text-purple-600 bg-purple-50',
      onExport: () => {},
    },
    {
      title: 'Receivables Aging',
      description: 'Outstanding receivables by aging bucket',
      icon: BarChart2,
      color: 'text-amber-600 bg-amber-50',
      onExport: () => {},
    },
    {
      title: 'Payables Aging',
      description: 'Outstanding payables by aging bucket',
      icon: FileText,
      color: 'text-red-600 bg-red-50',
      onExport: () => {},
    },
    {
      title: 'Depreciation Schedule',
      description: 'Asset register with depreciation details',
      icon: PieChart,
      color: 'text-gray-600 bg-gray-50',
      onExport: () => {},
    },
  ];

  return (
    <div className="bg-gray-50 min-h-full p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Financial Reports Hub</h1>
        <p className="text-sm text-gray-500">Generate and export consolidated financial reports</p>
      </div>

      <BranchFilterBar showPeriod />

      {/* Quick export cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((report) => (
          <div
            key={report.title}
            className="bg-white rounded-xl border p-5 hover:shadow-md transition-shadow"
          >
            <div
              className={`h-10 w-10 rounded-lg flex items-center justify-center ${report.color} mb-4`}
            >
              <report.icon className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-gray-900">{report.title}</h3>
            <p className="text-sm text-gray-500 mt-1 mb-4">{report.description}</p>
            <button
              onClick={report.onExport}
              className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              <Download className="h-4 w-4" /> Download Excel
            </button>
          </div>
        ))}
      </div>

      {/* Balance Sheet Preview */}
      {bs && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Balance Sheet Preview</h3>
            <button
              onClick={exportBalanceSheet}
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700"
            >
              <Download className="h-4 w-4" /> Export
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x">
            {/* Assets */}
            <div className="p-5">
              <h4 className="text-xs font-semibold uppercase text-blue-600 mb-3">Assets</h4>
              {[
                { label: 'Cash & Bank', value: bs.cashAndBank },
                { label: 'Receivables', value: bs.receivables },
                { label: 'Fixed Assets', value: bs.fixedAssets ?? 0 },
              ].map((i) => (
                <div key={i.label} className="flex justify-between py-1.5 text-sm">
                  <span className="text-gray-600">{i.label}</span>
                  <span className="font-medium">{formatCurrency(i.value)}</span>
                </div>
              ))}
              <div className="flex justify-between py-2 border-t mt-1 font-semibold text-sm text-blue-700">
                <span>Total Assets</span>
                <span>{formatCurrency(bs.totalAssets)}</span>
              </div>
            </div>
            {/* Liabilities */}
            <div className="p-5">
              <h4 className="text-xs font-semibold uppercase text-red-600 mb-3">Liabilities</h4>
              {[
                { label: 'Payables', value: bs.payables },
                { label: 'Current Liabilities', value: bs.currentLiabilities ?? 0 },
                { label: 'Long-term Liabilities', value: bs.longTermLiabilities ?? 0 },
              ].map((i) => (
                <div key={i.label} className="flex justify-between py-1.5 text-sm">
                  <span className="text-gray-600">{i.label}</span>
                  <span className="font-medium">{formatCurrency(i.value)}</span>
                </div>
              ))}
              <div className="flex justify-between py-2 border-t mt-1 font-semibold text-sm text-red-700">
                <span>Total Liabilities</span>
                <span>{formatCurrency(bs.totalLiabilities)}</span>
              </div>
            </div>
            {/* Equity */}
            <div className="p-5">
              <h4 className="text-xs font-semibold uppercase text-emerald-600 mb-3">Equity</h4>
              <div className="flex justify-between py-1.5 text-sm">
                <span className="text-gray-600">Total Equity</span>
                <span className="font-medium">{formatCurrency(bs.totalEquity)}</span>
              </div>
              <div className="mt-4 p-3 rounded-lg text-sm">
                {Math.abs(bs.totalAssets - bs.totalLiabilities - bs.totalEquity) < 1 ? (
                  <span className="text-emerald-600 font-semibold">✅ Balanced</span>
                ) : (
                  <span className="text-red-600 font-semibold">
                    ⚠ Difference:{' '}
                    {formatCurrency(
                      Math.abs(bs.totalAssets - bs.totalLiabilities - bs.totalEquity),
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* P&L Summary */}
      {pl && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">P&L Summary</h3>
            <button
              onClick={exportPL}
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700"
            >
              <Download className="h-4 w-4" /> Export
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5">
            {[
              { label: 'Total Revenue', value: pl.totalIncome, color: 'text-emerald-600' },
              { label: 'Total Expenses', value: pl.totalExpenses, color: 'text-red-600' },
              {
                label: 'Net Profit',
                value: pl.netProfit,
                color: pl.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700',
              },
              {
                label: 'Margin',
                value: `${pl.margin?.toFixed(1) ?? 0}%`,
                color: 'text-blue-600',
                isCurrency: false,
              },
            ].map((item) => (
              <div key={item.label} className="text-center p-4 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                <p className={`text-xl font-bold ${item.color}`}>
                  {item.isCurrency === false ? item.value : formatCurrency(item.value as number)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminReportsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading…</div>}>
      <ReportsContent />
    </Suspense>
  );
}
