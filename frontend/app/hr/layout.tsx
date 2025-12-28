import React from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import HrAppSidebar from "@/components/HrAppSidebar";
import DashboardHeader from "@/components/DashboardHeader";

export default function HrLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <HrAppSidebar />

        <SidebarInset className="bg-muted min-h-screen w-full flex flex-col">
          <DashboardHeader />
          <div className="flex-1 overflow-auto">{children}</div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
