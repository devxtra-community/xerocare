'use client';

import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { salesService } from '@/services/salesService';
import { YearSelector } from '@/components/ui/YearSelector';

interface ChartDataItem {
  date: string;
  sale: number;
  rent: number;
  lease: number;
  total: number;
}

export default function MonthlyRevenueBarChart() {
  const [isClient, setIsClient] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(new Date().getFullYear());
  const [chartData, setChartData] = useState<ChartDataItem[]>([]);

  useEffect(() => {
    setIsClient(true);
    const fetchData = async () => {
      try {
        const sales = await salesService.getBranchSalesOverview(
          '1Y',
          selectedYear === 'all' ? undefined : selectedYear,
        );

        const pivotedData = sales.reduce((acc, curr) => {
          const date = new Date(curr.date).toLocaleDateString('en-US', { month: 'short' });
          let existing = acc.find((item) => item.date === date);

          const amount = curr.totalSales;
          const type = curr.saleType.toUpperCase();

          if (!existing) {
            existing = { date, sale: 0, rent: 0, lease: 0, total: 0 };
            acc.push(existing);
          }

          if (type === 'SALE') existing.sale += amount;
          else if (type === 'RENT') existing.rent += amount;
          else if (type === 'LEASE') existing.lease += amount;

          existing.total += amount;

          return acc;
        }, [] as ChartDataItem[]);

        setChartData(pivotedData);
      } catch (error) {
        console.error('Failed to fetch bar chart data:', error);
      }
    };
    fetchData();
  }, [selectedYear]);

  if (!isClient) return <div className="h-[320px] w-full bg-white rounded-2xl animate-pulse" />;

  return (
    <div className="rounded-2xl bg-white h-[320px] w-full shadow-sm border border-blue-50 flex flex-col p-4">
      <div className="flex items-center justify-between pb-4">
        <div>
          <h4 className="text-sm font-semibold text-gray-800">Monthly Revenue Source</h4>
          <p className="text-[10px] text-gray-500">Breakdown of revenue by month</p>
        </div>
        <YearSelector selectedYear={selectedYear} onYearChange={setSelectedYear} />
      </div>
      <div className="flex-1 w-full -ml-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
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
              cursor={{ fill: '#f8fafc' }}
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-50 flex flex-col gap-2 min-w-[120px]">
                      <p className="text-xs font-bold text-gray-700 mb-2">{label}</p>
                      {(payload as { name: string; value: number; color: string }[]).map(
                        (entry, index: number) => (
                          <div key={index} className="flex items-center gap-2">
                            <span className="text-[12px]" style={{ color: entry.color }}>
                              {entry.name}:
                            </span>
                            <span
                              className="text-[12px] font-medium"
                              style={{ color: entry.color }}
                            >
                              ₹{entry.value.toLocaleString()}
                            </span>
                          </div>
                        ),
                      )}
                      <div className="border-t pt-1 mt-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-bold text-gray-800">Total:</span>
                          <span className="text-[12px] font-bold text-gray-800">
                            ₹
                            {(payload as { value: number }[])
                              .reduce((sum: number, entry) => sum + entry.value, 0)
                              .toLocaleString()}
                          </span>
                        </div>
                      </div>
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
            <Bar
              dataKey="sale"
              name="Sale"
              stackId="a"
              fill="var(--chart-blue)"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="rent"
              name="Rent"
              stackId="a"
              fill="var(--chart-blue-light)"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="lease"
              name="Lease"
              stackId="a"
              fill="var(--chart-blue-lighter)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
