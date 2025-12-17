import React from "react"
import {
  SidebarProvider,
  SidebarInset,
} from "@/components/ui/sidebar"
import AppSidebar from "@/components/AppSidebar"
import DashboardHeader from "@/components/DashboardHeader"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />

        <SidebarInset className="bg-muted min-h-screen w-full flex flex-col">
          <DashboardHeader />
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
