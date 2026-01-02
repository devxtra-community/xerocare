"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const data = [
  { day: "Mon", late: 6, early: 2 },
  { day: "Tue", late: 4, early: 1 },
  { day: "Wed", late: 7, early: 3 },
];

export default function LateEarlyChart() {
  return (
    <div className="rounded-xl border bg-card p-4 h-[280px]">
      <h3 className="font-medium mb-4">Punctuality Analysis</h3>

      <ResponsiveContainer width="90%" height="90%">
        <BarChart data={data}>
          <XAxis
            dataKey="day"
            label={{ value: "Day", position: "insideBottom", offset: -5 }}
          />
          <YAxis
            label={{
              value: "Employees",
              angle: -90,
              position: "insideLeft",
            }}
          />
          <Tooltip />
          <Legend />
          <Bar dataKey="late" name="Late Arrivals" fill="rgb(var(--primary-rgb))" />
          <Bar
            dataKey="early"
            name="Early Exits"
            fill="rgb(var(--primary-light-rgb))"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
