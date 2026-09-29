'use client';

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getFinanceReport } from '@/lib/invoice';
import { formatCompactNumber } from '@/lib/format';

import { getActiveCurrency } from '@/lib/currency';
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
    <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-4 h-full min-h-[400px]">
      <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-4">
        Profit Trend
      </h4>
      <div className="h-[320px] w-full">
        {isClient && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
              barCategoryGap="28%"
            >
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
              <XAxis
                dataKey="month"
                axisLine={{ stroke: 'var(--chart-grid)' }}
                tickLine={false}
                tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
                tickFormatter={(val) => `${formatCompactNumber(val)}`}
              />
              <Tooltip
                formatter={(val: number) => [
                  `${getActiveCurrency()} ${formatCompactNumber(val)}`,
                  'Net Profit',
                ]}
                contentStyle={{
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  boxShadow: '0 6px 20px rgba(15,23,42,0.10)',
                  padding: '8px 10px',
                }}
                labelStyle={{
                  color: '#0f172a',
                  fontWeight: 700,
                  fontSize: '11px',
                  marginBottom: 4,
                }}
                itemStyle={{
                  fontSize: '11px',
                  color: '#475569',
                  fontWeight: 600,
                  padding: 0,
                }}
                cursor={{ fill: 'rgba(15,23,42,0.04)' }}
              />
              {/* Profit carries the palette's green — the same green the Accounts module
                  uses for anything that lands, so the two charts agree with each other. */}
              <Bar
                dataKey="profit"
                name="Net Profit"
                fill="var(--chart-profit)"
                radius={[4, 4, 0, 0]}
                maxBarSize={24}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
