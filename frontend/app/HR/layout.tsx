import React from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import DashboardHeader from '@/components/DashboardHeader';

import HRSidebar from '@/components/hr/HRSidebar';

export default function HRLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <HRSidebar />

        <SidebarInset className="bg-background min-h-screen w-full flex flex-col">
          <DashboardHeader title="HR Dashboard" />
          <div className="flex-1 overflow-auto">{children}</div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
