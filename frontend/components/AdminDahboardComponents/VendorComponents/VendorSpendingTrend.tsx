'use client';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { VendorRequest } from '@/lib/vendor';
import { format, parseISO, startOfYear, eachMonthOfInterval, endOfYear } from 'date-fns';

interface VendorSpendingTrendProps {
  requests: VendorRequest[];
}

/**
 * Area chart displaying monthly vendor spending trends for the current year.
 * Aggregates total purchase amounts per month to track procurement costs.
 */
export default function VendorSpendingTrend({ requests }: VendorSpendingTrendProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const data = useMemo(() => {
    if (!requests.length) return [];

    const currentYear = new Date().getFullYear();
    const months = eachMonthOfInterval({
      start: startOfYear(new Date(currentYear, 0, 1)),
      end: endOfYear(new Date(currentYear, 0, 1)),
    });

    // Initialize all months with 0 spend
    const monthlyData = months.map((date) => ({
      month: format(date, 'MMM'),
      spend: 0,
      fullDate: date,
    }));

    // Aggregate spending
    requests.forEach((req) => {
      if (req.total_amount && req.created_at) {
        const date = parseISO(req.created_at);
        if (date.getFullYear() === currentYear) {
          const monthIndex = date.getMonth();
          monthlyData[monthIndex].spend += Number(req.total_amount);
        }
      }
    });

    return monthlyData;
  }, [requests]);

  if (!isClient) return <div className="h-full w-full animate-pulse bg-muted/50 rounded-lg" />;

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex flex-row items-center justify-between pb-4">
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
          Purchase Value Trend ({new Date().getFullYear()})
        </p>
      </div>

      <div className="flex-1 w-full min-h-[150px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 0, left: -25, right: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748B', fontSize: 10 }}
              tickMargin={10}
            />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10 }} />
            <Tooltip
              contentStyle={{
                borderRadius: '8px',
                border: 'none',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                padding: '8px',
                fontSize: '10px',
              }}
              cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }}
              formatter={(value: number) => [`QAR ${value.toLocaleString()}`, 'Spend']}
            />
            <Area
              type="monotone"
              dataKey="spend"
              stroke="var(--primary)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#spendGradient)"
              name="Spend"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
