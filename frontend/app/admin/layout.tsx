import React from "react"
import {
  SidebarProvider,
  SidebarInset,
} from "@/components/ui/sidebar"
import AppSidebar from "@/components/AppSidebar"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />

        <SidebarInset className="bg-muted min-h-screen w-full">
          {children}
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
