'use client';

import React from 'react';
import FinanceStats from '@/components/ManagerDashboardComponents/financeComponents/FinanceStats';
import RevenueSummaryTable from '@/components/ManagerDashboardComponents/financeComponents/RevenueSummaryTable';
import { YearSelector } from '@/components/ui/YearSelector';

import RevenueVsExpenseChart from '@/components/ManagerDashboardComponents/financeComponents/RevenueVsExpenseChart';

import ProfitChart from '@/components/ManagerDashboardComponents/financeComponents/ProfitChart';

export default function ManagerFinancePage() {
  const [selectedYear, setSelectedYear] = React.useState<number | 'all'>(new Date().getFullYear());

  return (
    <div className="bg-blue-100 min-h-screen p-3 sm:p-4 md:p-6 space-y-6 sm:space-y-8">
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold text-primary tracking-tight">
            Financial Overview
          </h2>
          <p className="text-sm text-muted-foreground font-medium">
            Analyze revenue streams, track expenses, and manage receivables
          </p>
        </div>
        <YearSelector selectedYear={selectedYear} onYearChange={setSelectedYear} />
      </div>

      {/* STATS SECTION */}
      <FinanceStats selectedYear={selectedYear} />

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <RevenueVsExpenseChart selectedYear={selectedYear} />

        <ProfitChart selectedYear={selectedYear} />
      </div>

      {/* TABLES SECTION */}
      <div className="space-y-8">
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-primary uppercase tracking-tighter">
            Revenue Summary
          </h3>
          <RevenueSummaryTable selectedYear={selectedYear} />
        </div>
      </div>
    </div>
  );
}
