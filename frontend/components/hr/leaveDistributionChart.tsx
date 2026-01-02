"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const data = [
  { name: "Casual Leave", value: 12 },
  { name: "Sick Leave", value: 7 },
  { name: "Paid Leave", value: 5 },
];

const COLORS = [
  "rgb(var(--primary-rgb))",
  "rgb(var(--primary-light-rgb))",
  "rgb(var(--muted-rgb))",
];

export default function LeaveDistributionChart() {
  return (
    <div className="rounded-xl border bg-card p-4 h-[260px]">
      <h3 className="font-medium mb-4">Leave Distribution</h3>

      <ResponsiveContainer width="90%" height="90%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            label={(entry) => `${entry.name}: ${entry.value}`}
            outerRadius={80}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
