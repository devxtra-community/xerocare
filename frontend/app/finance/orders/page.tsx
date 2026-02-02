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
    <div className="bg-blue-50/50 min-h-full p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col space-y-6">
        <div>
          <h3 className="text-2xl font-bold text-slate-800 tracking-tight">Orders Management</h3>
          <p className="text-slate-500">Overview of all branch orders</p>
        </div>

        <EmployeeOrderStats invoices={invoices} />
        <EmployeeOrdersGraphs invoices={invoices} />

        <div className="space-y-4">
          <h3 className="text-xl font-bold text-slate-800 tracking-tight">All Orders</h3>
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-1">
            <EmployeeOrdersTable mode="FINANCE" invoices={invoices} />
          </div>
        </div>
      </div>
    </div>
  );
}
