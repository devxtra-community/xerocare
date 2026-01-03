"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Props = {
  data: { month: string; daysPresent: number }[];
};

export default function EmployeeAttendanceTrend({ data }: Props) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <h3 className="font-medium mb-3">Attendance Trend</h3>

      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <XAxis dataKey="month" />
            <YAxis domain={[0, 31]} />
            <Tooltip />
            <Area
              dataKey="daysPresent"
              stroke="rgb(var(--primary-rgb))"
              fill="rgb(var(--primary-rgb))"
              fillOpacity={0.2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
