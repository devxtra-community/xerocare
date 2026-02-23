'use client';

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getFinanceReport } from '@/lib/invoice';
import { formatCompactNumber } from '@/lib/format';

interface ProfitChartProps {
  selectedYear?: number | 'all';
}

interface ProfitData {
  month: string;
  profit: number;
}

/**
 * Bar chart visualizing monthly net profit trends.
 * Enables quick assessment of profitability over time.
 */
export default function ProfitChart({ selectedYear }: ProfitChartProps) {
  const [isClient, setIsClient] = useState(false);
  const [data, setData] = useState<ProfitData[]>([]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const report = await getFinanceReport({
          year: selectedYear === 'all' ? undefined : selectedYear,
        });

        // Group by month and aggregate profit
        const monthlyData = new Map<string, number>();
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
        months.forEach((m) => monthlyData.set(m, 0));

        report.forEach((item) => {
          const monthIndex = new Date(item.month).getMonth();
          const monthName = months[monthIndex];

          const currentProfit = monthlyData.get(monthName) || 0;
          // Calculate profit: Income - Expense
          // item.profit is already returned by backend?
          // interface FinanceReportItem { profit: number; ... }
          // Yes.
          monthlyData.set(monthName, currentProfit + Number(item.profit || 0));
        });

        const formattedData = Array.from(monthlyData.entries()).map(([month, profit]) => ({
          month,
          profit,
        }));

        setData(formattedData);
      } catch (error) {
        console.error('Failed to fetch profit data', error);
      }
    };

    fetchData();
  }, [selectedYear]);

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-blue-100 p-4 h-full min-h-[400px]">
      <h4 className="text-sm font-bold text-primary uppercase mb-6">Profit Trend</h4>
      <div className="h-[320px] w-full">
        {isClient && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
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
                formatter={(val: number) => [`QAR ${formatCompactNumber(val)}`, 'Net Profit']}
                contentStyle={{
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                }}
                itemStyle={{ fontSize: '10px', fontWeight: 'bold', color: '#1d4ed8' }}
              />
              <Bar
                dataKey="profit"
                name="Net Profit"
                fill="#1d4ed8"
                radius={[4, 4, 0, 0]}
                barSize={30}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
