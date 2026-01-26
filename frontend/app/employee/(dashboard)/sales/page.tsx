import React from 'react';
import EmployeeSalesStats from '@/components/employeeComponents/EmployeeSalesStats';
import EmployeeSalesGraphs from '@/components/employeeComponents/EmployeeSalesGraphs';
import EmployeeSalesTable from '@/components/employeeComponents/EmployeeSalesTable';

export default function EmployeeSalesPage() {
  return (
    <div className="bg-blue-100 min-h-full p-3 sm:p-4 md:p-6 space-y-6 sm:space-y-8">
      <div className="flex flex-col space-y-4 sm:space-y-6">
        <h3 className="text-xl sm:text-2xl font-bold text-primary">Sales Management</h3>
        <EmployeeSalesStats />
        <EmployeeSalesGraphs />

        <div className="space-y-3">
          <h3 className="text-lg sm:text-xl font-bold text-primary">All Sales</h3>
          <EmployeeSalesTable />
        </div>
      </div>
    </div>
  );
}
