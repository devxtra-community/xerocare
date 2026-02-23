import React from 'react';
import StatCard from '@/components/StatCard';

interface PurchaseStatsProps {
  totalCost: number;
  totalVendors: number;
  totalProducts: number;
  totalModels: number;
}

/**
 * Component displaying summary statistics for purchases.
 * Visualizes Key Performance Indicators (KPIs) like Total Cost, Vendor Count, and Item Volumes.
 */
export default function PurchaseStats({
  totalCost,
  totalVendors,
  totalProducts,
  totalModels,
}: PurchaseStatsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <StatCard
        title="Total Cost"
        value={`QAR ${totalCost.toLocaleString()}`}
        subtitle="All Purchases"
      />
      <StatCard title="Total Vendors" value={totalVendors.toString()} subtitle="Active Vendors" />
      <StatCard
        title="Total Products"
        value={totalProducts.toString()}
        subtitle="Items Purchased"
      />
      <StatCard title="Total Models" value={totalModels.toString()} subtitle="Models Purchased" />
    </div>
  );
}
