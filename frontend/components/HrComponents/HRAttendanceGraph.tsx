'use client';

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ChartTooltipContent } from '@/components/ui/ChartTooltip';

interface AttendanceData {
  day: string;
  present: number;
}

export default function HRAttendanceGraph() {
  const [data, setData] = useState<AttendanceData[]>([]);

  useEffect(() => {
    // Generate mock data for the current month (last 30 days)
    const generateMockData = () => {
      const mockData: AttendanceData[] = [];
      const today = new Date();
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

      for (let i = 1; i <= daysInMonth; i++) {
        // Mock attendance: random between 70-95% of total employees (assuming ~100 employees)
        const baseAttendance = 85;
        const variance = Math.floor(Math.random() * 20) - 10; // -10 to +10
        const present = Math.max(70, Math.min(95, baseAttendance + variance));

        mockData.push({
          day: i.toString(),
          present,
        });
      }

      return mockData;
    };

    setData(generateMockData());
  }, []);

  return (
    <div className="bg-card p-5 rounded-2xl shadow-sm border border-blue-100/50 flex flex-col h-[300px] w-full">
      <div className="flex-1 w-full min-h-0 pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e2e8f0"
              strokeOpacity={0.5}
            />
            <XAxis
              dataKey="day"
              tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }}
              axisLine={false}
              tickLine={false}
              dy={10}
            />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(label) => `Day ${label}`}
                  valueFormatter={(val) => `${val} employees`}
                />
              }
            />
            <Line
              type="monotone"
              dataKey="present"
              stroke="#2563eb"
              strokeWidth={3}
              dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6, fill: '#2563eb', strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
