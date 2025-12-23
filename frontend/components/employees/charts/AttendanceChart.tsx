"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Props<T extends Record<string, unknown>> = {
  data: T[];
  dataKey?: keyof T;
  title?: string;
  yAxisDomain?: [number, number];
};

export default function AttendanceChart<T extends Record<string, unknown>>({
  data,
  dataKey = "days" as keyof T,
  title = "Present Days per Month",
  yAxisDomain,
}: Props<T>) {
  return (
    <div
      className="bg-card border shadow-sm rounded-xl p-5 w-full flex flex-col h-70 "
    >
      <h3 className="font-medium mb-4 text-foreground">{title}</h3>

      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 20, right: 5, left: -30, bottom: 0 }}
        >
          <XAxis dataKey="month" tickMargin={8} />

          <YAxis
            tickMargin={8}
            domain={yAxisDomain}
            tickFormatter={(v) => (yAxisDomain ? `${v}%` : v)}
          />

          <Tooltip formatter={(v) => (yAxisDomain ? `${v}%` : v)} />

          <Area
            type="monotone"
            dataKey={dataKey as string}
            stroke="rgb(var(--primary-rgb))"
            fill="rgb(var(--primary-rgb))"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
