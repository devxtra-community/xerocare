import React from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import RoleAwareSidebar from '@/components/RoleAwareSidebar';
import DashboardHeader from '@/components/DashboardHeader';
import { getServerUser } from '@/lib/server-auth';

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const user = await getServerUser();

  return (
    <SidebarProvider>
      <div className="flex h-dvh w-full overflow-hidden">
        <RoleAwareSidebar
          fallback="employee"
          initialRole={user?.role ?? null}
          initialEmployeeJob={user?.employeeJob ?? null}
        />

        <SidebarInset className="bg-background min-h-0 w-full flex flex-1 flex-col overflow-hidden">
          <DashboardHeader />
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
