import React from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import FinanceSidebar from '@/components/Finance/FinanceSidebar';
import DashboardHeader from '@/components/DashboardHeader';

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <FinanceSidebar />

        <SidebarInset className="bg-muted min-h-screen w-full flex flex-col">
          <DashboardHeader />
          <div className="flex-1 overflow-auto">{children}</div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
