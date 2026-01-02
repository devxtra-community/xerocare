"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const data = [
  { month: "Jan", attendance: 82 },
  { month: "Feb", attendance: 76 },
  { month: "Mar", attendance: 88 },
  { month: "Apr", attendance: 91 },
];

export default function AttendanceTrendChart() {
  return (
    <div className="rounded-xl border bg-card p-4 h-[280px]">
      <h3 className="font-medium mb-4">Monthly Attendance Trend</h3>

      <ResponsiveContainer width="90%" height="90%">
        <AreaChart data={data}>
          <XAxis
            dataKey="month"
            label={{ value: "Month", position: "insideBottom", offset: -5 }}
          />
          <YAxis
            domain={[0, 100]}
            label={{
              value: "Attendance (%)",
              angle: -90,
              position: "insideLeft",
            }}
          />
          <Tooltip formatter={(v) => `${v}%`} />
          <Legend />
          <Area
            type="monotone"
            dataKey="attendance"
            name="Attendance %"
            stroke="rgb(var(--primary-rgb))"
            fill="rgb(var(--primary-rgb))"
            fillOpacity={0.2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
