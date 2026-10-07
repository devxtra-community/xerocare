'use client';

import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const data = [
  { name: 'Mon', attendance: 85 },
  { name: 'Tue', attendance: 92 },
  { name: 'Wed', attendance: 88 },
  { name: 'Thu', attendance: 95 },
  { name: 'Fri', attendance: 91 },
  { name: 'Sat', attendance: 78 },
  { name: 'Sun', attendance: 75 },
];

/**
 * Line chart component visualizing weekly attendance trends.
 * Displays average attendance percentage over the week.
 */
export default function AttendanceTrendChart() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsClient(true), 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="bg-card rounded-xl shadow-sm p-4 border border-primary/30 flex flex-col h-full min-h-[260px]">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-bold text-primary uppercase">Attendance Trend</h3>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary" />
          <span className="text-[10px] font-bold text-muted-foreground uppercase">
            Avg Attendance %
          </span>
        </div>
      </div>

      <div className="flex-1 w-full h-[180px]">
        {isClient && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.2} />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--chart-slate)', fontSize: 10, fontWeight: 600 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--chart-slate)', fontSize: 10, fontWeight: 600 }}
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-primary px-3 py-1.5 shadow-xl rounded-lg text-xs font-bold text-primary-foreground">
                        {payload[0].value}% Attendance
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                type="monotone"
                dataKey="attendance"
                stroke="var(--chart-blue-dark)"
                strokeWidth={3}
                dot={{
                  fill: 'var(--chart-blue-dark)',
                  r: 4,
                  strokeWidth: 2,
                  stroke: 'var(--card)',
                }}
                activeDot={{ r: 6, strokeWidth: 0 }}
                animationDuration={1500}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
