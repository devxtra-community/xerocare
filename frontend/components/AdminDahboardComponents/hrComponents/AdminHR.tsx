'use client';

import React from 'react';
import HRStatsCards from './HRStatsCards';
import HRCharts from './HRCharts';
import EmployeeTable from './EmployeeTable';
import { YearSelector } from '@/components/ui/YearSelector';

/**
 * Main HR Dashboard component.
 * Aggregates statistics cards, charts, and table for comprehensive employee management.
 * Provides a high-level view of HR metrics and access to detailed employee records.
 */
export default function AdminHR() {
  const [selectedYear, setSelectedYear] = React.useState<number | 'all'>(new Date().getFullYear());

  return (
    <div className="bg-blue-100 min-h-screen p-3 sm:p-4 md:p-6 space-y-8 sm:space-y-10">
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-xl sm:text-2xl font-bold text-primary tracking-tight">
              Human Resources
            </h3>
            <p className="text-sm text-muted-foreground font-medium">
              Enterprise-wide employee management and department statistics
            </p>
          </div>
          <YearSelector selectedYear={selectedYear} onYearChange={setSelectedYear} />
        </div>

        <HRStatsCards selectedYear={selectedYear} />

        <HRCharts selectedYear={selectedYear} />

        <div className="space-y-4">
          <h3 className="text-lg sm:text-xl font-bold text-primary">Employee Management</h3>
          <EmployeeTable />
        </div>
      </div>
    </div>
  );
}
