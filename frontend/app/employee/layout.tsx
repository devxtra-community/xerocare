import React from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import RoleAwareSidebar from '@/components/RoleAwareSidebar';
import DashboardHeader from '@/components/DashboardHeader';
import { getServerUser } from '@/lib/server-auth';

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const user = await getServerUser();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <RoleAwareSidebar
          fallback="employee"
          initialIsManager={user?.role === 'MANAGER'}
          initialEmployeeJob={user?.employeeJob ?? null}
        />

        <SidebarInset className="bg-background min-h-screen w-full flex flex-col">
          <DashboardHeader />
          <div className="flex-1 overflow-auto">{children}</div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
