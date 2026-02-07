'use client';

import React from 'react';
import FinanceStats from '@/components/ManagerDashboardComponents/financeComponents/FinanceStats';
import RevenueSummaryTable from '@/components/ManagerDashboardComponents/financeComponents/RevenueSummaryTable';
import OutstandingReceivablesTable from '@/components/ManagerDashboardComponents/financeComponents/OutstandingReceivablesTable';
import RevenueVsExpenseChart from '@/components/ManagerDashboardComponents/financeComponents/RevenueVsExpenseChart';
import RevenueBySourceChart from '@/components/ManagerDashboardComponents/financeComponents/RevenueBySourceChart';
import ProfitChart from '@/components/ManagerDashboardComponents/financeComponents/ProfitChart';

export default function ManagerFinancePage() {
  return (
    <div className="bg-blue-100 min-h-screen p-3 sm:p-4 md:p-6 space-y-6 sm:space-y-8">
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold text-primary tracking-tight">
            Financial Overview
          </h2>
          <p className="text-sm text-muted-foreground font-medium">
            Analyze revenue streams, track expenses, and manage receivables
          </p>
        </div>
      </div>

      {/* STATS SECTION */}
      <FinanceStats />

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <RevenueVsExpenseChart />
        <RevenueBySourceChart />
        <ProfitChart />
      </div>

      {/* TABLES SECTION */}
      <div className="space-y-8">
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-primary uppercase tracking-tighter">
            Revenue Summary
          </h3>
          <RevenueSummaryTable />
        </div>
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-primary uppercase tracking-tighter">
            Outstanding Receivables
          </h3>
          <OutstandingReceivablesTable />
        </div>
      </div>
    </div>
  );
}
