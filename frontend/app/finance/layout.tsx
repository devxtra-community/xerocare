import React from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import FinanceSidebar from '@/components/Finance/financeSidebar';
import ChequeNotificationBell from '@/components/accounts/ChequeNotificationBell';
import AuthGuard from '@/components/auth-guard';

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard loginUrl="/login">
      <SidebarProvider>
        <div className="flex min-h-screen w-full" suppressHydrationWarning>
          <FinanceSidebar />

          <SidebarInset
            className="bg-background min-h-screen w-full flex flex-col"
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
            <div className="flex-1 overflow-auto" suppressHydrationWarning>
              {children}
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </AuthGuard>
  );
}
