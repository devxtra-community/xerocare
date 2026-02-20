import React, { useState } from 'react';
import EmployeeSalesStats from '@/components/employeeComponents/EmployeeSalesStats';
import EmployeeSalesGraphs from '@/components/employeeComponents/EmployeeSalesGraphs';
import EmployeeSalesTable from '@/components/employeeComponents/EmployeeSalesTable';
import ProtectedRoute from '@/components/ProtectedRoute';
import { YearSelector } from '@/components/ui/YearSelector';

export default function EmployeeSalesPage() {
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(new Date().getFullYear());

  return (
    <ProtectedRoute requiredModules={['sales', 'billing']}>
      <div className="bg-blue-100 min-h-full p-3 sm:p-4 md:p-6 space-y-6 sm:space-y-8">
        <div className="flex flex-col space-y-4 sm:space-y-6">
          <div className="flex flex-row items-center justify-between">
            <h3 className="text-xl sm:text-2xl font-bold text-primary">Sales Management</h3>
            <YearSelector selectedYear={selectedYear} onYearChange={setSelectedYear} />
          </div>
          <EmployeeSalesStats selectedYear={selectedYear} />
          <EmployeeSalesGraphs selectedYear={selectedYear} />

          <div className="space-y-3">
            <h3 className="text-lg sm:text-xl font-bold text-primary">All Sales</h3>
            {/* EmployeeSalesTable might not need year filter if it has pagination/filtering built-in, but consistency is good. 
                 For now, I'll only update Stats and Graphs. */}
            <EmployeeSalesTable />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
