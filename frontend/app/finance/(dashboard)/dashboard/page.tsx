'use client';

import React from 'react';
import { Wallet, FileText, ArrowUpRight, ArrowDownRight } from 'lucide-react';

// Finance components (self-contained visuals)
import APDueAgingChart from '@/components/Finance/APAgingChart';
import APDueTable from '@/components/Finance/ APDuetable';
import ARAgingChart from '@/components/Finance/ARAgingChart';
import CashFlowMiniChart from '@/components/Finance/ CashFlowMIniChart';
import RecentJournalTable from '@/components/Finance/RecentJournals';
import RevenueExpenseChart from '@/components/Finance/RevenueExpenseChart';

export default function FinanceDashboard() {
  return (
    <div className="bg-muted min-h-full p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-primary">Finance Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}{' '}
            • Performance Overview
          </p>
        </div>
      </header>

      {/* KPI STRIP */}
      <KPIStats />

      {/* PRIMARY ANALYTICS */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Revenue vs Expense */}
        <div className="lg:col-span-7 rounded-2xl bg-white shadow-sm">
          <div className="px-4 py-3 border-b">
            <h3 className="text-base font-bold text-primary">Revenue vs Expenses</h3>
          </div>
          <div className="p-4">
            <RevenueExpenseChart />
          </div>
        </div>

        {/* Net Cash Flow */}
        <div className="lg:col-span-5 rounded-2xl bg-white shadow-sm">
          <div className="px-4 py-3 border-b">
            <h3 className="text-base font-bold text-primary">Net Cash Flow</h3>
          </div>
          <div className="p-4">
            <CashFlowMiniChart />
          </div>
        </div>
      </section>

      {/* AGING PANELS (NO EXTRA WRAPPERS) */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <ARAgingChart />
        <APDueAgingChart />
      </section>

      {/* TABLES */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        <div className="lg:col-span-5">
          <APDueTable />
        </div>
        <div className="lg:col-span-7">
          <RecentJournalTable />
        </div>
      </section>
    </div>
  );
}

const stats = [
  {
    label: 'Cash Balance',
    value: '120,000',
    trend: '+2.5%',
    upward: true,
    icon: Wallet,
  },
  {
    label: 'AR Outstanding',
    value: '75,000',
    trend: '-4.1%',
    upward: false,
    icon: FileText,
  },
  {
    label: 'AP Due',
    value: '42,000',
    trend: '+12%',
    upward: false,
    icon: Wallet,
  },
  {
    label: 'Net Profit',
    value: '18,500',
    trend: '+18.2%',
    upward: true,
    icon: ArrowUpRight,
  },
];

function KPIStats() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-2xl min-h-[70px] sm:h-[80px] bg-white shadow-sm p-3 flex flex-col justify-center gap-1"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
            <span
              className={`flex items-center text-[10px] font-semibold ${
                s.upward ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {s.upward ? (
                <ArrowUpRight className="w-3 h-3 mr-0.5" />
              ) : (
                <ArrowDownRight className="w-3 h-3 mr-0.5" />
              )}
              {s.trend}
            </span>
          </div>

          <p className="text-xl sm:text-2xl font-bold text-primary">{s.value}</p>
        </div>
      ))}
    </div>
  );
}
