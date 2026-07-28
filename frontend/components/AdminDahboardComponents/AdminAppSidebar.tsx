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
  RotateCcw,
  ChevronDown,
  ChevronRight,
  BarChart2,
  BookOpen,
  DollarSign,
  CreditCard,
  ReceiptText,
  Scale,
  PieChart,
  TrendingUp,
  Globe,
  FileBarChart,
  ArrowRightLeft,
  Bell,
  Wrench,
  LineChart,
  Landmark,
  Layers,
  CalendarDays,
  BookText,
  FileCheck,
  ShieldCheck,
  Receipt,
  Banknote,
  BookMarked,
  Coins,
  SplitSquareHorizontal,
  Target,
  Tags,
  Cpu,
  Puzzle,
  UserCheck,
  CalendarCheck,
  ClipboardList,
  FileSignature,
  ShoppingBag,
  Handshake,
  KeyRound,
  ShieldAlert,
  Repeat,
  type LucideIcon,
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

interface MenuLink {
  title: string;
  icon: LucideIcon;
  href: string;
}

interface MenuItem {
  title: string;
  icon: LucideIcon;
  href?: string;
  disabled?: boolean;
  subItems?: MenuLink[];
}

// The admin is the organisation-wide superuser, so this sidebar is the union of
// every desk in the product — not an admin-only subset. Where an admin-native
// page exists it wins (`/admin/...`, all-branch data by default); the remaining
// entries deep-link into the manager, employee, HR and finance desks the same
// way the manager sidebar does.
//
// Those branch-scoped desks read and write through the acting branch held in
// lib/adminBranch (sent as the `X-Acting-Branch` header by lib/api.ts). No UI
// sets it at present, so an admin stays organisation-wide and those desks are
// effectively read-only, because no single branch owns a new record.
const menuItems: MenuItem[] = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    subItems: [
      {
        title: 'Organisation Overview',
        icon: LayoutDashboard,
        href: '/admin/dashboard',
      },
      {
        title: 'Branch Overview',
        icon: Building2,
        href: '/manager/dashboard',
      },
    ],
  },
  {
    title: 'Branches',
    icon: Building2,
    href: '/admin/branch',
  },
  {
    title: 'Catalog',
    icon: Tags,
    subItems: [
      {
        title: 'Products',
        icon: Package,
        href: '/manager/products',
      },
      {
        title: 'Models',
        icon: Cpu,
        href: '/manager/models',
      },
      {
        title: 'Brands',
        icon: Tags,
        href: '/manager/brands',
      },
      {
        title: 'Spare Parts',
        icon: Puzzle,
        href: '/manager/spare-parts',
      },
    ],
  },
  {
    title: 'Sales Desk',
    icon: ShoppingCart,
    subItems: [
      {
        title: 'Overview',
        icon: ShoppingCart,
        href: '/admin/sales',
      },
      {
        title: 'Direct Sale',
        icon: ShoppingBag,
        href: '/employee/sales',
      },
      {
        title: 'Quotations',
        icon: FileText,
        href: '/employee/quotations',
      },
      {
        title: 'Orders',
        icon: ClipboardList,
        href: '/employee/orders',
      },
      {
        title: 'Templates',
        icon: FileSignature,
        href: '/manager/sales/templates',
      },
      {
        title: 'Leads',
        icon: Handshake,
        href: '/employee/leads',
      },
      {
        title: 'Rent',
        icon: KeyRound,
        href: '/employee/rent',
      },
      {
        title: 'Lease',
        icon: Repeat,
        href: '/employee/lease',
      },
      {
        title: 'Returns',
        icon: RotateCcw,
        href: '/admin/sales/returns',
      },
    ],
  },
  {
    title: 'Customers',
    icon: Users,
    href: '/admin/customers',
  },
  {
    title: 'Targets',
    icon: Target,
    href: '/manager/targets',
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
      {
        title: 'Lots',
        icon: Boxes,
        href: '/admin/lots',
      },
    ],
  },
  {
    title: 'Inventory',
    icon: Boxes,
    subItems: [
      {
        title: 'Stock',
        icon: Boxes,
        href: '/admin/inventory',
      },
      {
        title: 'Stock Transfers',
        icon: ArrowRightLeft,
        href: '/admin/stock-transfers',
      },
    ],
  },
  {
    title: 'Service',
    icon: Wrench,
    subItems: [
      {
        title: 'Tickets',
        icon: FileText,
        href: '/admin/service',
      },
      {
        title: 'Contracts',
        icon: FileText,
        href: '/admin/service/contracts',
      },
    ],
  },
  {
    title: 'HR Desk',
    icon: Users,
    subItems: [
      {
        title: 'Human Resources',
        icon: Users,
        href: '/admin/human-resource',
      },
      {
        title: 'HR Overview',
        icon: BarChart2,
        href: '/hr/dashboard',
      },
      {
        title: 'Employee Directory',
        icon: UserCheck,
        href: '/hr/employees',
      },
      {
        title: 'Branch Employees',
        icon: Users,
        href: '/manager/employees',
      },
      {
        title: 'Attendance',
        icon: CalendarCheck,
        href: '/hr/attendance',
      },
      {
        title: 'Leave Approvals',
        icon: CalendarDays,
        href: '/hr/leave',
      },
      {
        title: 'Payroll',
        icon: Banknote,
        href: '/hr/payroll',
      },
    ],
  },
  {
    title: 'Finance Desk',
    icon: DollarSign,
    subItems: [
      {
        title: 'Finance Overview',
        icon: BarChart2,
        href: '/finance/dashboard',
      },
      {
        title: 'AR Invoices',
        icon: ReceiptText,
        href: '/finance/ar/invoices',
      },
      {
        title: 'AP Invoices',
        icon: CreditCard,
        href: '/finance/ap/invoices',
      },
      {
        title: 'Rent Collections',
        icon: KeyRound,
        href: '/finance/rent',
      },
      {
        title: 'Lease Collections',
        icon: Repeat,
        href: '/finance/lease',
      },
      {
        title: 'Sale Collections',
        icon: ShoppingBag,
        href: '/finance/sale',
      },
      {
        title: 'Orders',
        icon: ClipboardList,
        href: '/finance/orders',
      },
      {
        title: 'Quotation Approvals',
        icon: FileCheck,
        href: '/finance/quotations',
      },
      {
        title: 'Service Estimates',
        icon: Wrench,
        href: '/finance/service-estimates',
      },
      {
        title: 'Returns',
        icon: RotateCcw,
        href: '/finance/returns',
      },
      {
        title: 'Opening Balances',
        icon: BookText,
        href: '/manager/opening-balances',
      },
    ],
  },
  {
    title: 'My Expenses',
    icon: Receipt,
    href: '/employee/expenses',
  },
  {
    title: 'Notifications',
    icon: Bell,
    href: '/admin/notifications',
  },
];

const adminAccountsMenuItems: MenuLink[] = [
  { title: 'Overview', icon: BarChart2, href: '/admin/accounts' },
  { title: 'Cash & Bank', icon: BookOpen, href: '/admin/accounts/cash-bank' },
  { title: 'Day Book', icon: CalendarDays, href: '/admin/accounts/day-book' },
  { title: 'Cheques', icon: FileCheck, href: '/admin/accounts/cheques' },
  { title: 'Guarantee Cheques', icon: ShieldCheck, href: '/admin/accounts/guarantee-cheques' },
  { title: 'Expenses', icon: DollarSign, href: '/admin/accounts/expenses' },
  { title: 'Income', icon: Coins, href: '/admin/accounts/income' },
  { title: 'Receivables', icon: ReceiptText, href: '/admin/accounts/receivable' },
  { title: 'Payables', icon: CreditCard, href: '/admin/accounts/payable' },
  { title: 'Profit & Loss', icon: TrendingUp, href: '/admin/accounts/profit-loss' },
  { title: 'Income Statement', icon: LineChart, href: '/admin/accounts/income-statement' },
  { title: 'Segmented P&L', icon: SplitSquareHorizontal, href: '/admin/accounts/segmented-pnl' },
  { title: 'Balance Sheet', icon: BookMarked, href: '/admin/accounts/balance-sheet' },
  { title: 'Cash Flow', icon: Banknote, href: '/admin/accounts/cash-flow' },
  { title: 'General Ledger', icon: BookText, href: '/admin/accounts/general-ledger' },
  { title: 'Chart of Accounts', icon: Layers, href: '/admin/accounts/chart-of-accounts' },
  { title: 'Tax', icon: Receipt, href: '/admin/accounts/tax' },
  { title: 'Assets', icon: Landmark, href: '/admin/accounts/assets' },
  { title: 'Equity', icon: Scale, href: '/admin/accounts/equity' },
  { title: 'Depreciation', icon: PieChart, href: '/admin/accounts/depreciation' },
  { title: 'Exchange Rates', icon: ArrowRightLeft, href: '/admin/accounts/exchange-rates' },
  { title: 'Reports Hub', icon: FileBarChart, href: '/admin/accounts/reports' },
  { title: 'Data Integrity', icon: ShieldAlert, href: '/admin/accounts/data-integrity' },
];

export default function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const [accountsOpen, setAccountsOpen] = useState(pathname.startsWith('/admin/accounts'));

  // Auto-expand groups if child is active
  useEffect(() => {
    menuItems.forEach((item) => {
      if (item.subItems?.some((sub) => pathname === sub.href)) {
        setOpenGroups((prev) => {
          if (!prev.includes(item.title)) {
            return [...prev, item.title];
          }
          return prev;
        });
      }
    });
  }, [pathname]);

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
                            !text-white hover:bg-transparent
                            [&_svg]:!text-white
                            ${
                              item.subItems?.some((sub) => pathname === sub.href) ? 'font-bold' : ''
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
        {/* Accounts — Collapsible admin section */}
        <SidebarGroup>
          <SidebarGroupContent>
            <button
              onClick={() => setAccountsOpen((o) => !o)}
              className="flex w-full items-center justify-between px-4 py-2 text-xs uppercase tracking-wide text-sidebar-accent-foreground/60 hover:text-sidebar-accent-foreground transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Globe className="h-3 w-3" /> Accounts
              </span>
              {accountsOpen ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </button>
            {accountsOpen && (
              <SidebarMenu className="space-y-0.5 px-2">
                {adminAccountsMenuItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        className={`py-2 rounded-md text-[13px] ${isActive ? 'bg-card text-sidebar' : 'hover:bg-card/10 text-sidebar-accent-foreground/80'}`}
                      >
                        <a href={item.href} className="flex items-center gap-2.5 px-3 w-full">
                          <item.icon className="h-3.5 w-3.5 shrink-0" />
                          <span className="font-medium leading-tight">{item.title}</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            )}
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
