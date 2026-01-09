'use client';

import {
  LayoutDashboard,
  UsersRound,
  UserPlus,
  ClipboardList,
  TrendingUp,
  LogOut,
} from 'lucide-react';

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
} from '@/components/ui/sidebar';

import { logout } from '@/lib/auth';
import { toast } from 'sonner';
import { useRouter, usePathname } from 'next/navigation';

const menuItems = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    href: '/employee/dashboard',
  },
  {
    title: 'Customers',
    icon: UsersRound,
    href: '/employee/customers',
  },
  {
    title: 'Leads',
    icon: UserPlus,
    href: '/employee/leads',
  },
  {
    title: 'Orders',
    icon: ClipboardList,
    href: '/employee/orders',
  },
  {
    title: 'Sales',
    icon: TrendingUp,
    href: '/employee/sales',
  },
];

export default function EmployeeSidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      const res = await logout();

      if (!res?.data?.success) {
        toast.error(res?.data?.message);
        return;
      }

      router.push('/login');
      toast.success(res.data.message);
    } catch (error) {
      console.error(error);
      toast.error('Logout failed');
    }
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="bg-sidebar">
        <div className="flex items-center gap-3 px-4 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
            <LayoutDashboard className="h-5 w-5 text-sidebar-accent-foreground" />
          </div>
          <span className="text-base font-semibold text-sidebar-accent-foreground group-data-[collapsible=icon]:hidden">
            Xerocare
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-sidebar">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1 px-2">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    className={`py-2.5 rounded-md ${
                      pathname === item.href
                        ? 'bg-white text-sidebar'
                        : 'hover:bg-white/10 text-sidebar-accent-foreground'
                    }`}
                  >
                    <a href={item.href} className="flex items-center gap-3 px-3">
                      <item.icon className="h-4 w-4" />
                      <span className="font-medium">{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="bg-sidebar">
        <SidebarMenu className="px-2">
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="py-3 hover:bg-red-500/20 hover:text-red-300">
              <button className="flex items-center gap-3 px-3" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
