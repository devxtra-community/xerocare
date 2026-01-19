'use client';

import {
  LucideIcon,
  LayoutDashboard,
  BookOpen,
  FileText,
  CreditCard,
  Receipt,
  BarChart3,
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
    group: 'Overview',
    items: [
      {
        title: 'Dashboard',
        icon: LayoutDashboard,
        href: '/finance',
      },
    ],
  },
  {
    group: 'General Ledger',
    items: [
      {
        title: 'Chart of Accounts',
        icon: BookOpen,
        href: '/finance/generalLedger/chart-of-accounts',
        // disabled: true, // account-specific pages only
      },
      {
        title: 'Journal Entries',
        icon: FileText,
        href: '/finance/generalLedger/journals',
        // disabled: true, // account-specific pages only
      },
      // {
      //   title: "Ledger",
      //   icon: BookOpen,
      //   href: "/finance/generalLedger/ledger",
      //   disabled: true, // account-specific pages only
      // },
      {
        title: 'Trial Balance',
        icon: BarChart3,
        href: '/finance/generalLedger/trial-balance',
        // disabled: true, // account-specific pages only
      },
    ],
  },
  {
    group: 'Sub Ledgers',
    items: [
      {
        title: 'Accounts Receivable',
        icon: Receipt,
        href: '/finance/ar/invoices',
      },
      {
        title: 'Accounts Payable',
        icon: CreditCard,
        href: '/finance/ap/invoices',
      },
    ],
  },
  // {
  //   group: "Reports",
  //   items: [
  //     {
  //       title: "Profit & Loss",
  //       icon: BarChart3,
  //       href: "/finance/reports/profit-loss",
  //       disabled: true,
  //     },
  //   ],
  // },
];

export default function FinanceSidebar() {
  const router = useRouter();
  const pathname = usePathname();

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

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="bg-sidebar border-b border-white/10">
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
        {financeMenu.map((section) => (
          <SidebarGroup key={section.group}>
            <SidebarGroupContent>
              <p className="px-4 py-2 text-xs uppercase tracking-wide text-sidebar-accent-foreground/60">
                {section.group}
              </p>

              <SidebarMenu className="space-y-1 px-2">
                {section.items.map((item) => {
                  const isActive = pathname === item.href;

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
                        ? 'bg-white text-sidebar'
                        : 'hover:bg-white/10 text-sidebar-accent-foreground'
                    }
                    ${item.disabled ? 'opacity-60 cursor-not-allowed' : ''}
                  `}
                      >
                        <a href={item.href} className="flex items-center gap-3 px-3">
                          <item.icon className="h-4 w-4" />
                          <span className="font-medium">{item.title}</span>
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
