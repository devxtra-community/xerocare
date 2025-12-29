"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const data = [
  { month: "Jan", sales: 12000 },
  { month: "Feb", sales: 18000 },
  { month: "Mar", sales: 15000 },
  { month: "Apr", sales: 22000 },
  { month: "May", sales: 26000 },
  { month: "Jun", sales: 30000 },
];

export default function MonthlySalesBarChart() {
  return (
    <div className="bg-white rounded-xl p-3 sm:p-4">
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 11, fill: "#1e3a8a" }}
              axisLine={{ stroke: "#e5e7eb" }}
              tickMargin={8}
            />
            <YAxis 
              tick={{ fontSize: 11, fill: "#1e3a8a" }}
              axisLine={{ stroke: "#e5e7eb" }}
            />
            <Tooltip 
              contentStyle={{ fontSize: 12 }}
              labelStyle={{ color: "#1e3a8a" }}
            />
            <Bar dataKey="sales" fill="#0D47A1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}