'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Eye, Download } from 'lucide-react';
import { fetchExpenseEntries, fetchManualReceivables } from '@/lib/finance/accountsApi';
import { fetchARInvoices } from '@/lib/finance/accounts';
import { formatCurrency } from '@/lib/format';
import StatCard from '@/components/StatCard';
import { SimpleBarChart, SimpleLineChart } from '@/components/accounts/charts';
import * as XLSX from 'xlsx';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function ManagerProfitLossPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  const { data: invoices = [] } = useQuery({
    queryKey: ['mgr-ar-inv'],
    queryFn: () => fetchARInvoices(),
  });
  const { data: manual = [] } = useQuery({
    queryKey: ['mgr-receivables'],
    queryFn: () => fetchManualReceivables(),
  });
  const { data: expenses = [] } = useQuery({
    queryKey: ['mgr-expenses'],
    queryFn: () => fetchExpenseEntries({}),
  });

  const filterYear = (date: string | Date) => new Date(date).getFullYear() === year;

  const incomeByMonth = MONTHS.map((_, idx) => {
    const invIncome = invoices
      .filter((i) => filterYear(i.createdAt) && new Date(i.createdAt).getMonth() === idx)
      .reduce((s, i) => s + Number(i.totalAmount), 0);
    const manIncome = manual
      .filter(
        (r) =>
          filterYear((r as { issueDate?: string }).issueDate ?? '') &&
          new Date((r as { issueDate?: string }).issueDate ?? '').getMonth() === idx,
      )
      .reduce((s, r) => s + Number(r.amount), 0);
    return invIncome + manIncome;
  });

  const expByMonth = MONTHS.map((_, idx) =>
    expenses
      .filter(
        (e) => filterYear(e.date) && new Date(e.date).getMonth() === idx && e.status !== 'REJECTED',
      )
      .reduce((s, e) => s + Number(e.amount), 0),
  );

  const plByMonth = MONTHS.map((_, idx) => ({
    month: MONTHS[idx],
    income: incomeByMonth[idx],
    expenses: expByMonth[idx],
    net: incomeByMonth[idx] - expByMonth[idx],
  }));

  const totalIncome = incomeByMonth.reduce((s, v) => s + v, 0);
  const totalExpenses = expByMonth.reduce((s, v) => s + v, 0);
  const netProfit = totalIncome - totalExpenses;
  const margin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet([
      ...plByMonth.map((row) => ({
        Month: row.month,
        Income: row.income,
        Expenses: row.expenses,
        'Net P&L': row.net,
      })),
      { Month: 'TOTAL', Income: totalIncome, Expenses: totalExpenses, 'Net P&L': netProfit },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `P&L ${year}`);
    XLSX.writeFile(wb, `profit_loss_${year}.xlsx`);
  };

  return (
    <div className="bg-blue-50/50 min-h-full p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Eye className="h-6 w-6 text-blue-600" /> Profit & Loss
          </h1>
          <p className="text-sm text-gray-500">Your branch P&L — view only</p>
        </div>
        <div className="flex gap-2">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {[currentYear - 2, currentYear - 1, currentYear].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          title="Total Income"
          value={formatCurrency(totalIncome)}
          subtitle={`FY ${year}`}
        />
        <StatCard
          title="Total Expenses"
          value={formatCurrency(totalExpenses)}
          subtitle={`FY ${year}`}
        />
        <StatCard
          title="Net Profit"
          value={formatCurrency(netProfit)}
          subtitle={netProfit >= 0 ? 'Profitable' : 'Net Loss'}
        />
        <StatCard title="Profit Margin" value={`${margin.toFixed(1)}%`} subtitle="Of revenue" />
      </div>

      <div className="bg-white rounded-xl border p-4">
        <h3 className="text-sm font-semibold text-gray-600 mb-3">Monthly Income vs Expenses</h3>
        <SimpleBarChart
          data={plByMonth}
          xKey="month"
          bars={[
            { key: 'income', color: '#10b981', label: 'Income' },
            { key: 'expenses', color: '#ef4444', label: 'Expenses' },
          ]}
          height={260}
        />
      </div>

      <div className="bg-white rounded-xl border p-4">
        <h3 className="text-sm font-semibold text-gray-600 mb-3">Net Profit Trend</h3>
        <SimpleLineChart
          data={plByMonth}
          xKey="month"
          lines={[{ key: 'net', color: '#6366f1', label: 'Net P&L' }]}
          height={200}
        />
      </div>

      {/* P&L Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h3 className="text-sm font-semibold text-gray-700">Monthly P&L Statement — {year}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Month</th>
                <th className="px-4 py-3 text-right font-medium">Income</th>
                <th className="px-4 py-3 text-right font-medium">Expenses</th>
                <th className="px-4 py-3 text-right font-medium">Net P&L</th>
                <th className="px-4 py-3 text-right font-medium">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {plByMonth.map((row) => {
                const rowMargin = row.income > 0 ? (row.net / row.income) * 100 : 0;
                return (
                  <tr key={row.month} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{row.month}</td>
                    <td className="px-4 py-3 text-right text-emerald-600">
                      {formatCurrency(row.income)}
                    </td>
                    <td className="px-4 py-3 text-right text-red-600">
                      {formatCurrency(row.expenses)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-semibold ${row.net >= 0 ? 'text-emerald-700' : 'text-red-700'}`}
                    >
                      {formatCurrency(row.net)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right text-xs ${rowMargin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                    >
                      {rowMargin.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-100 font-semibold border-t-2">
              <tr>
                <td className="px-4 py-3">Total</td>
                <td className="px-4 py-3 text-right text-emerald-700">
                  {formatCurrency(totalIncome)}
                </td>
                <td className="px-4 py-3 text-right text-red-700">
                  {formatCurrency(totalExpenses)}
                </td>
                <td
                  className={`px-4 py-3 text-right ${netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}
                >
                  {formatCurrency(netProfit)}
                </td>
                <td
                  className={`px-4 py-3 text-right text-xs ${margin >= 0 ? 'text-emerald-700' : 'text-red-700'}`}
                >
                  {margin.toFixed(1)}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
