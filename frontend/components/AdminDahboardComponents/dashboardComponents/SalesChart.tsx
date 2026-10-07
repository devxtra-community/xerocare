'use client';
import { useState, useEffect } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { getGlobalSalesOverview } from '@/lib/invoice';
import { ChartTooltipContent } from '@/components/ui/ChartTooltip';
import { formatCompactNumber } from '@/lib/format';

import { getActiveCurrency } from '@/lib/currency';
interface SalesDataPoint {
  month: string;
  SALE: number;
  RENT: number;
  LEASE: number;
}

interface SalesChartProps {
  selectedYear?: number | 'all';
  /** Narrows the trend to one branch; omitted means organisation-wide. */
  branchId?: string;
  /** Currency code for the axis/tooltip labels. */
  currency?: string;
}

export default function SalesChart({
  selectedYear = new Date().getFullYear(),
  branchId,
  currency,
}: SalesChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('1Y');

  const [isClient, setIsClient] = useState(false);
  const [data, setData] = useState<SalesDataPoint[]>([]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const fetchSalesData = async () => {
      try {
        const trendData = await getGlobalSalesOverview(
          selectedPeriod,
          selectedYear === 'all' ? undefined : selectedYear,
          branchId,
        );

        // Group by month
        const monthlyMap: Record<string, SalesDataPoint> = {
          Jan: { month: 'Jan', SALE: 0, RENT: 0, LEASE: 0 },
          Feb: { month: 'Feb', SALE: 0, RENT: 0, LEASE: 0 },
          Mar: { month: 'Mar', SALE: 0, RENT: 0, LEASE: 0 },
          Apr: { month: 'Apr', SALE: 0, RENT: 0, LEASE: 0 },
          May: { month: 'May', SALE: 0, RENT: 0, LEASE: 0 },
          Jun: { month: 'Jun', SALE: 0, RENT: 0, LEASE: 0 },
          Jul: { month: 'Jul', SALE: 0, RENT: 0, LEASE: 0 },
          Aug: { month: 'Aug', SALE: 0, RENT: 0, LEASE: 0 },
          Sep: { month: 'Sep', SALE: 0, RENT: 0, LEASE: 0 },
          Oct: { month: 'Oct', SALE: 0, RENT: 0, LEASE: 0 },
          Nov: { month: 'Nov', SALE: 0, RENT: 0, LEASE: 0 },
          Dec: { month: 'Dec', SALE: 0, RENT: 0, LEASE: 0 },
        };

        const monthNames = [
          'Jan',
          'Feb',
          'Mar',
          'Apr',
          'May',
          'Jun',
          'Jul',
          'Aug',
          'Sep',
          'Oct',
          'Nov',
          'Dec',
        ];

        trendData.forEach((item) => {
          const date = new Date(item.date);
          const monthName = monthNames[date.getMonth()];
          if (monthlyMap[monthName]) {
            const type = item.saleType as 'SALE' | 'RENT' | 'LEASE';
            monthlyMap[monthName][type] = (monthlyMap[monthName][type] || 0) + item.totalSales;
          }
        });

        setData(Object.values(monthlyMap));
      } catch (error) {
        console.error('Failed to fetch sales chart data', error);
      }
    };
    fetchSalesData();
  }, [selectedPeriod, selectedYear, branchId]);

  return (
    <div className="rounded-2xl bg-card h-[340px] w-full shadow-sm flex flex-col p-3 border border-border">
      <div className="flex flex-row items-center justify-between pb-2">
        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          Revenue Trend ({selectedYear === 'all' ? 'All Years' : selectedYear})
        </h4>

        <div className="flex items-center gap-3">
          <div className="flex gap-1.5 text-[10px]">
            {['1W', '1M', '3M', '1Y'].map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-2 py-0.5 rounded-md transition-colors ${
                  selectedPeriod === period
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'text-foreground hover:bg-muted'
                }`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 w-full">
        {isClient && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, left: 0, right: 5, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSale" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-blue-dark)" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="var(--chart-blue-dark)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorRent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-blue-soft)" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="var(--chart-blue-soft)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorLease" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-blue-lighter)" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="var(--chart-blue-lighter)" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.3} />

              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tickMargin={6}
                tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
              />

              <YAxis
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatCompactNumber(v)}
                tickMargin={6}
                tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
              />

              <Tooltip
                content={
                  <ChartTooltipContent
                    showTotal
                    labelFormatter={(label) =>
                      `${label} ${selectedYear === 'all' ? '' : selectedYear}`
                    }
                    valueFormatter={(v) =>
                      `${currency ?? getActiveCurrency()} ${formatCompactNumber(Number(v))}`
                    }
                  />
                }
              />

              <Area
                type="monotone"
                dataKey="SALE"
                name="Sale"
                stroke="var(--chart-blue-dark)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorSale)"
                stackId="1"
              />
              <Area
                type="monotone"
                dataKey="RENT"
                name="Rent"
                stroke="var(--chart-blue-soft)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorRent)"
                stackId="1"
              />
              <Area
                type="monotone"
                dataKey="LEASE"
                name="Lease"
                stroke="var(--chart-blue-lighter)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorLease)"
                stackId="1"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
