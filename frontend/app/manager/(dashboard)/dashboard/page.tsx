'use client';

import StatCard from '@/components/StatCard';
import { useState, useEffect } from 'react';
import { inventoryService } from '@/services/inventoryService';
import { branchService } from '@/services/branchService';
import { salesService } from '@/services/salesService';
import BranchSalesChart from '@/components/ManagerDashboardComponents/dashboardComponents/branchsalesChart';
import RevenuePieChart from '@/components/ManagerDashboardComponents/dashboardComponents/RevenuePieChart';
import SalaryDistributionChart from '@/components/ManagerDashboardComponents/dashboardComponents/SalaryDistributionChart';
import DashboardPage from '@/components/DashboardPage';
import { YearSelector } from '@/components/ui/YearSelector';
import { formatCurrency } from '@/lib/format';

export default function Dashboard() {
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(new Date().getFullYear());
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
          salesService.getBranchSalesTotals(selectedYear === 'all' ? undefined : selectedYear),
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
  }, [selectedYear]);

  return (
    <DashboardPage>
      <div className="flex flex-col space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-xl sm:text-2xl font-bold text-primary tracking-tight">
              {branchName} Sales
            </h3>
            <p className="text-sm text-muted-foreground font-medium">
              Performance metrics and seasonal trends
            </p>
          </div>
          <YearSelector selectedYear={selectedYear} onYearChange={setSelectedYear} />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
          <StatCard
            title="Total Revenue"
            value={loading ? '...' : formatCurrency(totalSales)}
            subtitle="All sales, rent, and lease"
          />
          <StatCard
            title="Product Sales"
            value={loading ? '...' : formatCurrency(saleAmount)}
            subtitle="Products and spare parts"
          />
          <StatCard
            title="Rent Revenue"
            value={loading ? '...' : formatCurrency(rentAmount)}
            subtitle="Rental income"
          />
          <StatCard
            title="Lease Revenue"
            value={loading ? '...' : formatCurrency(leaseAmount)}
            subtitle="Lease income"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="space-y-2">
          <h3 className="text-lg sm:text-xl font-bold text-primary">Daily Sales Trends</h3>
          <BranchSalesChart
            period="1W"
            title="Weekly Overview"
            subtitle="Revenue by day"
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
          />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg sm:text-xl font-bold text-primary">Monthly Sales Trends</h3>
          <BranchSalesChart
            period="1Y"
            title="Yearly Overview"
            subtitle={`Revenue by month for ${selectedYear === 'all' ? 'all time' : selectedYear}`}
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
          />
        </div>
        <div className="space-y-2">
          <SalaryDistributionChart />
        </div>
        <div className="space-y-2">
          <RevenuePieChart />
        </div>
      </div>
    </DashboardPage>
  );
}
