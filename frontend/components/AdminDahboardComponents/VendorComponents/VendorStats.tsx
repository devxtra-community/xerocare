import React from 'react';
import StatCard from '@/components/StatCard';

export interface VendorStatsProps {
  totalVendors: number;
  activeVendors: number;
  newVendors: number;
}

/**
 * Component displaying summarized vendor statistics.
 * Shows total vendors, active vendors, outstanding payables, and new vendors.
 */
export default function VendorStats({ totalVendors, activeVendors, newVendors }: VendorStatsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatCard
        title="Total Vendors"
        value={totalVendors.toString()}
        subtitle="All registered vendors"
      />
      <StatCard
        title="Active Vendors"
        value={activeVendors.toString()}
        subtitle="Currently active"
      />
      <StatCard title="Outstanding Payables" value="₹ 0" subtitle="To be paid" />
      <StatCard title="New Vendors" value={newVendors.toString()} subtitle="Added this month" />
    </div>
  );
}
