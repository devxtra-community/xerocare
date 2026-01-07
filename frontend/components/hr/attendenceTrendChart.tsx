"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,

} from "recharts";

const data = [
  { month: "Jan", attendance: 82 },
  { month: "Feb", attendance: 76 },
  { month: "Mar", attendance: 88 },
  { month: "Apr", attendance: 91 },
];

export default function AttendanceTrendChart() {
  return (
    <div className="rounded-xl border bg-card p-4">
      <h3 className="font-medium mb-3">Monthly Attendance Trend</h3>

      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <XAxis dataKey="month" />
            <YAxis domain={[0, 100]} />
            <Tooltip formatter={(v) => `${v}%`} />
            <Area
              type="monotone"
              dataKey="attendance"
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
