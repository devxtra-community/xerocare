"use client";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useState, useEffect } from "react";

const data = [
  { employee: "Nathan", minutes: 45, day: 1, type: "Late" },
  { employee: "Victor", minutes: 45, day: 1, type: "Early" },
  { employee: "Elena", minutes: 30, day: 2, type: "Late" },
  { employee: "Samuel", minutes: 90, day: 2, type: "Early" },
  { employee: "Nathan", minutes: 60, day: 3, type: "Late" },
  { employee: "Chloe", minutes: 20, day: 4, type: "Late" },
  { employee: "Victor", minutes: 30, day: 5, type: "Early" },
];

export default function LateEarlyChart() {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100 h-[240px] flex flex-col hover:border-blue-100 transition-colors">
      <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4 px-2">Punctuality Scatter Plot</h4>
      <div className="flex-1 w-full">
        {isClient && (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
              <XAxis 
                type="number" 
                dataKey="day" 
                name="Day" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: "#64748b", fontSize: 11 }}
                label={{ value: 'Day of Month', position: 'insideBottom', offset: -5, style: { fontSize: 10, fill: '#64748b' } }}
              />
              <YAxis 
                type="number" 
                dataKey="minutes" 
                name="Minutes" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: "#64748b", fontSize: 11 }}
                label={{ value: 'Minutes', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#64748b' } }}
              />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                formatter={(value, name) => [value, name === 'minutes' ? 'Minutes' : name]}
              />
              <Scatter name="Late/Early" data={data} fill="#8884d8">
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.type === 'Late' ? '#f59e0b' : '#3b82f6'} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500"></div>
          <span className="text-xs text-gray-600">Late Arrival</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span className="text-xs text-gray-600">Early Departure</span>
        </div>
      </div>
    </div>
  );
}
