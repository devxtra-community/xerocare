'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Eye,
  TrendingDown,
  TrendingUp,
  DollarSign,
  CreditCard,
  ReceiptText,
  AlertCircle,
} from 'lucide-react';
import {
  fetchCashBankAccounts,
  fetchExpenseEntries,
  fetchManualReceivables,
  fetchManualPayables,
  fetchExpenseCharts,
  fetchReceivableCharts,
} from '@/lib/finance/accountsApi';
import { formatCurrency } from '@/lib/format';
import StatCard from '@/components/StatCard';
import { SimpleBarChart, DonutChart, SimpleLineChart } from '@/components/accounts/charts';

export default function ManagerAccountsOverview() {
  const { data: accounts = [] } = useQuery({
    queryKey: ['mgr-cash-bank'],
    queryFn: () => fetchCashBankAccounts(),
  });
  const { data: expenses = [] } = useQuery({
    queryKey: ['mgr-expenses'],
    queryFn: () => fetchExpenseEntries({}),
  });
  const { data: receivables = [] } = useQuery({
    queryKey: ['mgr-receivables'],
    queryFn: () => fetchManualReceivables(),
  });
  const { data: payables = [] } = useQuery({
    queryKey: ['mgr-payables'],
    queryFn: () => fetchManualPayables(),
  });
  const { data: expCharts } = useQuery({
    queryKey: ['mgr-exp-charts'],
    queryFn: () =>
      fetchExpenseCharts() as Promise<{
        categoryDonut: { name: string; value: number }[];
        monthlyTrend: Record<string, unknown>[];
        categories: string[];
      }>,
  });
  const { data: rcvCharts } = useQuery({
    queryKey: ['mgr-rcv-charts'],
    queryFn: () =>
      fetchReceivableCharts() as Promise<{
        collectionRate: { month: string; issued: number; collected: number }[];
        byType: { name: string; value: number }[];
      }>,
  });

  const totalCash = accounts
    .filter((a) => a.type === 'CASH')
    .reduce((s, a) => s + Number(a.currentBalance), 0);
  const totalBank = accounts
    .filter((a) => a.type === 'BANK')
    .reduce((s, a) => s + Number(a.currentBalance), 0);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.netAmount ?? 0), 0);
  const totalReceivable = receivables.reduce(
    (s, r) => s + (Number(r.amount) - Number(r.amountPaid ?? 0)),
    0,
  );
  const totalPayable = payables.reduce(
    (s, p) => s + (Number(p.amount) - Number(p.amountPaid ?? 0)),
    0,
  );
  const overdue90 = receivables
    .filter((r) => (r as { aging?: string }).aging === '90+ days')
    .reduce((s, r) => s + (Number(r.amount) - Number(r.amountPaid ?? 0)), 0);

  return (
    <div className="bg-blue-50/50 min-h-full p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Eye className="h-6 w-6 text-blue-600" /> Accounts Overview
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Your branch financial summary — read-only view
          </p>
        </div>
        <span className="bg-amber-100 text-amber-700 border border-amber-200 text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5">
          <Eye className="h-3.5 w-3.5" /> View Only
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          title="Cash Balance"
          value={formatCurrency(totalCash)}
          subtitle="All cash accounts"
        />
        <StatCard
          title="Bank Balance"
          value={formatCurrency(totalBank)}
          subtitle="All bank accounts"
        />
        <StatCard
          title="Total Receivable"
          value={formatCurrency(totalReceivable)}
          subtitle="Outstanding"
        />
        <StatCard
          title="Total Payable"
          value={formatCurrency(totalPayable)}
          subtitle="Outstanding"
        />
        <StatCard
          title="Total Expenses"
          value={formatCurrency(totalExpenses)}
          subtitle="All time"
        />
        <StatCard
          title="Overdue 90+"
          value={formatCurrency(overdue90)}
          subtitle="Critical overdue"
        />
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-red-500" /> Expense Category Breakdown
          </h3>
          <DonutChart data={expCharts?.categoryDonut ?? []} height={250} />
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <ReceiptText className="h-4 w-4 text-blue-500" /> Receivable by Type
          </h3>
          <DonutChart data={rcvCharts?.byType ?? []} height={250} />
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" /> Collection Rate Trend
          </h3>
          <SimpleLineChart
            data={rcvCharts?.collectionRate ?? []}
            xKey="month"
            lines={[
              { key: 'issued', color: '#3b82f6', label: 'Issued' },
              { key: 'collected', color: '#10b981', label: 'Collected' },
            ]}
            height={240}
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-purple-500" /> Cash & Bank Summary
          </h3>
          <SimpleBarChart
            data={accounts.map((a) => ({ name: a.name, balance: Number(a.currentBalance) }))}
            xKey="name"
            bars={[{ key: 'balance', color: '#3b82f6', label: 'Balance' }]}
            height={240}
          />
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: 'Cash & Bank',
            href: '/manager/accounts/cash-bank',
            icon: DollarSign,
            color: 'text-blue-600 bg-blue-50',
          },
          {
            label: 'Receivables',
            href: '/manager/accounts/receivable',
            icon: ReceiptText,
            color: 'text-green-600 bg-green-50',
          },
          {
            label: 'Payables',
            href: '/manager/accounts/payable',
            icon: CreditCard,
            color: 'text-amber-600 bg-amber-50',
          },
          {
            label: 'Expenses',
            href: '/manager/accounts/expenses',
            icon: TrendingDown,
            color: 'text-red-600 bg-red-50',
          },
        ].map((link) => (
          <a
            key={link.label}
            href={link.href}
            className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow"
          >
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${link.color}`}>
              <link.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-sm">{link.label}</p>
              <p className="text-xs text-gray-400">View →</p>
            </div>
          </a>
        ))}
      </div>

      {overdue90 > 0 && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
          <span className="text-sm font-medium">
            {formatCurrency(overdue90)} in receivables is overdue by 90+ days. Contact your Finance
            Manager.
          </span>
        </div>
      )}
    </div>
  );
}
