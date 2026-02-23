'use client';

import React from 'react';

import { LucideIcon, LayoutDashboard, ShoppingCart, Key, Home, Tag } from 'lucide-react';

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

/**
 * Sidebar navigation component for the Finance dashboard.
 * Includes links to Accounts Receivable, Payable, Collections, and Performance analytics.
 * Displays dynamic badges for pending actions (Rent, Lease, Sale, Orders).
 */
export default function FinanceSidebar() {
  const router = useRouter();
  const pathname = usePathname();

  type FinanceMenuItem = {
    title: string;
    icon: LucideIcon;
    href: string;
    disabled?: boolean;
  };

  type FinanceMenuGroup = {
    group: string;
    items: FinanceMenuItem[];
  };

  const financeMenu: FinanceMenuGroup[] = [
    {
      group: 'Main',
      items: [
        {
          title: 'Dashboard',
          icon: LayoutDashboard,
          href: '/finance/dashboard',
        },
      ],
    },
    {
      group: 'Operations',
      items: [
        {
          title: 'Rent',
          icon: Key,
          href: '/finance/rent',
        },
        {
          title: 'Lease',
          icon: Home,
          href: '/finance/lease',
        },
        {
          title: 'Sale',
          icon: Tag,
          href: '/finance/sale',
        },
        {
          title: 'Orders',
          icon: ShoppingCart,
          href: '/finance/orders',
        },
      ],
    },
  ];

  /**
   * Helper to get badge count for a specific title from the counts object
   * 'Rent' -> counts.RENT
   * 'Lease' -> counts.LEASE
   * 'Sale' -> counts.SALE
   */
  const getBadgeCount = (title: string, counts: Record<string, number>) => {
    const key = title.toUpperCase();
    return counts[key] || 0;
  };

  const handleLogOut = async () => {
    try {
      const res = await logout();
      if (!res?.data.success) {
        toast.error(res?.data.message);
      } else {
        router.push(res.data.isadmin ? '/admin/login' : '/login');
        toast.success(res.data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // State to store pending counts
  const [counts, setCounts] = React.useState<Record<string, number>>({});

  React.useEffect(() => {
    const fetchCounts = async () => {
      try {
        const { getPendingCounts } = await import('@/lib/invoice');
        const data = await getPendingCounts();
        setCounts(data);
      } catch (err) {
        console.error('Failed to fetch sidebar counts', err);
      }
    };
    fetchCounts();
    // Poll every 30s? Or just once on mount. Assuming once on mount is enough for now.
    // Or maybe refresh when pathname changes?
  }, [pathname]); // Refresh counts on navigation too, ensuring updates after approvals

  return (
    <Sidebar collapsible="icon" className="border-none !border-r-0">
      <SidebarHeader className="bg-sidebar border-b border-white/10">
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
        {financeMenu.map((section) => (
          <SidebarGroup key={section.group}>
            <SidebarGroupContent>
              <p className="px-4 py-2 text-xs uppercase tracking-wide text-sidebar-accent-foreground/60">
                {section.group}
              </p>

              <SidebarMenu className="space-y-1 px-2">
                {section.items.map((item) => {
                  const isActive = pathname === item.href;
                  const count = getBadgeCount(item.title, counts);

                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        disabled={item.disabled}
                        className={`
                    py-2.5 rounded-md
                    ${
                      isActive
                        ? 'bg-card text-sidebar'
                        : 'hover:bg-card/10 text-sidebar-accent-foreground'
                    }
                    ${item.disabled ? 'opacity-60 cursor-not-allowed' : ''}
                  `}
                      >
                        <a
                          href={item.href}
                          className="flex items-center gap-3 px-3 relative w-full"
                        >
                          <item.icon className="h-4 w-4" />
                          <span className="font-medium flex-1">{item.title}</span>
                          {count > 0 && (
                            <span className="flex h-2 w-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse" />
                          )}
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="bg-sidebar border-t border-white/10">
        <SidebarMenu className="px-2">
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="py-3 hover:bg-red-500/20 hover:text-red-300">
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
