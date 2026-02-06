'use client';

import StatCard from '@/components/StatCard';
import SalesSummaryTable from './SalesSummaryTable';
import MonthlySalesBarChart from './monthlysalesChart';
import MostSoldProductChart from './MostSoldProductChart';
import { useState, useEffect } from 'react';
import { salesService } from '@/services/salesService';

export default function ManagerSalesPage() {
  const [totalSales, setTotalSales] = useState(0);
  const [saleAmount, setSaleAmount] = useState(0);
  const [rentAmount, setRentAmount] = useState(0);
  const [leaseAmount, setLeaseAmount] = useState(0);
  const [totalInvoices, setTotalInvoices] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSalesData = async () => {
      try {
        setLoading(true);
        const salesData = await salesService.getBranchSalesTotals();

        setTotalSales(salesData.totalSales);
        setTotalInvoices(salesData.totalInvoices);

        // Set sales by type
        salesData.salesByType.forEach((item) => {
          if (item.saleType === 'SALE') setSaleAmount(item.total);
          else if (item.saleType === 'RENT') setRentAmount(item.total);
          else if (item.saleType === 'LEASE') setLeaseAmount(item.total);
        });
      } catch (error) {
        console.error('Failed to fetch sales data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSalesData();
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
            value={loading ? '...' : `₹${totalSales.toLocaleString()}`}
            subtitle="All sales, rent & lease"
          />
          <StatCard
            title="Total Orders"
            value={loading ? '...' : totalInvoices.toString()}
            subtitle="All completed orders"
          />
          <StatCard
            title="Product Sales"
            value={loading ? '...' : `₹${saleAmount.toLocaleString()}`}
            subtitle="Products & spare parts"
          />
          <StatCard
            title="Rent + Lease"
            value={loading ? '...' : `₹${(rentAmount + leaseAmount).toLocaleString()}`}
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
              <MonthlySalesBarChart />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-lg sm:text-xl font-bold text-primary">Sold Products by Quantity</h4>
            <div className="bg-card rounded-xl p-3">
              <MostSoldProductChart />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
