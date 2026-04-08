'use client';
import {
  LayoutDashboard,
  ShoppingCart,
  Building2,
  Users,
  Package,
  Wallet,
  Truck,
  Boxes,
  FileText,
  ChevronDown,
  ChevronRight,
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
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import { useState, useEffect } from 'react';
import { logout } from '@/lib/auth';
import { toast } from 'sonner';
import { useRouter, usePathname } from 'next/navigation';

const menuItems = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    href: '/admin/dashboard',
  },
  {
    title: 'Sales',
    icon: ShoppingCart,
    href: '/admin/sales',
  },
  {
    title: 'Branch',
    icon: Building2,
    href: '/admin/branch',
    disabled: true,
  },
  {
    title: 'Human Resources',
    icon: Users,
    href: '/admin/human-resource',
  },
  {
    title: 'Warehouse',
    icon: Package,
    href: '/admin/warehouse',
  },
  {
    title: 'Finance',
    icon: Wallet,
    href: '/admin/finance',
  },
  {
    title: 'Purchases',
    icon: Wallet,
    subItems: [
      {
        title: 'Vendors',
        icon: Truck,
        href: '/admin/vendors',
      },
      {
        title: 'RFQs',
        icon: FileText,
        href: '/admin/rfqs',
      },
      {
        title: 'Lot Amounts',
        icon: Wallet,
        href: '/admin/purchases',
      },
    ],
  },
  {
    title: 'Inventory',
    icon: Boxes,
    href: '/admin/inventory',
  },
  {
    title: 'Lots',
    icon: Boxes,
    href: '/admin/lots',
  },
];

/**
 * Admin dashboard sidebar navigation component.
 * Displays menu items and handles logout functionality.
 */
export default function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<string[]>([]);

  // Auto-expand groups if child is active
  useEffect(() => {
    menuItems.forEach((item) => {
      if (item.subItems?.some((sub) => pathname === sub.href)) {
        if (!openGroups.includes(item.title)) {
          setOpenGroups((prev) => [...prev, item.title]);
        }
      }
    });
  }, [pathname, openGroups]);

  const toggleGroup = (title: string) => {
    setOpenGroups((prev: string[]) =>
      prev.includes(title) ? prev.filter((t: string) => t !== title) : [...prev, title],
    );
  };

  const handleLogOut = async () => {
    try {
      const res = await logout();
      if (!res?.data.success) {
        toast.error(res?.data.message);
      } else {
        if (res.data.isadmin) {
          router.push('/adminlogin');
        } else {
          router.push('/login');
        }
        toast.success(res.data.message);
      }
    } catch (err) {
      console.log(err);
    }
  };
  return (
    <Sidebar collapsible="icon" className="border-r-0 border-none !border-r-0">
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
              {menuItems.map((item) => {
                const hasSubItems = item.subItems && item.subItems.length > 0;
                const isOpen = openGroups.includes(item.title);

                return (
                  <SidebarMenuItem key={item.title}>
                    {hasSubItems ? (
                      <>
                        <SidebarMenuButton
                          onClick={() => toggleGroup(item.title)}
                          disabled={item.disabled}
                          className={`
                            py-2.5 rounded-md w-full justify-between
                            !text-sidebar-accent-foreground
                            [&_svg]:!text-sidebar-accent-foreground
                            ${
                              item.subItems?.some((sub) => pathname === sub.href)
                                ? 'bg-card/5 font-bold'
                                : 'hover:bg-card/10'
                            }
                          `}
                        >
                          <div className="flex items-center gap-3 px-3">
                            <item.icon className="h-4 w-4" />
                            <span className="font-medium">{item.title}</span>
                          </div>
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4 opacity-50" />
                          ) : (
                            <ChevronRight className="h-4 w-4 opacity-50" />
                          )}
                        </SidebarMenuButton>

                        {isOpen && (
                          <SidebarMenuSub className="mt-1 ml-4 border-l border-card/20 pl-2">
                            {item.subItems?.map((sub) => (
                              <SidebarMenuSubItem key={sub.title}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={pathname === sub.href}
                                  className={`
                                    rounded-md py-2
                                    ${
                                      pathname === sub.href
                                        ? 'bg-card text-sidebar'
                                        : 'hover:bg-card/10 text-sidebar-accent-foreground'
                                    }
                                  `}
                                >
                                  <a href={sub.href} className="flex items-center gap-3 px-3">
                                    <sub.icon className="h-3.5 w-3.5" />
                                    <span>{sub.title}</span>
                                  </a>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        )}
                      </>
                    ) : (
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.href}
                        disabled={item.disabled}
                        className={`
                          py-2.5 rounded-md
                          !text-sidebar-accent-foreground
                          [&_svg]:!text-sidebar-accent-foreground
                          ${
                            pathname === item.href
                              ? 'bg-card text-sidebar [&_svg]:text-sidebar'
                              : 'hover:bg-card/10'
                          }
                        `}
                      >
                        <a href={item.href} className="flex items-center gap-3 px-3">
                          <item.icon className="h-4 w-4" />
                          <span className="font-medium">{item.title}</span>
                        </a>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="bg-sidebar">
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
              <button className="flex items-center gap-3 px-3" onClick={handleLogOut}>
                Logout
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
