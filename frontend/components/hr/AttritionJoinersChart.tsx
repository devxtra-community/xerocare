"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useState, useEffect } from "react";

const data = [
  { month: "Jan", joiners: 15, exits: 5 },
  { month: "Feb", joiners: 12, exits: 8 },
  { month: "Mar", joiners: 20, exits: 4 },
  { month: "Apr", joiners: 18, exits: 6 },
  { month: "May", joiners: 25, exits: 10 },
  { month: "Jun", joiners: 22, exits: 7 },
];

export default function AttritionJoinersChart() {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100 h-[240px] flex flex-col hover:border-blue-100 transition-colors">
      <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4 px-2">Attrition / New Joiners</h4>
      <div className="flex-1 w-full">
        {isClient && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 10 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 10 }} />
              <Tooltip contentStyle={{ borderRadius: "8px", border: "none" }} />
              <Legend 
                iconType="circle" 
                wrapperStyle={{ fontSize: '10px', paddingTop: '4px' }}
                formatter={(value) => value.charAt(0).toUpperCase() + value.slice(1)}
              />
              <Bar dataKey="joiners" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="exits" fill="#94a3b8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
