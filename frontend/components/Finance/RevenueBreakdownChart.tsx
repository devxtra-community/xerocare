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
import { getInvoices } from '@/lib/invoice';
import { Loader2 } from 'lucide-react';
import { ChartTooltipContent } from '@/components/ui/ChartTooltip';
import { formatCompactNumber } from '@/lib/format';

// Month names for display
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface MonthlyData {
  month: string;
  rent: number;
  sale: number;
  lease: number;
}

interface RevenueBreakdownChartProps {
  selectedYear?: number | 'all';
  onYearChange?: (year: number | 'all') => void;
}

export default function RevenueBreakdownChart({ selectedYear }: RevenueBreakdownChartProps) {
  const [data, setData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const invoices = await getInvoices();
        const paidOnly = (invoices || []).filter((inv) => inv.status === 'PAID');

        // Filter by year if necessary
        const filteredInvoices =
          selectedYear === 'all'
            ? paidOnly
            : paidOnly.filter((inv) => new Date(inv.createdAt).getFullYear() === selectedYear);

        // Initialize all months with zero values
        const monthlyData: Record<string, MonthlyData> = {};
        MONTHS.forEach((month) => {
          monthlyData[month] = { month, rent: 0, sale: 0, lease: 0 };
        });

        // Populate with actual data
        filteredInvoices.forEach((inv) => {
          const date = new Date(inv.createdAt);
          const monthName = MONTHS[date.getMonth()];
          const rawType = (inv.saleType || '').toUpperCase();

          let typeKey: 'rent' | 'sale' | 'lease' | null = null;
          if (rawType === 'RENT') typeKey = 'rent';
          else if (rawType === 'LEASE') typeKey = 'lease';
          else if (['SALE', 'PRODUCT_SALE', 'SPAREPART_SALE'].includes(rawType)) typeKey = 'sale';

          if (monthlyData[monthName] && typeKey) {
            monthlyData[monthName][typeKey] += Number(inv.totalAmount) || 0;
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
  }, [selectedYear]);

  if (loading) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Alignment Spacer to match DailyRevenueChart's sub-header */}
      <div className="flex items-center justify-between invisible h-8">
        <div className="h-8" />
      </div>
      <div className="w-full h-[300px] mt-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            {/* Subtle Grid Lines */}
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />

            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--chart-slate-dark)', fontSize: 12 }}
              dy={10}
            />

            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--chart-slate-dark)', fontSize: 12 }}
              tickFormatter={(value) => `${formatCompactNumber(value)} QAR`}
            />

            <Tooltip
              content={
                <ChartTooltipContent
                  valueFormatter={(value) => {
                    const val = Number(value);
                    return `QAR ${formatCompactNumber(val)}`;
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
              stroke="var(--chart-blue)"
              strokeWidth={2}
              dot={{ fill: 'var(--chart-blue)', r: 4 }}
              activeDot={{ r: 6 }}
            />

            {/* Sale Line - Navy (Blue 800) */}
            <Line
              name="Sale"
              type="monotone"
              dataKey="sale"
              stroke="var(--chart-blue-dark)"
              strokeWidth={2}
              dot={{ fill: 'var(--chart-blue-dark)', r: 4 }}
              activeDot={{ r: 6 }}
            />

            {/* Lease Line - Light Blue (Blue 400) */}
            <Line
              name="Lease"
              type="monotone"
              dataKey="lease"
              stroke="var(--chart-blue-soft)"
              strokeWidth={2}
              dot={{ fill: 'var(--chart-blue-soft)', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
