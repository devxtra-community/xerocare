import React from 'react';
import StatCard from '@/components/StatCard';

export default function VendorStats() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatCard title="Total Vendors" value="124" subtitle="All registered vendors" />
      <StatCard title="Active Vendors" value="98" subtitle="Currently active" />
      <StatCard title="Outstanding Payables" value="₹ 1,24,500" subtitle="To be paid" />
      <StatCard title="New Vendors" value="12" subtitle="Added this month" />
    </div>
  );
}
