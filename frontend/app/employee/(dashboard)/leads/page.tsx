import React from 'react';
import EmployeeLeadsStats from '@/components/employeeComponents/EmployeeLeadsStats';
import EmployeeLeadsGraphs from '@/components/employeeComponents/EmployeeLeadsGraphs';
import EmployeeLeadsTable from '@/components/employeeComponents/EmployeeLeadsTable';

export default function LeadsPage() {
  return (
    <div className="bg-blue-100 min-h-full p-3 sm:p-4 md:p-6 space-y-6 sm:space-y-8">
      <div className="flex flex-col space-y-4 sm:space-y-6">
        <h3 className="text-xl sm:text-2xl font-bold text-primary">Leads Management</h3>
        <EmployeeLeadsStats />

        <div className="space-y-3">
          <h3 className="text-lg sm:text-xl font-bold text-primary">Leads Source Trends</h3>
          <EmployeeLeadsGraphs />
        </div>

        <div className="space-y-3">
          <h3 className="text-lg sm:text-xl font-bold text-primary">Leads List</h3>
          <EmployeeLeadsTable />
        </div>
      </div>
    </div>
  );
}
