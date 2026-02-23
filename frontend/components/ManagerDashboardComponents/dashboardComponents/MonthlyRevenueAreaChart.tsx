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
  Legend,
} from 'recharts';
import { salesService } from '@/services/salesService';

interface ChartDataItem {
  date: string;
  sale: number;
  rent: number;
  lease: number;
}

export default function MonthlyRevenueAreaChart() {
  const [isClient, setIsClient] = useState(false);
  const [chartData, setChartData] = useState<ChartDataItem[]>([]);

  useEffect(() => {
    setIsClient(true);
    const fetchData = async () => {
      try {
        const sales = await salesService.getBranchSalesOverview('1Y');

        // Group by month
        const groupedData = sales.reduce((acc, curr) => {
          const date = new Date(curr.date).toLocaleDateString('en-US', { month: 'short' });
          let existing = acc.find((item) => item.date === date);

          const amount = curr.totalSales;
          const type = curr.saleType.toUpperCase();

          if (!existing) {
            existing = { date, sale: 0, rent: 0, lease: 0 };
            acc.push(existing);
          }

          if (type === 'SALE') existing.sale += amount;
          else if (type === 'RENT') existing.rent += amount;
          else if (type === 'LEASE') existing.lease += amount;

          return acc;
        }, [] as ChartDataItem[]);

        setChartData(groupedData);
      } catch (error) {
        console.error('Failed to fetch monthly area chart data:', error);
      }
    };
    fetchData();
  }, []);

  if (!isClient) return <div className="h-[320px] w-full bg-white rounded-2xl animate-pulse" />;

  return (
    <div className="rounded-2xl bg-white h-[320px] w-full shadow-sm border border-blue-50 flex flex-col p-4">
      <div className="pb-4">
        <h4 className="text-sm font-semibold text-gray-800">Monthly Revenue Source</h4>
        <p className="text-[10px] text-gray-500">Revenue trends by type</p>
      </div>
      <div className="flex-1 w-full -ml-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="saleGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-blue)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--chart-blue)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="rentGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-blue-light)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="var(--chart-blue-light)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="leaseGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-blue-lighter)" stopOpacity={0.15} />
                <stop offset="95%" stopColor="var(--chart-blue-lighter)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--chart-grid)" />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tickMargin={12}
              tick={{ fill: 'var(--chart-slate)', fontSize: 10 }}
            />
            <YAxis
              axisLine={{ stroke: 'var(--chart-grid)' }}
              tickLine={false}
              tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
              tickMargin={12}
              tick={{ fill: 'var(--chart-slate)', fontSize: 10 }}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-50 flex flex-col gap-2 min-w-[120px]">
                      <p className="text-xs font-bold text-gray-700 mb-2">{label}</p>
                      {(payload as { name: string; value: number; stroke: string }[]).map(
                        (entry, index: number) => (
                          <div key={index} className="flex items-center gap-2">
                            <span className="text-[12px]" style={{ color: entry.stroke }}>
                              {entry.name}:
                            </span>
                            <span
                              className="text-[12px] font-medium"
                              style={{ color: entry.stroke }}
                            >
                              QAR {entry.value.toLocaleString()}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{
                paddingBottom: '20px',
                fontSize: '10px',
                fontWeight: 500,
                color: '#64748b',
              }}
            />
            <Area
              type="monotone"
              dataKey="sale"
              name="Sale"
              stackId="1"
              stroke="var(--chart-blue)"
              fill="url(#saleGrad)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="rent"
              name="Rent"
              stackId="1"
              stroke="var(--chart-blue-light)"
              fill="url(#rentGrad)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="lease"
              name="Lease"
              stackId="1"
              stroke="var(--chart-blue-lighter)"
              fill="url(#leaseGrad)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
