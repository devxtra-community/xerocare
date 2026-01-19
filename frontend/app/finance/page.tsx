'use client';

import React from 'react';
import { Wallet, TrendingUp, ArrowUpRight, FileText, ArrowDownRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Sub-components (Ensure Card wrappers are removed from these individual files)
import APDueAgingChart from '@/components/Finance/APAgingChart';
import APDueTable from '@/components/Finance/APDuetable';
import ARAgingChart from '@/components/Finance/ARAgingChart';
import CashFlowMiniChart from '@/components/Finance/CashFlowMIniChart';
import RecentJournalTable from '@/components/Finance/RecentJournals';
import RevenueExpenseChart from '@/components/Finance/RevenueExpenseChart';

export default function FinanceDashboard() {
  return (
    <div className="max-w-[1600px] mx-auto p-6 lg:p-10 space-y-4 bg-slate-50/30 min-h-screen font-sans">
      {/* 1. COMPACT PAGE HEADER */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Finance Command</h1>
          <p className="text-slate-500 font-medium">
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

      {/* 2. KPI STRIP (Unified Heights) */}
      <KPIStats />

      {/* 3. PRIMARY ANALYTICS (2:1 Ratio) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        <Card className="lg:col-span-7 shadow-sm border-slate-200 min-h-[420px]">
          <CardHeader className=" border-slate-50 pb-0">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" /> Revenue vs. Expenses
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 ">
            <RevenueExpenseChart />
          </CardContent>
        </Card>

        <Card className="lg:col-span-5 shadow-sm border-slate-200 min-h-[420px]">
          <CardHeader className="border-slate-50 pb-0">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-600" /> Net Cash Flow
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <CashFlowMiniChart />
          </CardContent>
        </Card>
      </section>

      {/* 4. OPERATIONAL RISK (Balanced 1:1 Ratio) */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="bg-slate-50/50  border-slate-100 ">
            <CardTitle className=" font-bold">Receivables Aging (AR)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ARAgingChart />
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="bg-slate-50/50  border-slate-100 ">
            <CardTitle className="font-bold">Payables Aging (AP)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <APDueAgingChart />
          </CardContent>
        </Card>
      </section>

      {/* 5. DATA TABLES (Detailed Activity) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
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
  { label: 'Cash Balance', value: 'AED 120,000', trend: '+2.5%', upward: true, icon: Wallet },
  { label: 'AR Outstanding', value: 'AED 75,000', trend: '-4.1%', upward: false, icon: FileText },
  { label: 'AP Due', value: 'AED 42,000', trend: '+12%', upward: false, icon: Wallet },
  { label: 'Net Profit', value: 'AED 18,500', trend: '+18.2%', upward: true, icon: ArrowUpRight },
];

function KPIStats() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s) => (
        <Card key={s.label} className="shadow-sm border-slate-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-slate-100 rounded-md">
                <s.icon className="w-4 h-4 text-slate-600" />
              </div>
              <div
                className={`flex items-center text-xs font-bold ${s.upward ? 'text-emerald-600' : 'text-rose-600'}`}
              >
                {s.upward ? (
                  <ArrowUpRight className="w-3 h-3 mr-0.5" />
                ) : (
                  <ArrowDownRight className="w-3 h-3 mr-0.5" />
                )}
                {s.trend}
              </div>
            </div>
            <div className="mt-3">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                {s.label}
              </p>
              <p className="text-2xl font-black mt-1 tabular-nums text-slate-900">{s.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
