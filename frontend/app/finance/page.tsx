"use client";

import DashboardHeader from "@/components/DashboardHeader";
import StatCard from "@/components/StatCard";


export default function FinanceDashboardPage() {
  return (
    <>
     


      {/* Page Content */}
      <div className="p-4 sm:p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Receivables" value="₹4,20,000" />
          <StatCard title="Total Payables" value="₹2,10,000" />
          <StatCard title="Cash Balance" value="₹1,85,000" />
          <StatCard title="Net Profit (MTD)" value="₹95,000" />
        </div>

        {/* Next sections will go here */}
        {/* Cash Flow Chart */}
        {/* AR/AP Aging */}
        {/* Recent Transactions */}
      </div>
    </>
  );
}
