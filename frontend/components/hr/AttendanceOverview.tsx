"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useState, useEffect } from "react";

const data = [
  { day: "Mon", present: 280, absent: 10, leave: 10 },
  { day: "Tue", present: 275, absent: 15, leave: 10 },
  { day: "Wed", present: 285, absent: 5, leave: 10 },
  { day: "Thu", present: 270, absent: 20, leave: 10 },
  { day: "Fri", present: 290, absent: 5, leave: 5 },
];

export default function AttendanceOverview() {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100 h-[240px] flex flex-col hover:border-blue-100 transition-colors">
      <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4 px-2">Attendance Overview</h4>
      <div className="flex-1 w-full px-2">
        {isClient && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 10 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 10 }} />
              <Tooltip contentStyle={{ borderRadius: "8px", border: "none" }} />
              <Legend 
                iconType="circle" 
                wrapperStyle={{ fontSize: '10px', paddingTop: '4px' }}
                formatter={(value) => value.charAt(0).toUpperCase() + value.slice(1)}
              />
              <Bar dataKey="present" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
              <Bar dataKey="absent" stackId="a" fill="#f43f5e" radius={[0, 0, 0, 0]} />
              <Bar dataKey="leave" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
