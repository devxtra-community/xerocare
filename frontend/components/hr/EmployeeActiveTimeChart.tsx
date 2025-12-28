"use client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useState, useEffect } from "react";

const data = [
  { name: "Samuel Drake", hours: 8.2 },
  { name: "Chloe Frazer", hours: 8.8 },
  { name: "Victor Sullivan", hours: 7.5 },
  { name: "Elena Fisher", hours: 9.0 },
  { name: "Nathan Drake", hours: 8.5 },
];

export default function EmployeeActiveTimeChart() {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100 h-[240px] flex flex-col hover:border-blue-100 transition-colors">
      <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4 px-2">Average Active Time</h4>
      <div className="flex-1 w-full">
        {isClient && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} strokeOpacity={0.1} />
              <XAxis 
                type="number" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: "#9ca3af", fontSize: 10 }}
                domain={[0, 12]}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: "#6b7280", fontSize: 11 }} 
                width={100}
              />
              <Tooltip 
                cursor={{ stroke: '#e5e7eb', strokeWidth: 1 }}
                contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                formatter={(value) => [`${value} hours`, 'Active Time']}
              />
              <Line 
                type="monotone" 
                dataKey="hours" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
