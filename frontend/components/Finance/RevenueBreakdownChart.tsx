'use client';

import React, { useEffect, useState } from 'react';
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import { getGlobalSalesOverview } from '@/lib/invoice';
import { Loader2 } from 'lucide-react';
import { ChartTooltipContent } from '@/components/ui/ChartTooltip';

// Month names for display
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface MonthlyData {
  month: string;
  rent: number;
  sale: number;
  lease: number;
}

export default function RevenueBreakdownChart() {
  const [data, setData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch 12 months of data
        const salesData = await getGlobalSalesOverview('12M');

        // Initialize all months with zero values
        const monthlyData: Record<string, MonthlyData> = {};
        MONTHS.forEach((month) => {
          monthlyData[month] = { month, rent: 0, sale: 0, lease: 0 };
        });

        // Populate with actual data
        salesData.forEach((item) => {
          const date = new Date(item.date);
          const monthName = MONTHS[date.getMonth()];
          const saleType = item.saleType.toLowerCase() as 'rent' | 'sale' | 'lease';

          if (
            monthlyData[monthName] &&
            (saleType === 'rent' || saleType === 'sale' || saleType === 'lease')
          ) {
            monthlyData[monthName][saleType] += item.totalSales;
          }
        });

        // Convert to array in month order
        const chartData = MONTHS.map((month) => monthlyData[month]);
        setData(chartData);
      } catch (error) {
        console.error('Failed to fetch revenue data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="w-full h-[310px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-full h-[310px] mt-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          {/* Subtle Grid Lines */}
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />

          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748b', fontSize: 12 }}
            dy={10}
          />

          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748b', fontSize: 12 }}
            tickFormatter={(value) => `₹${value / 1000}k`}
          />

          <Tooltip
            content={
              <ChartTooltipContent
                valueFormatter={(value) => {
                  const val = Number(value);
                  return `₹${val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val.toLocaleString()}`;
                }}
              />
            }
          />

          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={{ paddingBottom: '20px', fontSize: '12px', fontWeight: 500 }}
          />

          {/* Rent Line - Primary (Blue 600) */}
          <Line
            name="Rent"
            type="monotone"
            dataKey="rent"
            stroke="#2563eb"
            strokeWidth={2}
            dot={{ fill: '#2563eb', r: 4 }}
            activeDot={{ r: 6 }}
          />

          {/* Sale Line - Navy (Blue 800) */}
          <Line
            name="Sale"
            type="monotone"
            dataKey="sale"
            stroke="#1e40af"
            strokeWidth={2}
            dot={{ fill: '#1e40af', r: 4 }}
            activeDot={{ r: 6 }}
          />

          {/* Lease Line - Light Blue (Blue 400) */}
          <Line
            name="Lease"
            type="monotone"
            dataKey="lease"
            stroke="#60a5fa"
            strokeWidth={2}
            dot={{ fill: '#60a5fa', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
