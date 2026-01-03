'use client';
import React from 'react';
import StatCard from '@/components/StatCard';

export default function InventoryKPICards() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 md:gap-4">
      <StatCard
        title="Total Products"
        value="1,245"
        subtitle="Across all categories"
      />
      <StatCard
        title="Total Stock Units"
        value="12,840"
        subtitle="Items available in stock"
      />
      <StatCard
        title="Total Inventory Value (₹)"
        value="₹ 24,50,000"
        subtitle="Total valuation"
      />
      <StatCard
        title="Damaged / Returned Stock"
        value="42"
        subtitle="Requiring inspection"
      />
    </div>
  );
}
