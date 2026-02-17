'use client';

import StatCard from '@/components/StatCard';
import DashbordTable from '@/components/ManagerDashboardComponents/dashboardComponents/productTable';
import BranchSalesChart from '@/components/ManagerDashboardComponents/dashboardComponents/branchsalesChart';
import { useState, useEffect } from 'react';
import { inventoryService } from '@/services/inventoryService';
import { branchService } from '@/services/branchService';
import { salesService } from '@/services/salesService';

export default function Dashboard() {
  const [branchName, setBranchName] = useState('Branch');
  const [totalSales, setTotalSales] = useState(0);
  const [saleAmount, setSaleAmount] = useState(0);
  const [rentAmount, setRentAmount] = useState(0);
  const [leaseAmount, setLeaseAmount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [, branch, salesData] = await Promise.all([
          inventoryService.getInventoryStats(),
          branchService.getMyBranch(),
          salesService.getBranchSalesTotals(),
        ]);

        if (branch?.name) setBranchName(branch.name);

        // Set total sales
        setTotalSales(salesData.totalSales);

        // Set sales by type
        salesData.salesByType.forEach((item) => {
          if (item.saleType === 'SALE') setSaleAmount(item.total);
          else if (item.saleType === 'RENT') setRentAmount(item.total);
          else if (item.saleType === 'LEASE') setLeaseAmount(item.total);
        });
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatToK = (value: number) => {
    if (value >= 1000) {
      return `₹${(value / 1000).toFixed(1)}k`;
    }
    return `₹${value.toLocaleString()}`;
  };

  return (
    <div className="bg-blue-100 min-h-full p-3 sm:p-4 md:p-6 space-y-6 sm:space-y-8">
      <div className="flex flex-col space-y-4 sm:space-y-6">
        <h3 className="text-xl sm:text-2xl font-bold text-primary">{branchName} Sales</h3>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
          <StatCard
            title="Total Revenue"
            value={loading ? '...' : formatToK(totalSales)}
            subtitle="All sales, rent, and lease"
          />
          <StatCard
            title="Product Sales"
            value={loading ? '...' : formatToK(saleAmount)}
            subtitle="Products and spare parts"
          />
          <StatCard
            title="Rent Revenue"
            value={loading ? '...' : formatToK(rentAmount)}
            subtitle="Rental income"
          />
          <StatCard
            title="Lease Revenue"
            value={loading ? '...' : formatToK(leaseAmount)}
            subtitle="Lease income"
          />
        </div>

        <div className="space-y-3">
          <h3 className="text-lg sm:text-xl font-bold text-primary">Outlet Inventory</h3>
          <DashbordTable />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
        <div className="flex-1 space-y-2">
          <h3 className="text-lg sm:text-xl font-bold text-primary">Daily Sales Trends</h3>
          <BranchSalesChart
            period="1W"
            title="Weekly Overview"
            subtitle="Revenue by day for the last 7 days"
          />
        </div>
        <div className="flex-1 space-y-2">
          <h3 className="text-lg sm:text-xl font-bold text-primary">Monthly Sales Trends</h3>
          <BranchSalesChart
            period="1Y"
            title="Yearly Overview"
            subtitle="Revenue by month for the current year"
          />
        </div>
      </div>
    </div>
  );
}
