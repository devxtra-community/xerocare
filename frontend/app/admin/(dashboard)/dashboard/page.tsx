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
import DashboardPage from '@/components/DashboardPage';
import { YearSelector } from '@/components/ui/YearSelector';
import { formatCurrency } from '@/lib/format';

export default function Dashboard() {
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(new Date().getFullYear());
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
        const salesTotalsPromise = getGlobalSalesTotals(
          selectedYear === 'all' ? undefined : (selectedYear as number),
        ).catch((err) => {
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
          earnings: `${formatCurrency(salesTotals?.totalSales || 0)}`,
          branchCount: (branchesRes?.data?.length || 0).toString(),
          warehouseCount: (warehousesRes?.data?.length || 0).toString(),
          employeeCount: (employeeRes?.data?.employees?.length || 0).toString(),
        });
      } catch (error) {
        console.error('Critical error in fetchStats:', error);
      }
    };
    fetchStats();
  }, [selectedYear]);

  return (
    <DashboardPage>
      <div className="flex flex-col space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-xl sm:text-2xl font-bold text-primary tracking-tight">
              Admin Dashboard
            </h3>
            <p className="text-sm text-muted-foreground font-medium">
              Enterprise-wide performance and branch management
            </p>
          </div>
          <YearSelector selectedYear={selectedYear} onYearChange={setSelectedYear} />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
          <StatCard title="Total Earnings" value={stats.earnings} subtitle="All branches" />
          <StatCard title="Branches" value={stats.branchCount} subtitle="Active branches" />
          <StatCard title="Warehouses" value={stats.warehouseCount} subtitle="Total warehouses" />
          <StatCard title="Employees" value={stats.employeeCount} subtitle="Total workforce" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-2">
            <h3 className="text-base sm:text-lg md:text-xl font-bold text-primary tracking-tight">
              Products
            </h3>
            <ProductsTable />
          </div>
          <div className="space-y-2">
            <h3 className="text-base sm:text-lg md:text-xl font-bold text-primary tracking-tight">
              Global Sales Overview
            </h3>
            <SalesChart selectedYear={selectedYear} />
          </div>
        </div>
      </div>

      <div className="flex flex-col space-y-2">
        <h3 className="text-base sm:text-lg md:text-xl font-bold text-primary tracking-tight">
          Human Resources
        </h3>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
          <div className="xl:col-span-2 space-y-2">
            <h4 className="text-sm sm:text-base font-bold text-primary/80 tracking-tight">
              Recent Employees
            </h4>
            <HrTable selectedYear={selectedYear} />
          </div>
          <div className="xl:col-span-1 space-y-2">
            <h4 className="text-sm sm:text-base font-bold text-primary/80 tracking-tight">
              Employee Distribution
            </h4>
            <EmployeePieChart selectedYear={selectedYear} />
          </div>
        </div>
      </div>

      <div className="flex flex-col space-y-2">
        <h3 className="text-base sm:text-lg md:text-xl font-bold text-primary tracking-tight">
          Warehouse
        </h3>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
          <div className="xl:col-span-2 space-y-2">
            <h4 className="text-sm sm:text-base font-bold text-primary/80 tracking-tight">
              All Warehouses
            </h4>
            <WarehouseTable selectedYear={selectedYear} />
          </div>
          <div className="xl:col-span-1 space-y-2">
            <h4 className="text-sm sm:text-base font-bold text-primary/80 tracking-tight">
              Product Distribution
            </h4>
            <CategoryPieChart selectedYear={selectedYear} />
          </div>
        </div>
      </div>
    </DashboardPage>
  );
}
