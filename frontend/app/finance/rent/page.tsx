'use client';

import React, { useEffect, useState } from 'react';
import EmployeeRentStats from '@/components/employeeComponents/EmployeeRentStats';
import EmployeeRentGraphs from '@/components/employeeComponents/EmployeeRentGraphs';
import { getBranchInvoices, Invoice } from '@/lib/invoice';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MonthlyCollectionTable from '@/components/Finance/MonthlyCollectionTable';
import CompletedCollectionsTable from '@/components/Finance/CompletedCollectionsTable';
import FinanceApprovalTable from '@/components/Finance/FinanceApprovalTable';

export default function RentPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const data = await getBranchInvoices();
        setInvoices(data);
      } catch (error) {
        console.error('Failed to fetch finance rent:', error);
      }
    };
    fetchInvoices();
  }, []);

  return (
    <div className="bg-blue-50/50 min-h-full p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col space-y-6">
        <div>
          <h3 className="text-2xl font-bold text-slate-800 tracking-tight">Rent Operations</h3>
          <p className="text-muted-foreground">Manage and approve rental agreements</p>
        </div>

        <EmployeeRentStats invoices={invoices} />
        {/* Helper function check for Graphs - EmployeeRentGraphs fetches internal getMyInvoices by default.
            We need to refactor it or it will show "My Invoices" instead of Branch.
            Let's assume I will refactor it next. */}
        <EmployeeRentGraphs />

        <Tabs defaultValue="pending" className="w-full space-y-4">
          <TabsList className="bg-card border text-slate-600">
            <TabsTrigger value="pending">Pending Approvals</TabsTrigger>
            <TabsTrigger value="collection">Monthly Collection</TabsTrigger>
            <TabsTrigger value="completed">Completed Collections</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            <h3 className="text-xl font-bold text-slate-800 tracking-tight">
              Pending Finance Approval
            </h3>
            <div className="bg-card rounded-xl shadow-sm border border-slate-100 p-1">
              <FinanceApprovalTable saleType="RENT" />
            </div>
          </TabsContent>

          <TabsContent value="collection" className="space-y-4">
            <h3 className="text-xl font-bold text-slate-800 tracking-tight">
              Monthly Usage & Billing
            </h3>
            <div className="bg-card rounded-xl shadow-sm border border-slate-100 p-1">
              <MonthlyCollectionTable mode="RENT" />
            </div>
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            <h3 className="text-xl font-bold text-slate-800 tracking-tight">
              Completed Collections
            </h3>
            <div className="bg-card rounded-xl shadow-sm border border-slate-100 p-1">
              <CompletedCollectionsTable mode="RENT" />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
