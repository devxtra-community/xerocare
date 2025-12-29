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
  { product: "iPhone 15 Pro", qty: 120 },
  { product: "MacBook Pro", qty: 95 },
  { product: "iPhone 14", qty: 80 },
  { product: "MacBook Air", qty: 70 },
];

export default function MostSoldProductChart() {
  return (
    <div className="bg-white rounded-xl p-3 sm:p-4">
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis type="category" dataKey="product" width={90} />
            <Tooltip />
            <Bar dataKey="qty" fill="#16a34a" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
