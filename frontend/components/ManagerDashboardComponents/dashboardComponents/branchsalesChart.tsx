'use client';

import { useState, useEffect } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { ChartTooltipContent } from '@/components/ui/ChartTooltip';
import { salesService } from '@/services/salesService';

interface ChartDataItem {
  date: string;
  sale: number;
  rent: number;
  lease: number;
}

export default function BranchSalesChart() {
  const [selectedPeriod, setSelectedPeriod] = useState('1M');
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
          <h4 className="text-sm font-semibold text-gray-800">Branch Sales Overview</h4>
          <p className="text-[10px] text-gray-500">Revenue breakdown by category</p>
        </div>

        <div className="flex bg-gray-50 p-1 rounded-lg border border-gray-100">
          {['1W', '1M', '3M', '1Y'].map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-3 py-1 rounded-md text-[10px] transition-all duration-200 ${
                selectedPeriod === period
                  ? 'bg-white text-primary font-bold shadow-sm border border-blue-100'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 w-full -ml-4">
        {isClient && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="saleGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                  <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.8} />
                </linearGradient>
                <linearGradient id="rentGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1} />
                  <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.8} />
                </linearGradient>
                <linearGradient id="leaseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity={1} />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.8} />
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
                  if (selectedPeriod === '1Y') {
                    return d.toLocaleDateString('en-US', { month: 'short' });
                  }
                  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }}
              />

              <YAxis
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => (v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`)}
                tickMargin={12}
                tick={{ fill: '#94a3b8', fontSize: 10 }}
              />

              <Tooltip
                cursor={{ fill: '#f8fafc' }}
                content={
                  <ChartTooltipContent
                    labelFormatter={(val) => {
                      const d = new Date(val);
                      return d.toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      });
                    }}
                    valueFormatter={(v) => `₹${Number(v).toLocaleString()}`}
                  />
                }
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
                name="Sales"
                stackId="a"
                fill="url(#saleGradient)"
                radius={[0, 0, 0, 0]}
                barSize={20}
              />
              <Bar
                dataKey="rent"
                name="Rent"
                stackId="a"
                fill="url(#rentGradient)"
                radius={[0, 0, 0, 0]}
                barSize={20}
              />
              <Bar
                dataKey="lease"
                name="Lease"
                stackId="a"
                fill="url(#leaseGradient)"
                radius={[4, 4, 0, 0]}
                barSize={20}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
