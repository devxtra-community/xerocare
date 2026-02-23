import StatCard from '@/components/StatCard';
import { formatCurrency } from '@/lib/format';

export interface VendorStatsProps {
  totalVendors: number;
  activeVendors: number;
  totalSpending: number;
  totalOrders: number;
}

/**
 * Component displaying summarized vendor statistics.
 * Shows total vendors, active vendors, total spending, and total order count.
 */
export default function VendorStats({
  totalVendors,
  activeVendors,
  totalSpending,
  totalOrders,
}: VendorStatsProps) {
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
      <StatCard
        title="Total Spending Value"
        value={formatCurrency(totalSpending)}
        subtitle="Across all purchases"
      />
      <StatCard
        title="Total Order Value"
        value={totalOrders.toString()}
        subtitle="Total orders placed"
      />
    </div>
  );
}
