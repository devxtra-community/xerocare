'use client';

import React from 'react';
import HRStatsCards from './HRStatsCards';
import HRCharts from './HRCharts';
import EmployeeTable from './EmployeeTable';

export default function AdminHR() {
  return (
    <div className="bg-blue-100 min-h-screen p-3 sm:p-4 md:p-6 space-y-8 sm:space-y-10">
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-1">
          <h3 className="text-xl sm:text-2xl font-bold text-blue-900">Human Resources</h3>
          <p className="text-sm text-gray-500">Manage your employees, departments, and recruitment.</p>
        </div>

        <HRStatsCards />
        
        <HRCharts />

        <div className="space-y-4">
          <h3 className="text-lg sm:text-xl font-bold text-blue-900">Employee Management</h3>
          <EmployeeTable />
        </div>
      </div>
    </div>
  );
}
