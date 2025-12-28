"use client";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useState, useEffect } from "react";

const data = [
  { month: "Jan", count: 250 },
  { month: "Feb", count: 265 },
  { month: "Mar", count: 270 },
  { month: "Apr", count: 285 },
  { month: "May", count: 290 },
  { month: "Jun", count: 300 },
];

export default function HeadcountTrend() {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100 h-[240px] flex flex-col hover:border-blue-100 transition-colors">
      <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4 px-2">Headcount Trend</h4>
      <div className="flex-1 w-full">
        {isClient && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="headcountGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 10 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 10 }} />
              <Tooltip contentStyle={{ borderRadius: "8px", border: "none" }} />
              <Area 
                type="monotone" 
                dataKey="count" 
                stroke="#3b82f6" 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#headcountGradient)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
