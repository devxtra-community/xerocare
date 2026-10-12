'use client';

import React, { useEffect, useState } from 'react';
import EmployeeOrdersTable from '@/components/employeeComponents/EmployeeOrdersTable';
import EmployeeOrderStats from '@/components/employeeComponents/EmployeeOrderStats';
import EmployeeOrdersGraphs from '@/components/employeeComponents/EmployeeOrdersGraphs';
import { getBranchInvoices, Invoice } from '@/lib/invoice';

export default function FinanceOrdersPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const data = await getBranchInvoices();
        setInvoices(data);
      } catch (error) {
        console.error('Failed to fetch finance orders:', error);
      }
    };
    fetchInvoices();
  }, []);

  return (
    <div className="bg-card min-h-full p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col space-y-6">
        <div>
          <h3 className="text-xl sm:text-2xl font-medium text-foreground tracking-tight">
            Orders Management
          </h3>
          <p className="text-muted-foreground">Overview of all branch orders</p>
        </div>

        <EmployeeOrderStats invoices={invoices} />
        <EmployeeOrdersGraphs invoices={invoices} />

        <div className="space-y-4">
          <h3 className="text-xl font-medium text-foreground tracking-tight">All Orders</h3>
          <div className="bg-card rounded-xl shadow-sm border border-border p-1">
            <EmployeeOrdersTable mode="FINANCE" invoices={invoices} />
          </div>
        </div>
      </div>
    </div>
  );
}
