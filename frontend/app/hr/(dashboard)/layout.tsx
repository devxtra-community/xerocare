import React from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import RoleAwareSidebar from '@/components/RoleAwareSidebar';
import DashboardHeader from '@/components/DashboardHeader';

export default function HRLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <RoleAwareSidebar fallback="hr" />

        <SidebarInset className="bg-background min-h-screen w-full flex flex-col">
          <DashboardHeader />
          <div className="flex-1 overflow-auto">{children}</div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
