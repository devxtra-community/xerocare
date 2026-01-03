'use client';

import React from 'react';
import StatCard from '@/components/StatCard';

export default function FinanceStats() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 md:gap-4">
      <StatCard
        title="Total Revenue"
        value="₹4,85,000"
        subtitle="MTD: ₹1.2M YTD"
      />
      <StatCard
        title="Total Expenses"
        value="₹1,42,000"
        subtitle="MTD Aggregate"
      />
      <StatCard
        title="Net Profit"
        value="₹3,43,000"
        subtitle="Margin: 70.7%"
      />
      <StatCard
        title="Outstanding"
        value="₹82,500"
        subtitle="Receivables Due"
      />
    </div>
  );
}
