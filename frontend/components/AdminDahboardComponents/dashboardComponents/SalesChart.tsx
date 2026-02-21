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
import { StandardChartCard } from '@/components/charts/StandardChartCard';

interface SalesDataPoint {
  month: string;
  SALE: number;
  RENT: number;
  LEASE: number;
}

interface TooltipEntry {
  name: string;
  value: number;
  color: string;
  payload: SalesDataPoint;
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum: number, entry: TooltipEntry) => sum + (entry.value || 0), 0);
    return (
      <div className="bg-background border rounded-lg p-2 shadow-sm text-[10px] sm:text-xs">
        <p className="font-bold border-b pb-1 mb-1">{label}</p>
        {payload.map((entry: TooltipEntry, index: number) => (
          <div key={index} className="flex justify-between gap-4 py-0.5">
            <span style={{ color: entry.color }}>{entry.name}:</span>
            <span className="font-semibold">
              {((entry.value as number) || 0).toLocaleString()} AED
            </span>
          </div>
        ))}
        <div className="flex justify-between gap-4 py-0.5 border-t mt-1 pt-1 font-bold">
          <span>Total:</span>
          <span>{total.toLocaleString()} AED</span>
        </div>
      </div>
    );
  }
  return null;
};

/**
 * Area chart component displaying global sales trends over time.
 * Visualizes summaries for SALE, RENT, and LEASE categories.
 * Supports filtering by time period (1W, 1M, 3M, 1Y).
 */
export default function SalesChart() {
  const [selectedPeriod, setSelectedPeriod] = useState('1Y');
  const [isClient, setIsClient] = useState(false);
  const [data, setData] = useState<SalesDataPoint[]>([]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const fetchSalesData = async () => {
      try {
        const trendData = await getGlobalSalesOverview(selectedPeriod);

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
  }, [selectedPeriod]);

  const actions = (
    <div className="flex gap-1.5 text-[10px]">
      {['1W', '1M', '3M', '1Y'].map((period) => (
        <button
          key={period}
          onClick={() => setSelectedPeriod(period)}
          className={`px-2 py-0.5 rounded-md transition-colors ${
            selectedPeriod === period
              ? 'bg-primary text-white font-medium'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {period}
        </button>
      ))}
    </div>
  );

  return (
    <StandardChartCard
      title="Global Sales Overview"
      description={`Overview for ${new Date().getFullYear()}`}
      actions={actions}
      height={260}
      loading={!isClient || data.length === 0}
    >
      <div className="flex-1 w-full h-full">
        {isClient && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, left: 0, right: 5, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSale" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorRent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorLease" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
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
                tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)}
                tickMargin={6}
                tick={{ fill: '#6b7280', fontSize: 10 }}
              />

              <Tooltip content={<CustomTooltip />} />

              <Area
                type="monotone"
                dataKey="SALE"
                name="Sale"
                stroke="#1d4ed8"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorSale)"
                stackId="1"
              />
              <Area
                type="monotone"
                dataKey="RENT"
                name="Rent"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorRent)"
                stackId="1"
              />
              <Area
                type="monotone"
                dataKey="LEASE"
                name="Lease"
                stroke="#f59e0b"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorLease)"
                stackId="1"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </StandardChartCard>
  );
}
