'use client';

import React from 'react';
import EmployeeStats from '@/components/ManagerDashboardComponents/employeeComponents/EmployeeStats';
import EmployeeTable from '@/components/ManagerDashboardComponents/employeeComponents/EmployeeTable';
import TeamDistributionChart from '@/components/ManagerDashboardComponents/employeeComponents/TeamDistributionChart';
import AttendanceTrendChart from '@/components/ManagerDashboardComponents/employeeComponents/AttendanceTrendChart';

export default function EmployeesPage() {
  return (
    <div className="bg-blue-100 min-h-screen p-3 sm:p-4 md:p-6 space-y-6 sm:space-y-8">
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold text-blue-900">Employee Management</h2>
          <p className="text-sm text-slate-500 font-medium">
            Monitor attendance, department distribution, and visa statuses
          </p>
        </div>
      </div>

      {/* STATS CARDS */}
      <EmployeeStats />

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <TeamDistributionChart />
        <AttendanceTrendChart />
      </div>

      {/* TABLE SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-blue-900 uppercase tracking-tight">
            Employee Directory
          </h3>
        </div>
        <EmployeeTable />
      </div>
    </div>
  );
}
