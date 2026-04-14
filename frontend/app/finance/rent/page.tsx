'use client';

import React, { useEffect, useState } from 'react';
import EmployeeRentStats from '@/components/employeeComponents/EmployeeRentStats';
import EmployeeRentGraphs from '@/components/employeeComponents/EmployeeRentGraphs';
import { getBranchInvoices, getGlobalSalesTotals, Invoice } from '@/lib/invoice';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MonthlyCollectionTable from '@/components/Finance/MonthlyCollectionTable';
import CompletedCollectionsTable from '@/components/Finance/CompletedCollectionsTable';
import FinanceApprovalTable from '@/components/Finance/FinanceApprovalTable';
import FinanceQuotationTable from '@/components/Finance/FinanceQuotationTable';

export default function RentPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [rentTotalOverride, setRentTotalOverride] = useState<number | undefined>(undefined);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [invoiceData, salesTotals] = await Promise.all([
          getBranchInvoices(),
          getGlobalSalesTotals(),
        ]);
        setInvoices(invoiceData);

        // Use the backend-aggregated RENT total (same as finance dashboard 35.8k)
        const rentEntry = salesTotals.salesByType.find((s) => s.saleType === 'RENT');
        setRentTotalOverride(rentEntry ? rentEntry.total : 0);
      } catch (error) {
        console.error('Failed to fetch finance rent:', error);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="bg-blue-50/50 min-h-full p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col space-y-6">
        <div>
          <h3 className="text-2xl font-bold text-slate-800 tracking-tight">Rent Operations</h3>
          <p className="text-muted-foreground">Manage and approve rental agreements</p>
        </div>

        <EmployeeRentStats invoices={invoices} rentTotalOverride={rentTotalOverride} />
        <EmployeeRentGraphs invoices={invoices} />

        <Tabs defaultValue="pending" className="w-full space-y-4">
          <TabsList className="bg-card border text-slate-600">
            <TabsTrigger value="pending">Pending Approvals</TabsTrigger>
            <TabsTrigger value="quotations">All Quotations</TabsTrigger>
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

          <TabsContent value="quotations" className="space-y-4">
            <h3 className="text-xl font-bold text-slate-800 tracking-tight">All Rent Contracts</h3>
            <div className="bg-card rounded-xl shadow-sm border border-slate-100 p-1">
              <FinanceQuotationTable saleType="RENT" />
            </div>
          </TabsContent>

          <TabsContent value="collection" className="space-y-4">
            <h3 className="text-xl font-bold text-slate-800 tracking-tight">
              Monthly Usage &amp; Billing
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
