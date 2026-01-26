'use client';

import EmployeeOrderStats from '@/components/employeeComponents/EmployeeOrderStats';
import EmployeeOrdersTable from '@/components/employeeComponents/EmployeeOrdersTable';

export default function EmployeeOrdersPage() {
  return (
    <div className="bg-blue-100 min-h-full p-3 sm:p-4 md:p-6 space-y-6 sm:space-y-8">
      <div className="flex flex-col space-y-4 sm:space-y-6">
        <h3 className="text-xl sm:text-2xl font-bold text-primary">Orders Management</h3>
        <EmployeeOrderStats />

        <div className="space-y-3">
          <h3 className="text-lg sm:text-xl font-bold text-primary">All Orders</h3>
          <EmployeeOrdersTable />
        </div>
      </div>
    </div>
  );
}
