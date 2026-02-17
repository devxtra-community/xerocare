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

interface DailyData {
  day: string;
  rent: number;
  sale: number;
  lease: number;
}

export default function DailyRevenueChart() {
  const [data, setData] = useState<DailyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const salesData = await getGlobalSalesOverview('1M');

        // Get current month details
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

        // Initialize data for all days of the current month
        const fullMonthData: DailyData[] = Array.from({ length: daysInMonth }, (_, i) => ({
          day: `${i + 1}`,
          rent: 0,
          sale: 0,
          lease: 0,
        }));

        // Map fetched data to the correct day
        salesData.forEach((item) => {
          const date = new Date(item.date);
          // Only include data for the current month and year
          if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
            const dayIndex = date.getDate() - 1; // 0-based index
            const saleType = item.saleType.toLowerCase() as 'rent' | 'sale' | 'lease';

            if (fullMonthData[dayIndex] && ['rent', 'sale', 'lease'].includes(saleType)) {
              fullMonthData[dayIndex][saleType] += item.totalSales;
            }
          }
        });

        setData(fullMonthData);
      } catch (error) {
        console.error('Failed to fetch daily revenue data:', error);
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
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />

          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748b', fontSize: 11 }}
            dy={10}
            interval="preserveStartEnd"
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
            dot={{ fill: '#2563eb', r: 3 }}
            activeDot={{ r: 5 }}
          />

          {/* Sale Line - Navy (Blue 800) */}
          <Line
            name="Sale"
            type="monotone"
            dataKey="sale"
            stroke="#1e40af"
            strokeWidth={2}
            dot={{ fill: '#1e40af', r: 3 }}
            activeDot={{ r: 5 }}
          />

          {/* Lease Line - Light Blue (Blue 400) */}
          <Line
            name="Lease"
            type="monotone"
            dataKey="lease"
            stroke="#60a5fa"
            strokeWidth={2}
            dot={{ fill: '#60a5fa', r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
