'use client';

import React, { useState, useEffect } from 'react';
import EmployeeStats from '@/components/ManagerDashboardComponents/employeeComponents/EmployeeStats';
import EmployeeTable from '@/components/ManagerDashboardComponents/employeeComponents/EmployeeTable';
import TeamDistributionChart from '@/components/ManagerDashboardComponents/employeeComponents/TeamDistributionChart';
import AttendanceTrendChart from '@/components/ManagerDashboardComponents/employeeComponents/AttendanceTrendChart';
import { getHRStats, HRStats } from '@/lib/employee';

export default function EmployeesPage() {
  const [stats, setStats] = useState<HRStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await getHRStats();
        if (res.success) {
          setStats(res.data);
        }
      } catch (error) {
        console.error('Failed to fetch HR stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  // Transform stats for components
  const displayStats = {
    total: stats?.total || 0,
    branchManager: stats?.byRole?.['MANAGER'] || 0,
    employeeManager: stats?.byJob?.['EMPLOYEE_MANAGER'] || 0,
    salesStaff: (stats?.byJob?.['SALES'] || 0) + (stats?.byJob?.['FINANCE_SALES'] || 0),
    rentLeaseStaff:
      (stats?.byJob?.['RENT'] || 0) +
      (stats?.byJob?.['LEASE'] || 0) +
      (stats?.byJob?.['RENT_LEASE'] || 0) +
      (stats?.byJob?.['FINANCE_RENT'] || 0) +
      (stats?.byJob?.['FINANCE_LEASE'] || 0) +
      (stats?.byJob?.['FINANCE_RENT_LEASE'] || 0),
    finance: stats?.byRole?.['FINANCE'] || 0,
    service:
      (stats?.byJob?.['TECHNICIAN'] || 0) +
      (stats?.byJob?.['DELIVERY'] || 0) +
      (stats?.byJob?.['READING_AGENT'] || 0),
  };

  const distributionData = [
    { name: 'Branch Manager', value: displayStats.branchManager, color: '#003F7D' },
    { name: 'Employee Manager', value: displayStats.employeeManager, color: '#0284C7' },
    { name: 'Sales Staff', value: displayStats.salesStaff, color: '#0891b2' },
    { name: 'Rent & Lease Staff', value: displayStats.rentLeaseStaff, color: '#7dd3fc' },
    { name: 'Finance', value: displayStats.finance, color: '#94a3b8' },
    { name: 'Service', value: displayStats.service, color: '#9BD0E5' },
    {
      name: 'Other',
      value: Math.max(
        0,
        stats
          ? stats.total -
              (displayStats.branchManager +
                displayStats.employeeManager +
                displayStats.salesStaff +
                displayStats.rentLeaseStaff +
                displayStats.finance +
                displayStats.service)
          : 0,
      ),
      color: '#CBD5E1',
    },
  ].filter((item) => item.value > 0 || item.name === 'Other');

  return (
    <div className="bg-blue-100 min-h-screen p-3 sm:p-4 md:p-6 space-y-6 sm:space-y-8">
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold text-primary">Employee Management</h2>
          <p className="text-sm text-muted-foreground font-medium">
            Monitor attendance, department distribution, and visa statuses
          </p>
        </div>
      </div>

      {/* STATS CARDS */}
      <EmployeeStats stats={displayStats} loading={loading} />

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <TeamDistributionChart data={distributionData} loading={loading} />
        <AttendanceTrendChart />
      </div>

      {/* TABLE SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-primary uppercase tracking-tight">
            Employee Directory
          </h3>
        </div>
        <EmployeeTable />
      </div>
    </div>
  );
}
