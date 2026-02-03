'use client';

import {
  LayoutDashboard,
  UsersRound,
  UserPlus,
  ClipboardList,
  TrendingUp,
  Key,
  ScrollText,
  LogOut,
  Calendar,
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

import { logout, getUserFromToken } from '@/lib/auth';
import { hasJobAccess, EmployeeJob } from '@/lib/employeeJob';
import { toast } from 'sonner';
import { useRouter, usePathname } from 'next/navigation';
import { useMemo, useState, useEffect } from 'react';

const menuItems = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    href: '/employee/dashboard',
    modules: ['*'], // Always accessible
  },
  {
    title: 'Leave',
    icon: Calendar,
    href: '/employee/leave',
    modules: ['*'], // Always accessible
  },
  {
    title: 'Customers',
    icon: UsersRound,
    href: '/employee/customers',
    modules: ['customers'],
  },
  {
    title: 'Leads',
    icon: UserPlus,
    href: '/employee/leads',
    modules: ['crm'],
  },
  {
    title: 'Orders',
    icon: ClipboardList,
    href: '/employee/orders',
    modules: ['sales', 'rent'],
  },
  {
    title: 'Sales',
    icon: TrendingUp,
    href: '/employee/sales',
    modules: ['sales'], // Only for SALES employees
  },
  {
    title: 'Rent',
    icon: Key,
    href: '/employee/rent',
    modules: ['rent', 'lease'],
  },
  {
    title: 'Lease',
    icon: ScrollText,
    href: '/employee/lease',
    modules: ['lease'],
  },
];

export default function EmployeeSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [employeeJob, setEmployeeJob] = useState<EmployeeJob | null | undefined>(null);

  // Get user from JWT token on client-side only
  useEffect(() => {
    const user = getUserFromToken();
    setEmployeeJob(user?.employeeJob);
  }, []);

  // Filter menu items based on employee job
  const allowedMenuItems = useMemo(() => {
    if (!employeeJob) {
      // If no job assigned, show only dashboard
      return menuItems.filter((item) => item.modules.includes('*'));
    }

    return menuItems.filter((item) => {
      // Always show items with '*' (like Dashboard)
      if (item.modules.includes('*')) return true;

      // Check if employee's job has access to any of the item's required modules
      return item.modules.some((module) => hasJobAccess(employeeJob as EmployeeJob, module));
    });
  }, [employeeJob]);

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
              {allowedMenuItems.map((item) => (
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
