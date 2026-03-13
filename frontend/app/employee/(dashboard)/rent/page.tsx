'use client';

import React, { useEffect, useState } from 'react';
import EmployeeRentStats from '@/components/employeeComponents/EmployeeRentStats';
import EmployeeRentGraphs from '@/components/employeeComponents/EmployeeRentGraphs';
import EmployeeRentTable from '@/components/employeeComponents/EmployeeRentTable';
import { getMyInvoices, getBranchSalesTotals, Invoice } from '@/lib/invoice';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function EmployeeRentPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [rentTotalOverride, setRentTotalOverride] = useState<number | undefined>(undefined);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [myInvoices, salesTotals] = await Promise.all([
          getMyInvoices(),
          getBranchSalesTotals(), // Branch-wide SQL aggregation — same logic as finance dashboard
        ]);
        setInvoices(myInvoices);

        // Extract the RENT total from backend SQL aggregation.
        // This counts advance + usage_total for PROFORMA contracts and totalAmount
        // for standalone FINAL invoices — exactly matching the finance dashboard figure.
        const rentEntry = salesTotals.salesByType.find((s) => s.saleType === 'RENT');
        setRentTotalOverride(rentEntry ? rentEntry.total : 0);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };
    fetchData();
  }, [refreshTrigger]);

  return (
    <ProtectedRoute requiredModules={['rent']}>
      <div className="bg-blue-100 min-h-full p-3 sm:p-4 md:p-6 space-y-6 sm:space-y-8">
        <div className="flex flex-col space-y-4 sm:space-y-6">
          <h3 className="text-xl sm:text-2xl font-bold text-primary">Rent Management</h3>
          <EmployeeRentStats invoices={invoices} rentTotalOverride={rentTotalOverride} />
          <EmployeeRentGraphs invoices={invoices} />

          <div className="space-y-3">
            <h3 className="text-lg sm:text-xl font-bold text-primary">All Rentals</h3>
            <EmployeeRentTable onRefresh={() => setRefreshTrigger((prev) => prev + 1)} />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
