import React from 'react';
import EmployeeCustomerStats from '@/components/employeeComponents/EmployeeCustomerStats';
import EmployeeCustomerGraphs from '@/components/employeeComponents/EmployeeCustomerGraphs';
import EmployeeCustomerTable from '@/components/employeeComponents/EmployeeCustomerTable';

export default function EmployeeCustomersPage() {
  return (
    <div className="bg-blue-50/50 min-h-full p-3 sm:p-4 md:p-6 space-y-6 sm:space-y-8">
      <div className="flex flex-col space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl sm:text-2xl font-bold text-primary">Customer Management</h3>
        </div>

        <EmployeeCustomerStats />

        <EmployeeCustomerGraphs />

        <div className="space-y-3">
          <EmployeeCustomerTable />
        </div>
      </div>
    </div>
  );
}
