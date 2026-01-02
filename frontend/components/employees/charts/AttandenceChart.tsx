"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Props<T extends { month: string } & Record<string, unknown>> = {
  data: T[];
  dataKey: keyof T;
  title?: string;
  yAxisDomain?: [number, number];
};

export default function AttendanceChart<
  T extends { month: string } & Record<string, unknown>
>({
  data,
  dataKey,
  title = "Present Days per Month",
  yAxisDomain,
}: Props<T>) {
  return (
    <div className="bg-card border border-border rounded-xl p-6 h-[260px]">
      <h3 className="font-medium mb-3 text-foreground">{title}</h3>

      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <XAxis dataKey="month" />

          <YAxis
            domain={yAxisDomain}
            tickFormatter={(v) => (yAxisDomain ? `${v}%` : v)}
          />

          <Tooltip
            formatter={(v) => (yAxisDomain ? `${v}%` : v)}
          />

          <Area
            type="monotone"
            dataKey={dataKey as string}
            stroke="rgb(var(--primary-rgb))"
            fill="rgb(var(--primary-light-rgb))"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
