"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { useState, useEffect } from "react";

const headcountData = [
  { name: "Sales", count: 42, color: "#1e3a8a" },
  { name: "HR", count: 15, color: "#9333ea" },
  { name: "Finance", count: 12, color: "#d97706" },
  { name: "Service", count: 38, color: "#16a34a" },
  { name: "Warehouse", count: 55, color: "#1e40af" },
];

const levelData = [
  { name: "L1", value: 40, color: "#3b82f6" },
  { name: "L2", value: 30, color: "#1d4ed8" },
  { name: "L3", value: 15, color: "#1e3a8a" },
  { name: "L4", value: 10, color: "#172554" },
  { name: "L5", value: 5, color: "#000000" },
];

export default function DeptAnalytics() {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* HEADCOUNT BY DEPARTMENT */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 h-[240px] flex flex-col hover:border-blue-100 transition-colors">
        <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4 px-2">Headcount by Business Unit</h4>
        <div className="flex-1 w-full">
          {isClient && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={headcountData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 700 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <Tooltip 
                   cursor={{ fill: '#f8fafc' }}
                   contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)" }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={32}>
                   {headcountData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                   ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ROLE LEVEL DISTRIBUTION */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 h-[240px] flex flex-col hover:border-blue-100 transition-colors">
        <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4 px-2">Designation Level Split</h4>
        <div className="flex-1 w-full relative">
          {isClient && (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={levelData} 
                  innerRadius={60} 
                  outerRadius={100} 
                  paddingAngle={5} 
                  dataKey="value"
                  stroke="none"
                >
                   {levelData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                   ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)" }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
          {/* Legend Overlay */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
             <p className="text-2xl font-black text-blue-900">100%</p>
             <p className="text-[10px] font-bold text-gray-400 uppercase">Hierarchy</p>
          </div>
        </div>
        <div className="flex justify-center gap-4 mt-2">
           {levelData.map((l) => (
              <div key={l.name} className="flex items-center gap-1.5">
                 <div className="h-2 w-2 rounded-full" style={{ backgroundColor: l.color }} />
                 <span className="text-[10px] font-bold text-gray-400 uppercase">{l.name}</span>
              </div>
           ))}
        </div>
      </div>
    </div>
  );
}
