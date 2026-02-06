'use client';

import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Truck,
  Users,
  Wallet,
  Tags,
  Printer,
  Settings,
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
    href: '/manager/dashboard',
  },
  {
    title: 'Products',
    icon: Tags,
    href: '/manager/products',
  },
  {
    title: 'Models',
    icon: Printer,
    href: '/manager/models',
  },
  {
    title: 'Spare Parts',
    icon: Settings,
    href: '/manager/spare-parts',
  },
  {
    title: 'Sales',
    icon: ShoppingCart,
    href: '/manager/sales',
  },
  {
    title: 'Vendors',
    icon: Truck,
    href: '/manager/vendors',
  },
  {
    title: 'Employees',
    icon: Users,
    href: '/manager/employees',
  },
  {
    title: 'Orders',
    icon: Package,
    href: '/manager/orders',
  },
  {
    title: 'Purchases',
    icon: ShoppingCart, // Reusing ShoppingCart or a different icon if preferred, but user asked for sidebar update.
    href: '/manager/purchases',
  },

  {
    title: 'Finance',
    icon: Wallet,
    href: '/manager/finance',
  },
  {
    title: 'Inventory',
    icon: Boxes,
    href: '/manager/inventory',
  },
];

export default function ManagerSidebar() {
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
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-card/10">
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
                    className={`py-2.5 rounded-md
                      ${
                        pathname === item.href
                          ? 'bg-card text-sidebar'
                          : 'hover:bg-card/10 text-sidebar-accent-foreground'
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
                Logout
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
