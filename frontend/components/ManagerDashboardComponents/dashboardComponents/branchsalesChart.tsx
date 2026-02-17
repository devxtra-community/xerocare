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

interface BranchSalesChartProps {
  period: string;
  title: string;
  subtitle: string;
}

export default function BranchSalesChart({
  period: selectedPeriod,
  title,
  subtitle,
}: BranchSalesChartProps) {
  const [isClient, setIsClient] = useState(false);
  const [chartData, setChartData] = useState<ChartDataItem[]>([]);

  useEffect(() => {
    setIsClient(true);

    const fetchData = async () => {
      try {
        const sales = await salesService.getBranchSalesOverview(selectedPeriod);

        // Map and pivot sales to chart data
        const pivotedData = sales.reduce((acc, curr) => {
          const date = curr.date;
          const existing = acc.find((item) => item.date === date);

          const amount = curr.totalSales;
          const type = curr.saleType.toUpperCase();

          if (existing) {
            if (type === 'SALE') existing.sale = (existing.sale || 0) + amount;
            else if (type === 'RENT') existing.rent = (existing.rent || 0) + amount;
            else if (type === 'LEASE') existing.lease = (existing.lease || 0) + amount;
          } else {
            acc.push({
              date,
              sale: type === 'SALE' ? amount : 0,
              rent: type === 'RENT' ? amount : 0,
              lease: type === 'LEASE' ? amount : 0,
            });
          }
          return acc;
        }, [] as ChartDataItem[]);

        const sortedData = pivotedData.sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        );
        setChartData(sortedData);
      } catch (error) {
        console.error('Failed to fetch chart data:', error);
      }
    };

    fetchData();
  }, [selectedPeriod]);

  return (
    <div className="rounded-2xl bg-white h-[320px] w-full shadow-sm border border-blue-50 flex flex-col p-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-4">
        <div>
          <h4 className="text-sm font-semibold text-gray-800">{title}</h4>
          <p className="text-[10px] text-gray-500">{subtitle}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 w-full -ml-4">
        {isClient && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="saleGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="rentGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="leaseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />

              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tickMargin={12}
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                tickFormatter={(val) => {
                  const d = new Date(val);
                  if (selectedPeriod === '1W') {
                    return d.toLocaleDateString('en-US', { weekday: 'short' });
                  }
                  return d.toLocaleDateString('en-US', { month: 'short' });
                }}
              />
              <YAxis
                axisLine={{ stroke: '#f1f5f9' }}
                tickLine={false}
                tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
                tickMargin={12}
                tick={{ fill: '#94a3b8', fontSize: 10 }}
              />

              <Tooltip
                cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const date = new Date(label);
                    const formattedDate =
                      selectedPeriod === '1W'
                        ? date.toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })
                        : date.toLocaleDateString('en-US', {
                            month: 'long',
                            year: 'numeric',
                          });
                    return (
                      <div className="bg-white p-4 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-50 flex flex-col gap-2 min-w-[120px]">
                        <p className="text-xs font-bold text-gray-700 mb-2">{formattedDate}</p>
                        {payload.map((entry: unknown, index: number) => {
                          const item = entry as { name: string; value: number; color: string };
                          return (
                            <div key={index} className="flex items-center gap-2">
                              <span className="text-[12px]" style={{ color: item.color }}>
                                {item.name} :
                              </span>
                              <span
                                className="text-[12px] font-medium"
                                style={{ color: item.color }}
                              >
                                {item.value >= 1000
                                  ? `${(item.value / 1000).toFixed(0)}k`
                                  : item.value}
                              </span>
                            </div>
                          );
                        })}
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
                name="Product Revenue"
                stroke="#2563eb"
                fill="url(#saleGradient)"
                strokeWidth={2}
                dot={{ r: 4, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                dataKey="rent"
                name="Rent Revenue"
                stroke="#3b82f6"
                fill="url(#rentGradient)"
                strokeWidth={2}
                dot={{ r: 4, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                dataKey="lease"
                name="Lease Revenue"
                stroke="#93c5fd"
                fill="url(#leaseGradient)"
                strokeWidth={2}
                dot={{ r: 4, fill: '#93c5fd', stroke: '#fff', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#93c5fd', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
