import React from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import RoleAwareSidebar from '@/components/RoleAwareSidebar';
import ChequeNotificationBell from '@/components/accounts/ChequeNotificationBell';
import AuthGuard from '@/components/auth-guard';
import { getServerUser } from '@/lib/server-auth';

export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  const user = await getServerUser();

  return (
    <AuthGuard loginUrl="/login">
      <SidebarProvider>
        <div className="flex h-dvh w-full overflow-hidden" suppressHydrationWarning>
          <RoleAwareSidebar fallback="finance" initialRole={user?.role ?? null} />

          <SidebarInset
            className="bg-background min-h-0 w-full flex flex-1 flex-col overflow-hidden"
            suppressHydrationWarning
          >
            <div className="relative" suppressHydrationWarning>
              <DashboardHeader title="Finance Dashboard" />
              <div
                className="absolute top-0 right-14 h-full flex items-center pr-2"
                suppressHydrationWarning
              >
                <ChequeNotificationBell />
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto" suppressHydrationWarning>
              {children}
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </AuthGuard>
  );
}
