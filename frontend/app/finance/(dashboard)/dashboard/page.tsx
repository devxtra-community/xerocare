'use client';

import React from 'react';
import { Wallet, ArrowUpRight } from 'lucide-react';

// Finance components (self-contained visuals)
import RevenueBreakdownChart from '@/components/Finance/RevenueBreakdownChart';
import DailyRevenueChart from '@/components/Finance/DailyRevenueChart';
import RevenueTable from '@/components/Finance/RevenueTable';
import { YearSelector } from '@/components/ui/YearSelector';

export default function FinanceDashboard() {
  const [selectedYear, setSelectedYear] = React.useState<number | 'all'>(new Date().getFullYear());
  return (
    <div className="bg-muted min-h-full p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-row items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-primary">Finance Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}{' '}
              • Performance Overview
            </p>
          </div>
          <YearSelector selectedYear={selectedYear} onYearChange={setSelectedYear} />
        </div>
      </header>

      {/* KPI STRIP */}
      <KPIStats selectedYear={selectedYear} />

      {/* PRIMARY ANALYTICS */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Monthly Revenue Breakdown */}
        <div className="rounded-2xl bg-card shadow-sm">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-base font-bold text-primary">Monthly Revenue</h3>
          </div>
          <div className="p-4">
            <RevenueBreakdownChart selectedYear={selectedYear} />
          </div>
        </div>

        {/* Daily Revenue Breakdown */}
        <div className="rounded-2xl bg-card shadow-sm">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-base font-bold text-primary">Daily Revenue</h3>
          </div>
          <div className="p-4">
            <DailyRevenueChart selectedYear={selectedYear} onYearChange={setSelectedYear} />
          </div>
        </div>
      </section>

      {/* REVENUE TABLE */}
      <section>
        <RevenueTable />
      </section>
    </div>
  );
}

import { getGlobalSalesTotals } from '@/lib/invoice';
import { Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/format';

function KPIStats({ selectedYear }: { selectedYear: number | 'all' }) {
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState({
    totalSales: 0,
    salesByType: [] as { saleType: string; total: number }[],
  });

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await getGlobalSalesTotals(
          selectedYear === 'all' ? undefined : selectedYear,
        );
        setData(result);
      } catch (error) {
        console.error('Failed to fetch finance stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedYear]);

  const getAmountByType = (type: string) => {
    const item = data.salesByType.find((s) => s.saleType === type);
    return item ? item.total : 0;
  };

  const stats = [
    {
      label: 'Total Income',
      value: formatCurrency(data.totalSales),
      icon: Wallet,
      color: 'text-blue-600',
    },
    {
      label: 'From Rent',
      value: formatCurrency(getAmountByType('RENT')),
      icon: ArrowUpRight,
      color: 'text-emerald-600',
    },
    {
      label: 'From Sale',
      value: formatCurrency(getAmountByType('SALE')),
      icon: ArrowUpRight,
      color: 'text-emerald-600',
    },
    {
      label: 'From Lease',
      value: formatCurrency(getAmountByType('LEASE')),
      icon: ArrowUpRight,
      color: 'text-emerald-600',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-2xl min-h-[70px] sm:h-[80px] bg-card shadow-sm p-3 flex items-center justify-center"
          >
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-2xl min-h-[70px] sm:h-[80px] bg-card shadow-sm p-3 flex flex-col justify-center items-center gap-1 text-center"
        >
          <p className="text-xs font-medium text-muted-foreground uppercase">{s.label}</p>
          <p className="text-xl sm:text-2xl font-bold text-primary">{s.value}</p>
        </div>
      ))}
    </div>
  );
}
