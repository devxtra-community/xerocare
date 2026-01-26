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
  TooltipProps,
} from 'recharts';

interface AttendanceData {
  day: string;
  present: number;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 rounded-xl shadow-lg border border-blue-100">
        <p className="font-bold text-[#2563eb] text-[10px] mb-2 uppercase tracking-widest border-b border-blue-50 pb-1">
          Day {label}
        </p>
        <div className="space-y-1">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-tighter">
            Present: <span className="text-[#2563eb] ml-1">{payload[0].value} employees</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

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
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-100/50 flex flex-col h-[300px] w-full">
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
            <Tooltip content={<CustomTooltip />} />
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
