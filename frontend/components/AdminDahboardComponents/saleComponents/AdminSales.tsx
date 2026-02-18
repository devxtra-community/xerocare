'use client';

import { useState, useEffect } from 'react';
import StatCard from '@/components/StatCard';
import SalesSummaryTable from './SalesSummaryTable';

import MonthlySalesBarChart from './monthlysalesChart';
import MostSoldProductChart from './MostSoldProductChart';
import { getAdminSalesStats, AdminSalesStats } from '@/lib/invoice';

/**
 * Admin Sales Dashboard page.
 * Displays comprehensive sales statistics, summary tables, and analytical charts.
 * Aggregates key metrics like Total Revenue, Orders, and Products Sold.
 */
export default function AdminSalesPage() {
  const [stats, setStats] = useState<AdminSalesStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getAdminSalesStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch admin sales stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="bg-blue-100 min-h-screen p-3 sm:p-4 md:p-6 space-y-8 sm:space-y-10">
      {/* SALES */}
      <div className="space-y-4 sm:space-y-6">
        <h3 className="text-xl sm:text-2xl font-bold text-primary">Sales</h3>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 md:gap-4">
          <StatCard
            title="Total Revenue"
            value={loading ? '...' : `${(stats?.totalRevenue || 0).toLocaleString()} AED`}
            subtitle="Lifetime Sale"
          />
          <StatCard
            title="Total Orders"
            value={loading ? '...' : (stats?.totalOrders || 0).toString()}
            subtitle="Total Sales Orders"
          />
          <StatCard
            title="Products Sold"
            value={loading ? '...' : (stats?.productsSold || 0).toString()}
            subtitle="Total Quantity"
          />
          <StatCard
            title="Top Product"
            value={loading ? '...' : stats?.topProduct || 'N/A'}
            subtitle="Most Sold"
          />
        </div>

        {/* TABLE + TREND */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6 items-stretch">
          <div className="flex flex-col space-y-4">
            <h3 className="text-lg sm:text-xl font-bold text-primary">Sales Summary</h3>
            <div className="flex-1">
              <SalesSummaryTable />
            </div>
          </div>
        </div>

        {/* ANALYTICS */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-4">
            <h4 className="text-lg sm:text-xl font-bold text-primary">Sales per Month</h4>
            <div className="bg-card rounded-xl p-3">
              <MonthlySalesBarChart data={stats?.monthlySales || []} />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-lg sm:text-xl font-bold text-primary">Sold Products by Quantity</h4>
            <div className="bg-card rounded-xl p-3">
              <MostSoldProductChart data={stats?.soldProductsByQty || []} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
