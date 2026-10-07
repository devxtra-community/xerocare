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

import { getActiveCurrency } from '@/lib/currency';
interface RevenueVsExpenseChartProps {
  selectedYear?: number | 'all';
}

interface FinancialData {
  month: string;
  revenue: number;
  expense: number;
  salaryExpense: number;
  purchaseExpense: number;
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
        const monthlyData = new Map<
          string,
          { revenue: number; expense: number; salary: number; purchase: number }
        >();
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
        months.forEach((m) =>
          monthlyData.set(m, { revenue: 0, expense: 0, salary: 0, purchase: 0 }),
        );

        report.forEach((item) => {
          const monthIndex = new Date(item.month).getMonth();
          const monthName = months[monthIndex];

          const current = monthlyData.get(monthName) || {
            revenue: 0,
            expense: 0,
            salary: 0,
            purchase: 0,
          };
          monthlyData.set(monthName, {
            revenue: current.revenue + Number(item.income || 0),
            expense: current.expense + Number(item.expense || 0),
            salary: current.salary + Number(item.salaryExpense || 0),
            purchase: current.purchase + Number(item.purchaseExpense || 0),
          });
        });

        const formattedData = Array.from(monthlyData.entries()).map(([month, values]) => ({
          month,
          revenue: values.revenue,
          expense: values.expense,
          salaryExpense: values.salary,
          purchaseExpense: values.purchase,
        }));

        setData(formattedData);
      } catch (error) {
        console.error('Failed to fetch revenue vs expense data', error);
      }
    };

    fetchData();
  }, [selectedYear]);

  return (
    // Same chart-card pattern as the Accounts module: white card, hairline border,
    // uppercase micro-label header — so a finance dashboard chart and an Accounts
    // analytics chart read as one system.
    <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-4 h-full min-h-[400px]">
      <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-4">
        Revenue vs Expenses
      </h4>
      <div className="h-[320px] w-full">
        {isClient && (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
              barCategoryGap="28%"
            >
              {/* Hairline solid grid — a dashed grid reads as a threshold. */}
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
                formatter={(val: number) => [`${getActiveCurrency()} ${formatCompactNumber(val)}`]}
                contentStyle={{
                  borderRadius: '10px',
                  border: '1px solid var(--chart-grid)',
                  background: 'var(--card)',
                  boxShadow: '0 6px 20px color-mix(in srgb, var(--foreground) 10%, transparent)',
                  padding: '8px 10px',
                }}
                labelStyle={{
                  color: 'var(--foreground)',
                  fontWeight: 700,
                  fontSize: '11px',
                  marginBottom: 4,
                }}
                itemStyle={{
                  fontSize: '11px',
                  color: 'var(--muted-foreground)',
                  padding: 0,
                }}
                cursor={{ fill: 'color-mix(in srgb, var(--foreground) 4%, transparent)' }}
              />
              {/* Ink-coloured legend labels — meaning lives in the swatch, not the text. */}
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value: string) => (
                  <span style={{ color: 'var(--muted-foreground)', fontSize: 11, fontWeight: 600 }}>
                    {value}
                  </span>
                )}
                wrapperStyle={{ paddingTop: '6px' }}
              />
              {/* Semantic palette from globals.css: Revenue is always this blue, expense
                  components always these muted tones, wherever they appear. */}
              <Bar
                dataKey="revenue"
                name="Revenue"
                fill="var(--chart-revenue)"
                radius={[4, 4, 0, 0]}
                maxBarSize={24}
                isAnimationActive={false}
              />
              <Bar
                dataKey="purchaseExpense"
                stackId="expense"
                name="Purchase Cost"
                fill="var(--chart-purchase)"
                radius={[0, 0, 0, 0]}
                maxBarSize={24}
                isAnimationActive={false}
              />
              <Bar
                dataKey="salaryExpense"
                stackId="expense"
                name="Salary Expense"
                fill="var(--chart-expense)"
                radius={[4, 4, 0, 0]}
                maxBarSize={24}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                name="Trend"
                stroke="var(--chart-revenue)"
                strokeWidth={2}
                strokeLinecap="round"
                dot={false}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
