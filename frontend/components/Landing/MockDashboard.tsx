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
  Search,
  Bell,
  HelpCircle,
  ChevronDown,
  LogOut,
  Menu,
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const menuItems = [
  { title: 'Dashboard', icon: LayoutDashboard, active: true },
  { title: 'Sales', icon: ShoppingCart, active: false },
  { title: 'Branch', icon: Building2, active: false },
  { title: 'Human Resources', icon: Users, active: false },
  { title: 'Warehouse', icon: Package, active: false },
  { title: 'Finance', icon: Wallet, active: false },
  { title: 'Vendors', icon: Truck, active: false },
  { title: 'Inventory', icon: Boxes, active: false },
];

const salesData = [
  { month: 'Jan', sales: 4000 },
  { month: 'Feb', sales: 3000 },
  { month: 'Mar', sales: 5000 },
  { month: 'Apr', sales: 4500 },
  { month: 'May', sales: 6000 },
  { month: 'Jun', sales: 5500 },
  { month: 'Jul', sales: 7000 },
  { month: 'Aug', sales: 6500 },
  { month: 'Sep', sales: 8000 },
  { month: 'Oct', sales: 7500 },
];

const stats = {
  earnings: '124,500.00',
  totalSold: '1,240',
  bestSellingModel: 'Canon iR 2525',
  bestSellingProduct: 'A4 Paper Ream',
};

// --- Sub-components mimicking real counterparts ---

function MockSidebar() {
  return (
    <div className="hidden border-r bg-white dark:bg-gray-900 md:flex md:w-64 md:flex-col">
      <div className="flex items-center gap-3 px-6 py-4 border-b">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <LayoutDashboard className="h-5 w-5 text-primary" />
        </div>
        <span className="text-lg font-bold text-gray-900 dark:text-white">XeroCare</span>
      </div>
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {menuItems.map((item) => (
          <div
            key={item.title}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              item.active
                ? 'bg-primary text-white shadow-sm'
                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
            }`}
          >
            <item.icon className={`h-4 w-4 ${item.active ? 'text-white' : 'text-gray-500'}`} />
            {item.title}
          </div>
        ))}
      </div>
      <div className="p-4 border-t bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center gap-3 text-red-600">
          <LogOut className="h-4 w-4" />
          <span className="text-sm font-medium">Logout</span>
        </div>
      </div>
    </div>
  );
}

function MockHeader() {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-white px-6 shadow-sm dark:bg-gray-900 dark:border-gray-800">
      <div className="flex items-center gap-4">
        <Menu className="h-5 w-5 text-gray-500 md:hidden" />
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Dashboard</h1>
      </div>
      <div className="hidden md:flex max-w-md flex-1 px-4">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search..."
            className="pl-10 bg-gray-100 border-none focus-visible:ring-primary dark:bg-gray-800"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="text-gray-500">
          <Bell className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="hidden sm:flex text-gray-500">
          <HelpCircle className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3 pl-4 border-l">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
            A
          </div>
          <div className="hidden text-sm sm:block">
            <p className="font-medium text-gray-900 dark:text-white">Admin User</p>
            <p className="text-xs text-gray-500">admin@xerocare.com</p>
          </div>
          <ChevronDown className="hidden sm:block h-4 w-4 text-gray-300" />
        </div>
      </div>
    </header>
  );
}

function MockSalesChart() {
  return (
    <div className="rounded-2xl bg-card h-[260px] w-full shadow-sm flex flex-col p-3 border">
      <div className="flex flex-row items-center justify-between pb-2">
        <p className="text-xs text-gray-600">Monthly Sales (2025)</p>
        <div className="flex gap-1.5 text-[10px]">
          <span className="px-2 py-0.5 rounded-md bg-primary text-white font-medium">1M</span>
          <span className="px-2 py-0.5 text-gray-600">1Y</span>
        </div>
      </div>
      <div className="flex-1 w-full opacity-60">
        {' '}
        {/* Reduced opacity slightly for background feel */}
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={salesData} margin={{ top: 5, left: 0, right: 5, bottom: 0 }}>
            <defs>
              <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1d4ed8" stopOpacity={0.7} />
                <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.3} />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tickMargin={6}
              tick={{ fill: '#6b7280', fontSize: 10 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v / 1000}k`}
              tickMargin={6}
              tick={{ fill: '#6b7280', fontSize: 10 }}
            />
            <Area
              type="monotone"
              dataKey="sales"
              stroke="#1d4ed8"
              strokeWidth={2}
              fill="url(#salesGradient)"
              dot={false}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function MockStatCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <Card className="rounded-2xl shadow-sm border-0 !bg-card text-card-foreground ring-1 ring-inset ring-gray-200 dark:ring-gray-800">
      <CardContent className="flex flex-col items-center justify-center p-4 text-center">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {title}
        </CardTitle>
        <div className="mt-2 text-2xl font-bold text-primary">{value}</div>
        {subtitle && (
          <CardDescription className="text-[10px] text-muted-foreground mt-1">
            {subtitle}
          </CardDescription>
        )}
      </CardContent>
    </Card>
  );
}

// Placeholder for tabular data visualization
function MockTableSkeleton({ title, rows = 3 }: { title: string; rows?: number }) {
  return (
    <div className="rounded-2xl border bg-card p-4 h-full w-full flex flex-col gap-3">
      <h4 className="text-sm font-bold text-primary">{title}</h4>
      <div className="w-full space-y-2">
        {[...Array(rows)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 h-8 bg-gray-100 dark:bg-gray-800/50 rounded px-2 w-full animate-pulse opacity-50"
          >
            <div className="h-4 w-4 bg-gray-300 rounded-full dark:bg-gray-700" />
            <div className="h-3 w-3/4 bg-gray-300 rounded dark:bg-gray-700" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MockDashboard({ isBackground = false }: { isBackground?: boolean }) {
  if (isBackground) {
    return (
      <div className="relative flex h-[600px] w-full max-w-[1400px] mx-auto overflow-hidden rounded-t-xl border border-b-0 bg-gray-50 dark:bg-gray-900 dark:border-gray-800 pointer-events-none select-none">
        <MockSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <MockHeader />
          <main className="flex-1 p-4 bg-blue-50/50 dark:bg-gray-900/50 relative">
            <div className="space-y-6">
              <div className="flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-primary">Sales Overview</h3>
                </div>
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  <MockStatCard
                    title="Total Earnings"
                    value={stats.earnings}
                    subtitle="1 month indicator"
                  />
                  <MockStatCard
                    title="Products Sold"
                    value={stats.totalSold}
                    subtitle="1 month indicator"
                  />
                  <MockStatCard
                    title="Best Selling"
                    value={stats.bestSellingModel}
                    subtitle="Model"
                  />
                  <MockStatCard
                    title="Top Product"
                    value={stats.bestSellingProduct}
                    subtitle="Item"
                  />
                </div>
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 h-[300px]">
                  <div className="space-y-2 h-full">
                    <MockSalesChart />
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-[600px] w-full max-w-[1400px] mx-auto overflow-hidden rounded-t-xl border border-b-0 bg-gray-50 shadow-2xl dark:bg-gray-900 dark:border-gray-800">
      <MockSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <MockHeader />
        <main className="flex-1 p-4 bg-blue-50/50 dark:bg-gray-900/50 relative">
          {/* Real Content Layer */}
          <div className="space-y-6">
            <div className="flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-primary">Sales Overview</h3>
              </div>

              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <MockStatCard
                  title="Total Earnings"
                  value={stats.earnings}
                  subtitle="1 month indicator"
                />
                <MockStatCard
                  title="Products Sold"
                  value={stats.totalSold}
                  subtitle="1 month indicator"
                />
                <MockStatCard
                  title="Best Selling"
                  value={stats.bestSellingModel}
                  subtitle="Model"
                />
                <MockStatCard
                  title="Top Product"
                  value={stats.bestSellingProduct}
                  subtitle="Item"
                />
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 h-[300px]">
                <div className="space-y-2 h-full">
                  <MockSalesChart />
                </div>
                <div className="space-y-2 h-full">
                  <div className="rounded-2xl border bg-card/60 p-4 h-[260px] flex flex-col">
                    <h3 className="text-sm font-semibold text-primary mb-3">Top Products</h3>
                    <div className="space-y-3">
                      {[
                        'A4 Paper Ream',
                        'Canon Ink Cartridge',
                        'HP LaserJet Pro',
                        'Drum Unit (Generic)',
                      ].map((p, i) => (
                        <div
                          key={p}
                          className="flex justify-between items-center text-sm p-2 bg-white/50 dark:bg-black/20 rounded"
                        >
                          <span>{p}</span>
                          <span className="font-bold">{100 - i * 15} sold</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Extra Content to populate the blurred area */}
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-3 opacity-50">
                <div className="xl:col-span-2">
                  <MockTableSkeleton title="HR: Recent Employee Activity" rows={5} />
                </div>
                <div className="xl:col-span-1">
                  <MockTableSkeleton title="Warehouse Capacity" rows={4} />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
