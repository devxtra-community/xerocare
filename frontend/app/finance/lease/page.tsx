'use client';

import React, { useEffect, useState } from 'react';
import EmployeeLeaseTable from '@/components/employeeComponents/EmployeeLeaseTable';
import EmployeeLeaseStats from '@/components/employeeComponents/EmployeeLeaseStats';
import EmployeeLeaseGraphs from '@/components/employeeComponents/EmployeeLeaseGraphs';
import { getBranchInvoices, Invoice } from '@/lib/invoice';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MonthlyCollectionTable from '@/components/Finance/MonthlyCollectionTable';

export default function LeasePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const data = await getBranchInvoices();
        setInvoices(data);
      } catch (error) {
        console.error('Failed to fetch finance lease:', error);
      }
    };
    fetchInvoices();
  }, []);

  return (
    <div className="bg-blue-50/50 min-h-full p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col space-y-6">
        <div>
          <h3 className="text-2xl font-bold text-slate-800 tracking-tight">Lease Operations</h3>
          <p className="text-muted-foreground">Manage and approve lease contracts</p>
        </div>

        <EmployeeLeaseStats invoices={invoices} />
        <EmployeeLeaseGraphs invoices={invoices} />

        <Tabs defaultValue="operations" className="w-full space-y-4">
          <TabsList className="bg-card border text-slate-600">
            <TabsTrigger value="operations">Operations</TabsTrigger>
            <TabsTrigger value="collection">Monthly Collection</TabsTrigger>
          </TabsList>

          <TabsContent value="operations" className="space-y-4">
            <h3 className="text-xl font-bold text-slate-800 tracking-tight">All Leases</h3>
            <div className="bg-card rounded-xl shadow-sm border border-slate-100 p-1">
              <EmployeeLeaseTable mode="FINANCE" />
            </div>
          </TabsContent>

          <TabsContent value="collection" className="space-y-4">
            <h3 className="text-xl font-bold text-slate-800 tracking-tight">
              Monthly Usage & Billing
            </h3>
            <div className="bg-card rounded-xl shadow-sm border border-slate-100 p-1">
              <MonthlyCollectionTable mode="LEASE" />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
