'use client';

import StatCard from '@/components/StatCard';
import SalesSummaryTable from './SalesSummaryTable';
import MonthlySalesBarChart from './monthlysalesChart';
import { useState, useEffect } from 'react';
import { salesService } from '@/services/salesService';

/**
 * Manager Sales Dashboard Page.
 * Aggregates sales data including Total Revenue, Orders, and Sales by Type (Sale/Rent/Lease).
 * Integrates `SalesSummaryTable`, `MonthlySalesBarChart`, and `MostSoldProductChart` for detailed analytics.
 */
export default function ManagerSalesPage() {
  const [totalSales, setTotalSales] = useState(0);
  const [saleAmount, setSaleAmount] = useState(0);
  const [rentAmount, setRentAmount] = useState(0);
  const [leaseAmount, setLeaseAmount] = useState(0);
  const [totalInvoices, setTotalInvoices] = useState(0);
  const [loading, setLoading] = useState(true);
  const [salesTrend, setSalesTrend] = useState<{ month: string; value: number }[]>([]);
  const [rentTrend, setRentTrend] = useState<{ month: string; value: number }[]>([]);

  useEffect(() => {
    const fetchSalesData = async () => {
      try {
        setLoading(true);
        const [salesData, trendData] = await Promise.all([
          salesService.getBranchSalesTotals(),
          salesService.getBranchSalesOverview('1Y'),
        ]);

        setTotalSales(salesData.totalSales);
        setTotalInvoices(salesData.totalInvoices);

        // Set sales by type
        salesData.salesByType.forEach((item) => {
          if (item.saleType === 'SALE') setSaleAmount(item.total);
          else if (item.saleType === 'RENT') setRentAmount(item.total);
          else if (item.saleType === 'LEASE') setLeaseAmount(item.total);
        });

        // Process trend data
        const months = [
          'Jan',
          'Feb',
          'Mar',
          'Apr',
          'May',
          'Jun',
          'Jul',
          'Aug',
          'Sep',
          'Oct',
          'Nov',
          'Dec',
        ];
        const salesMap: Record<string, number> = {};
        const rentMap: Record<string, number> = {};

        trendData.forEach((item) => {
          const date = new Date(item.date);
          const monthLabel = months[date.getMonth()];

          if (item.saleType === 'SALE') {
            salesMap[monthLabel] = (salesMap[monthLabel] || 0) + item.totalSales;
          } else {
            rentMap[monthLabel] = (rentMap[monthLabel] || 0) + item.totalSales;
          }
        });

        const formattedSales = months.map((m) => ({ month: m, value: salesMap[m] || 0 }));
        const formattedRent = months.map((m) => ({ month: m, value: rentMap[m] || 0 }));

        // Only show up to current month or last 6 months for better visibility if data is sparse
        setSalesTrend(formattedSales);
        setRentTrend(formattedRent);
      } catch (error) {
        console.error('Failed to fetch sales data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSalesData();
  }, []);

  const formatToK = (value: number) => {
    if (value >= 1000) {
      return `₹${(value / 1000).toFixed(1)}k`;
    }
    return `₹${value.toLocaleString()}`;
  };

  return (
    <div className="bg-blue-100 min-h-screen p-3 sm:p-4 md:p-6 space-y-8 sm:space-y-10">
      {/* SALES */}
      <div className="space-y-4 sm:space-y-6">
        <h3 className="text-xl sm:text-2xl font-bold text-primary">Sales</h3>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 md:gap-4">
          <StatCard
            title="Total Revenue"
            value={loading ? '...' : formatToK(totalSales)}
            subtitle="All sales, rent & lease"
          />
          <StatCard
            title="Total Orders"
            value={loading ? '...' : totalInvoices.toString()}
            subtitle="All completed orders"
          />
          <StatCard
            title="Product Sales"
            value={loading ? '...' : formatToK(saleAmount)}
            subtitle="Products & spare parts"
          />
          <StatCard
            title="Rent + Lease"
            value={loading ? '...' : formatToK(rentAmount + leaseAmount)}
            subtitle="Rental & lease income"
          />
        </div>

        {/* TABLE */}
        <div className="space-y-4">
          <h3 className="text-lg sm:text-xl font-bold text-primary">Sales Summary</h3>
          <SalesSummaryTable />
        </div>

        {/* ANALYTICS */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-4">
            <h4 className="text-lg sm:text-xl font-bold text-primary">Sales per Month</h4>
            <div className="bg-card rounded-xl p-3">
              <MonthlySalesBarChart data={salesTrend} title="Product Sales" />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-lg sm:text-xl font-bold text-primary">Rent + Lease per Month</h4>
            <div className="bg-card rounded-xl p-3">
              <MonthlySalesBarChart data={rentTrend} title="Rent & Lease" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
