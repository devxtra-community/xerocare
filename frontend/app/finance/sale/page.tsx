'use client';

import React, { useEffect, useState } from 'react';
import EmployeeSalesTable from '@/components/employeeComponents/EmployeeSalesTable';
import EmployeeSalesStats from '@/components/employeeComponents/EmployeeSalesStats';
import EmployeeSalesGraphs from '@/components/employeeComponents/EmployeeSalesGraphs';
import { getBranchInvoices, Invoice } from '@/lib/invoice';

export default function SalePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const data = await getBranchInvoices();
        setInvoices(data);
      } catch (error) {
        console.error('Failed to fetch finance sales:', error);
      }
    };
    fetchInvoices();
  }, []);

  return (
    <div className="bg-blue-50/50 min-h-full p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col space-y-6">
        <div>
          <h3 className="text-2xl font-bold text-slate-800 tracking-tight">Sale Operations</h3>
          <p className="text-slate-500">Manage and approve sales orders</p>
        </div>

        <EmployeeSalesStats invoices={invoices} />
        <EmployeeSalesGraphs invoices={invoices} />

        <div className="space-y-4">
          <h3 className="text-xl font-bold text-slate-800 tracking-tight">All Sales</h3>
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-1">
            <EmployeeSalesTable mode="FINANCE" />
          </div>
        </div>
      </div>
    </div>
  );
}
