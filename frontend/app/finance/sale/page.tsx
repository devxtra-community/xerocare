'use client';

import React, { useEffect, useState } from 'react';
import EmployeeSalesStats from '@/components/employeeComponents/EmployeeSalesStats';
import EmployeeSalesGraphs from '@/components/employeeComponents/EmployeeSalesGraphs';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FinanceApprovalTable from '@/components/Finance/FinanceApprovalTable';
import FinanceQuotationTable from '@/components/Finance/FinanceQuotationTable';
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
          <p className="text-muted-foreground">Manage and approve sales orders</p>
        </div>

        <EmployeeSalesStats invoices={invoices} />
        <EmployeeSalesGraphs invoices={invoices} />

        <Tabs defaultValue="pending" className="w-full space-y-4">
          <TabsList className="bg-card border text-slate-600">
            <TabsTrigger value="pending">Pending Approvals</TabsTrigger>
            <TabsTrigger value="history">Sale History</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            <h3 className="text-xl font-bold text-slate-800 tracking-tight">
              Pending Finance Approval
            </h3>
            <div className="bg-card rounded-xl shadow-sm border border-slate-100 p-1">
              <FinanceApprovalTable saleType="SALE" />
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <h3 className="text-xl font-bold text-slate-800 tracking-tight">Processed Sales</h3>
            <div className="bg-card rounded-xl shadow-sm border border-slate-100 p-1">
              <FinanceQuotationTable saleType="SALE" hideActions={true} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
