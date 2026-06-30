'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Eye, Download } from 'lucide-react';
import {
  fetchEquitySummary,
  fetchEquityEntries,
  fetchEquityStatement,
} from '@/lib/finance/accountsApi';
import { formatCurrency } from '@/lib/format';
import StatCard from '@/components/StatCard';
import { DonutChart } from '@/components/accounts/charts';
import * as XLSX from 'xlsx';

const TYPE_COLORS: Record<string, string> = {
  SHARE_CAPITAL: 'bg-blue-100 text-blue-700',
  RETAINED_EARNINGS: 'bg-emerald-100 text-emerald-700',
  RESERVES: 'bg-purple-100 text-purple-700',
  OWNER_CONTRIBUTION: 'bg-indigo-100 text-indigo-700',
  DIVIDEND: 'bg-red-100 text-red-700',
  PROFIT_TRANSFER: 'bg-green-100 text-green-700',
  LOSS_TRANSFER: 'bg-orange-100 text-orange-700',
  OTHER: 'bg-gray-100 text-gray-700',
};

export default function ManagerEquityPage() {
  const currentYear = new Date().getFullYear();

  const { data: summary } = useQuery({
    queryKey: ['mgr-equity-summary'],
    queryFn: () => fetchEquitySummary(),
  });
  const { data: entries = [] } = useQuery({
    queryKey: ['mgr-equity-entries'],
    queryFn: () => fetchEquityEntries({}),
  });
  const { data: statement } = useQuery({
    queryKey: ['mgr-equity-stmt', currentYear],
    queryFn: () => fetchEquityStatement({ year: String(currentYear) }),
  });

  const byType = Object.entries(
    entries.reduce<Record<string, number>>((acc, e) => {
      acc[e.type] = (acc[e.type] ?? 0) + Number(e.amount);
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }));

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      entries.map((e) => ({
        'Entry No': e.entryNo,
        Date: e.date,
        Type: e.type,
        Description: e.description,
        Amount: e.amount,
        Currency: e.currency,
      })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Equity Entries');
    XLSX.writeFile(wb, 'equity_entries.xlsx');
  };

  return (
    <div className="bg-blue-50/50 min-h-full p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Eye className="h-6 w-6 text-blue-600" /> Equity
          </h1>
          <p className="text-sm text-gray-500">Your branch equity position — view only</p>
        </div>
        <div className="flex gap-2">
          <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1">
            <Eye className="h-3 w-3" /> View Only
          </span>
          <button
            onClick={exportExcel}
            className="flex items-center gap-1.5 text-sm border rounded-lg px-3 py-2 bg-white hover:bg-gray-50"
          >
            <Download className="h-4 w-4" /> Export
          </button>
        </div>
      </div>

      {/* Equity Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 text-white">
        <p className="text-sm font-medium opacity-80 mb-1">Net Equity</p>
        <p className="text-4xl font-bold">{formatCurrency(summary?.netEquity ?? 0)}</p>
        <p className="text-sm opacity-70 mt-1">Assets − Liabilities = Equity</p>
        <div className="flex gap-6 mt-4 text-sm">
          <span>
            Total Assets: <strong>{formatCurrency(summary?.totalAssets ?? 0)}</strong>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          title="Share Capital"
          value={formatCurrency(summary?.shareCapital ?? 0)}
          subtitle="Paid-in capital"
        />
        <StatCard
          title="Retained Earnings"
          value={formatCurrency(summary?.retainedEarnings ?? 0)}
          subtitle="Accumulated"
        />
        <StatCard
          title="Owner Contribution"
          value={formatCurrency(summary?.ownerContribution ?? 0)}
          subtitle="Capital input"
        />
        <StatCard title="Total Entries" value={entries.length.toString()} subtitle="Records" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">Equity Composition</h3>
          <DonutChart data={byType} height={240} />
        </div>
        {statement && (
          <div className="bg-white rounded-xl border p-4">
            <h3 className="text-sm font-semibold text-gray-600 mb-3">
              Statement of Changes — {statement.year ?? currentYear}
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-1.5 border-b">
                <span className="text-gray-600">Opening Balance</span>
                <span className="font-semibold">
                  {formatCurrency(statement.opening?.total ?? 0)}
                </span>
              </div>
              {statement.movements?.map((m, i: number) => (
                <div key={i} className="flex justify-between py-1.5 border-b text-gray-500">
                  <span className="pl-4">{m.type?.replace(/_/g, ' ')}</span>
                  <span className={(m.total ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                    {formatCurrency(m.total ?? 0)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between py-1.5 font-semibold text-gray-900">
                <span>Closing Balance</span>
                <span>{formatCurrency(statement.closing?.total ?? 0)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent Entries Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h3 className="text-sm font-semibold text-gray-700">Recent Equity Entries</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
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
                  <td colSpan={6} className="text-center py-8 text-gray-400">
                    No equity entries found
                  </td>
                </tr>
              ) : (
                entries.slice(0, 20).map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{e.entryNo}</td>
                    <td className="px-4 py-3">{String(e.date).slice(0, 10)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[e.type] ?? 'bg-gray-100 text-gray-700'}`}
                      >
                        {e.type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[200px] truncate text-gray-600">
                      {e.description}
                    </td>
                    <td className="px-4 py-3 font-semibold">{formatCurrency(e.amount)}</td>
                    <td className="px-4 py-3 text-gray-500">{e.currency}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
