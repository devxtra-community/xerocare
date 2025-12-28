"use client"
import {
  LayoutDashboard,
  Users,
  UserCog,
  CalendarCheck,
  CalendarOff,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { logout } from "@/lib/auth"
import { toast } from "sonner"
import { useRouter, usePathname } from "next/navigation"

const menuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/hr",
  },
  {
    title: "Employee Management",
    icon: Users,
    href: "/hr/employees",
  },
  {
    title: "Departments & Roles",
    icon: UserCog,
    href: "/hr/departments",
  },
  {
    title: "Attendance Management",
    icon: CalendarCheck,
    href: "/hr/attendance",
  },
  {
    title: "Leave Management",
    icon: CalendarOff,
    href: "/hr/leave",
  },
]

export default function HrAppSidebar() {
  const router = useRouter()
  const pathname = usePathname()

  const handleLogOut = async () => {
    try {
      const res = await logout();
      if(!res?.data.success){
        toast.error(res?.data.message)
      }
      else{
        if(res.data.isadmin){
          router.push('/admin/login');
        }
        else{
          router.push('/login');
        }
        toast.success(res.data.message)
      }
    }
    catch (err) {
      console.log(err)
    }
  }

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="bg-sidebar border-b border-white/10">
        <div className="flex items-center gap-3 px-4 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
            <LayoutDashboard className="h-5 w-5 text-sidebar-accent-foreground" />
          </div>
          <span className="text-base font-semibold text-sidebar-accent-foreground group-data-[collapsible=icon]:hidden">
            Xerocare HR
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-sidebar">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1 px-2">
              {menuItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={`
                        py-2.5 rounded-md
                        !text-sidebar-accent-foreground
                        [&_svg]:!text-sidebar-accent-foreground

                        ${
                          isActive
                            ? "bg-white text-sidebar [&_svg]:text-sidebar"
                            : "hover:bg-white/10"
                        }
                      `}
                    >
                      <a
                        href={item.href}
                        className="
                          flex items-center gap-3 px-3
                          text-sidebar-accent-foreground
                          [&_span]:text-sidebar-accent-foreground
                          [&_svg]:text-sidebar-accent-foreground
                        "
                      >
                        <item.icon className="h-4 w-4" />
                        <span className="font-medium">{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="bg-sidebar border-t border-white/10">
        <SidebarMenu className="px-2">
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="
                py-3
                text-sidebar-accent-foreground
                [&_svg]:text-sidebar-accent-foreground
                hover:bg-red-500/20
                hover:text-red-300
              "
            >
              <button className="flex items-center gap-3 px-3 w-full text-left" onClick={handleLogOut}>
                Logout
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
