import React from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import FinanceSidebar from '@/components/Finance/financeSidebar';

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <FinanceSidebar />

        <SidebarInset className="bg-background min-h-screen w-full flex flex-col">
          <DashboardHeader title="Finance Dashboard" />
          <div className="flex-1 overflow-auto">{children}</div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
