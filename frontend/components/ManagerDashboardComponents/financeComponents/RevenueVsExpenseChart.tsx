'use client';

import React, { useState, useEffect } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { getFinanceReport } from '@/lib/invoice';
import { formatCompactNumber } from '@/lib/format';

interface RevenueVsExpenseChartProps {
  selectedYear?: number | 'all';
}

interface FinancialData {
  month: string;
  revenue: number;
  expense: number;
}

/**
 * Composed chart comparing monthly revenue against expenses.
 * Uses bars for revenue/expenses and a line for revenue trend.
 * Critical for analyzing financial performance and efficiency.
 */
export default function RevenueVsExpenseChart({ selectedYear }: RevenueVsExpenseChartProps) {
  const [isClient, setIsClient] = useState(false);
  const [data, setData] = useState<FinancialData[]>([]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const report = await getFinanceReport({
          year: selectedYear === 'all' ? undefined : selectedYear,
        });

        // Group by month and aggregate
        const monthlyData = new Map<string, { revenue: number; expense: number }>();
        const months = [
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

        // Initialize with 0
        months.forEach((m) => monthlyData.set(m, { revenue: 0, expense: 0 }));

        report.forEach((item) => {
          // Assuming item.month is a date string or recognizable
          // If item.month is '2024-01-01', we get month index
          // But backend getFinanceReport might return grouped data?
          // Let's assume backend returns array of items.
          // Wait, backend getFinanceReport returns:
          // { month: string, income: number, expense: number, ... }
          // month is likely a string.
          // Let's inspect the backend logic if possible, or assume it returns 'YYYY-MM' or date.
          // Step 158 showed backend: TO_CHAR(invoice.createdAt, 'YYYY-MM') as month
          // So it returns '2024-01', '2024-02'.

          const monthIndex = new Date(item.month).getMonth();
          const monthName = months[monthIndex];

          const current = monthlyData.get(monthName) || { revenue: 0, expense: 0 };
          monthlyData.set(monthName, {
            revenue: current.revenue + Number(item.income || 0),
            expense: current.expense + Number(item.expense || 0),
          });
        });

        const formattedData = Array.from(monthlyData.entries()).map(([month, values]) => ({
          month,
          revenue: values.revenue,
          expense: values.expense,
        }));

        setData(formattedData);
      } catch (error) {
        console.error('Failed to fetch revenue vs expense data', error);
      }
    };

    fetchData();
  }, [selectedYear]);

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-blue-100 p-4 h-full min-h-[400px]">
      <h4 className="text-sm font-bold text-primary uppercase mb-6">Revenue vs Expenses</h4>
      <div className="h-[320px] w-full">
        {isClient && (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.2} />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                tickFormatter={(val) => `${formatCompactNumber(val)}`}
              />
              <Tooltip
                formatter={(val: number) => [`QAR ${formatCompactNumber(val)}`]}
                contentStyle={{
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                }}
                itemStyle={{ fontSize: '10px', fontWeight: 'bold' }}
              />
              <Legend
                iconType="circle"
                wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }}
              />
              <Bar
                dataKey="revenue"
                name="Revenue"
                fill="#1d4ed8"
                radius={[4, 4, 0, 0]}
                barSize={20}
              />
              <Bar
                dataKey="expense"
                name="Expenses"
                fill="#93c5fd"
                radius={[4, 4, 0, 0]}
                barSize={20}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                name="Trend"
                stroke="#1d4ed8"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
