import React from 'react';
import StatCard from '@/components/StatCard';

interface PurchaseStatsProps {
  totalCost: number;
  totalVendors: number;
  totalProducts: number;
  totalPaid: number;
}

/**
 * Component displaying summary statistics for lot amounts.
 * Visualizes Key Performance Indicators (KPIs) like Total Cost, Vendor Count, and Item Volumes.
 */
export default function PurchaseStats({
  totalCost,
  totalVendors,
  totalProducts,
  totalPaid,
}: PurchaseStatsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <StatCard
        title="Total Cost"
        value={`QAR ${totalCost.toLocaleString()}`}
        subtitle="All Lot Amounts"
      />
      <StatCard title="Total Vendors" value={totalVendors.toString()} subtitle="Active Vendors" />
      <StatCard
        title="Total Lot Records"
        value={totalProducts.toString()}
        subtitle="Records Tracked"
      />
      <StatCard
        title="Total Paid"
        value={`QAR ${totalPaid.toLocaleString()}`}
        subtitle="Settled Amount"
      />
    </div>
  );
}
