'use client';

import React, { useEffect, useState } from 'react';
import EmployeeLeaseStats from '@/components/employeeComponents/EmployeeLeaseStats';
import EmployeeLeaseTable from '@/components/employeeComponents/EmployeeLeaseTable';
import { getMyInvoices, Invoice } from '@/lib/invoice';

export default function EmployeeLeasePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const data = await getMyInvoices();
        setInvoices(data);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };
    fetchInvoices();
  }, []);

  return (
    <div className="bg-blue-100 min-h-full p-3 sm:p-4 md:p-6 space-y-6 sm:space-y-8">
      <div className="flex flex-col space-y-4 sm:space-y-6">
        <h3 className="text-xl sm:text-2xl font-bold text-primary">Lease Management</h3>
        <EmployeeLeaseStats invoices={invoices} />

        <div className="space-y-3">
          <h3 className="text-lg sm:text-xl font-bold text-primary">All Leases</h3>
          <EmployeeLeaseTable />
        </div>
      </div>
    </div>
  );
}
