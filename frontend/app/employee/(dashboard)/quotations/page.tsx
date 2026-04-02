'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import EmployeeQuotationTable from '@/components/employeeComponents/EmployeeQuotationTable';

export default function EmployeeQuotationsPage() {
  return (
    <ProtectedRoute requiredModules={['sales', 'rent', 'lease']}>
      <div className="bg-blue-100 min-h-full p-3 sm:p-4 md:p-6 space-y-6 sm:space-y-8">
        <div className="flex flex-col space-y-1">
          <h3 className="text-xl sm:text-2xl font-bold text-primary tracking-tight">
            Quotation Management
          </h3>
          <p className="text-sm text-muted-foreground font-medium">
            Create and track quotations for your customers
          </p>
        </div>
        <EmployeeQuotationTable />
      </div>
    </ProtectedRoute>
  );
}
