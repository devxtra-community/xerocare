import StatCard from '@/components/StatCard';
import { formatCurrency, formatCompactNumber } from '@/lib/format';

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
  // Local formatter to rule out lib conflicts
  const formatValue = (val: number, isCurrency = false) => {
    if (val >= 1000) {
      const kValue = (val / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
      return isCurrency ? `QAR ${kValue}` : kValue;
    }
    return isCurrency ? formatCurrency(val) : formatCompactNumber(val);
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatCard
        title="Total Vendors"
        value={formatCompactNumber(totalVendors)}
        subtitle="All registered vendors"
      />
      <StatCard
        title="Active Vendors"
        value={formatCompactNumber(activeVendors)}
        subtitle="Currently active"
      />
      <StatCard
        title="Total Spending Value"
        value={formatValue(totalSpending, true)}
        subtitle="Across all vendor purchases"
      />
      <StatCard
        title="Total Order Value"
        value={formatCompactNumber(totalOrders)}
        subtitle="Total orders placed"
      />
    </div>
  );
}
