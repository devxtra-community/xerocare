import { PurchaseStats } from '@/lib/purchase';
import StatCard from '@/components/StatCard';

interface PurchaseStatsProps {
  stats: PurchaseStats;
}

export function PurchaseStatsCards({ stats }: PurchaseStatsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 md:gap-4">
      <StatCard
        title="Total Cost"
        value={`₹${stats.totalCost.toLocaleString()}`}
        subtitle="Total purchase amount"
      />
      <StatCard
        title="Total Orders"
        value={stats.totalOrders.toString()}
        subtitle="Total purchase orders"
      />
      <StatCard
        title="Total Vendors"
        value={stats.totalVendors.toString()}
        subtitle="Active vendors"
      />
      <StatCard
        title="Total Products"
        value={stats.totalProducts.toString()}
        subtitle="Products in stock"
      />
    </div>
  );
}
