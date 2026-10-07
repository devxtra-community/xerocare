'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartTooltipContent } from '@/components/ui/ChartTooltip';
import { ERP_CHART_COLORS } from '@/lib/chartTheme';

interface MonthlySalesBarChartProps {
  data: { month: string; sales: number }[];
}

/**
 * Line chart displaying monthly sales performance.
 * Visualizes revenue trends over the course of the year.
 */
export default function MonthlySalesBarChart({ data }: MonthlySalesBarChartProps) {
  return (
    <div className="w-full h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={ERP_CHART_COLORS.grid} />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: ERP_CHART_COLORS.axis }}
            tickMargin={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: ERP_CHART_COLORS.axis }}
            tickFormatter={(value) => `${value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value}`}
          />
          <Tooltip
            cursor={{ stroke: ERP_CHART_COLORS.track, strokeWidth: 1 }}
            content={
              <ChartTooltipContent
                valueFormatter={(value) =>
                  `${Number(value) >= 1000 ? (Number(value) / 1000).toFixed(0) + 'k' : value}`
                }
              />
            }
          />
          <Line
            type="monotone"
            dataKey="sales"
            name="Sales"
            stroke={ERP_CHART_COLORS.primary}
            strokeWidth={2.5}
            dot={{
              r: 3,
              fill: ERP_CHART_COLORS.primary,
              stroke: ERP_CHART_COLORS.surface,
              strokeWidth: 2,
            }}
            activeDot={{
              r: 5,
              fill: ERP_CHART_COLORS.primary,
              stroke: ERP_CHART_COLORS.surface,
              strokeWidth: 2,
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
