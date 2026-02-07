'use client';

import { useState, useEffect } from 'react';
import { getInvoices } from '@/lib/invoice';
import StatCard from '@/components/StatCard';
import ProductsTable from '@/components/AdminDahboardComponents/dashboardComponents/productTable';
import HrTable from '@/components/AdminDahboardComponents/dashboardComponents/HrTable';
import SalesChart from '@/components/AdminDahboardComponents/dashboardComponents/SalesChart';
import EmployeePieChart from '@/components/AdminDahboardComponents/dashboardComponents/employeesPiechart';
import WarehouseTable from '@/components/AdminDahboardComponents/dashboardComponents/WarehouseTable';
import CategoryPieChart from '@/components/AdminDahboardComponents/dashboardComponents/CategoryPieChart';

export default function Dashboard() {
  const [stats, setStats] = useState({
    earnings: '0.00',
    totalSold: '0',
    bestSellingModel: 'N/A',
    bestSellingProduct: 'N/A',
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const invoices = await getInvoices();
        const sales = invoices.filter((inv) => inv.saleType === 'SALE');

        // Total Earnings (Assuming totalAmount is the final price)
        const totalEarnings = sales.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);

        // Total Items Sold & Best Sellers
        let totalItems = 0;
        const productCounts: Record<string, number> = {};

        sales.forEach((inv) => {
          if (inv.items) {
            inv.items.forEach((item) => {
              const qty = item.quantity || 0;
              totalItems += qty;
              const name = item.description || 'Unknown';
              productCounts[name] = (productCounts[name] || 0) + qty;
            });
          }
        });

        // Find best selling
        let bestProduct = 'N/A';
        let maxCount = 0;
        Object.entries(productCounts).forEach(([name, count]) => {
          if (count > maxCount) {
            maxCount = count;
            bestProduct = name;
          }
        });

        setStats({
          earnings: totalEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 }),
          totalSold: totalItems.toString(),
          bestSellingModel: 'N/A', // Placeholder as model is not in invoice items directly
          bestSellingProduct: bestProduct,
        });
      } catch (error) {
        console.error('Failed to fetch dashboard stats', error);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="bg-blue-100 min-h-screen p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      {/* <h3 className="text-xl sm:text-2xl md:text-2xl font-bold text-primary">
        Welcome, Riyas!
      </h3> */}

      <div className="flex flex-col space-y-3 sm:space-y-4">
        <h3 className="text-lg sm:text-m font-bold text-primary">Sales</h3>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
          <StatCard title="Total Earnings" value={stats.earnings} subtitle="1 month indicator" />
          <StatCard
            title="Total Number Of Products Sold"
            value={stats.totalSold}
            subtitle="1 month indicator"
          />
          <StatCard
            title="Best Selling Model"
            value={stats.bestSellingModel}
            subtitle="1 month indicator"
          />
          <StatCard
            title="Best Selling Product"
            value={stats.bestSellingProduct}
            subtitle="1 month indicator"
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-2">
            <h3 className="text-base sm:text-lg md:text-xl font-bold text-primary">Products</h3>
            <ProductsTable />
          </div>
          <div className="space-y-2">
            <h3 className="text-base sm:text-lg md:text-xl font-bold text-primary">
              Sales Overview
            </h3>
            <SalesChart />
          </div>
        </div>
      </div>

      <div className="flex flex-col space-y-3 sm:space-y-4">
        <h3 className="text-lg sm:text-xl font-bold text-primary">Human Resources</h3>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
          <div className="xl:col-span-2">
            <HrTable />
          </div>
          <div className="xl:col-span-1">
            <EmployeePieChart />
          </div>
        </div>
      </div>

      <div className="flex flex-col space-y-3 sm:space-y-4">
        <h3 className="text-lg sm:text-xl font-bold text-primary">Warehouse</h3>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
          <div className="xl:col-span-2">
            <WarehouseTable />
          </div>
          <div className="xl:col-span-1">
            <CategoryPieChart />
          </div>
        </div>
      </div>
    </div>
  );
}
