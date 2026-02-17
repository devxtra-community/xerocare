'use client';

import { useState, useEffect } from 'react';
import { getGlobalSalesTotals } from '@/lib/invoice';
import { getBranches } from '@/lib/branch';
import { getWarehouses } from '@/lib/warehouse';
import { getAllEmployees } from '@/lib/employee';
import StatCard from '@/components/StatCard';
import ProductsTable from '@/components/AdminDahboardComponents/dashboardComponents/productTable';
import HrTable from '@/components/AdminDahboardComponents/dashboardComponents/HrTable';
import SalesChart from '@/components/AdminDahboardComponents/dashboardComponents/SalesChart';
import EmployeePieChart from '@/components/AdminDahboardComponents/dashboardComponents/employeesPiechart';
import WarehouseTable from '@/components/AdminDahboardComponents/dashboardComponents/WarehouseTable';
import CategoryPieChart from '@/components/AdminDahboardComponents/dashboardComponents/CategoryPieChart';

// Utility function to format numbers in compact format (k, M, B)
function formatCompactNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return num.toFixed(2);
}

export default function Dashboard() {
  const [stats, setStats] = useState({
    earnings: '0.00',
    branchCount: '0',
    warehouseCount: '0',
    employeeCount: '0',
  });

  useEffect(() => {
    const fetchStats = async () => {
      // Fetch each stat independently to be resilient
      try {
        const salesTotalsPromise = getGlobalSalesTotals().catch((err) => {
          console.error('Failed to fetch sales totals:', err);
          return null;
        });
        const branchesResPromise = getBranches().catch((err) => {
          console.error('Failed to fetch branches:', err);
          return null;
        });
        const warehousesResPromise = getWarehouses().catch((err) => {
          console.error('Failed to fetch warehouses:', err);
          return null;
        });
        const employeeResPromise = getAllEmployees().catch((err) => {
          console.error('Failed to fetch employees:', err);
          return null;
        });

        const [salesTotals, branchesRes, warehousesRes, employeeRes] = await Promise.all([
          salesTotalsPromise,
          branchesResPromise,
          warehousesResPromise,
          employeeResPromise,
        ]);

        console.log('Dashboard Data Fetch Summary:', {
          hasSales: !!salesTotals,
          branchesCount: branchesRes?.data?.length,
          warehousesCount: warehousesRes?.data?.length,
          employeesCount: employeeRes?.data?.employees?.length,
        });

        setStats({
          earnings: `${formatCompactNumber(salesTotals?.totalSales || 0)} AED`,
          branchCount: (branchesRes?.data?.length || 0).toString(),
          warehouseCount: (warehousesRes?.data?.length || 0).toString(),
          employeeCount: (employeeRes?.data?.employees?.length || 0).toString(),
        });
      } catch (error) {
        console.error('Critical error in fetchStats:', error);
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
        <h3 className="text-lg sm:text-m font-bold text-primary">Admin Dashboard</h3>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
          <StatCard title="Total Earnings" value={stats.earnings} subtitle="All branches" />
          <StatCard title="Branches" value={stats.branchCount} subtitle="Active branches" />
          <StatCard title="Warehouses" value={stats.warehouseCount} subtitle="Total warehouses" />
          <StatCard title="Employees" value={stats.employeeCount} subtitle="Total workforce" />
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
