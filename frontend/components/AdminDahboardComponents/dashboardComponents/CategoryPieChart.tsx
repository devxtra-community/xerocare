'use client';

import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell } from 'recharts';

const data = [
  { name: 'Electronics', value: 60, color: '#FF6B35' },
  { name: 'Cosmetics', value: 25, color: '#004E89' },
  { name: 'Accessories', value: 15, color: '#00A8E8' },
];

export default function CategoryPieChart() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div className="rounded-2xl bg-white shadow-sm w-full p-4 h-[260px] flex flex-col">
      <h3 className="text-base font-semibold text-primary mb-3">Category</h3>

      <div className="relative w-[120px] h-[120px] mx-auto mb-4">
        {isClient && (
          <PieChart width={120} height={120}>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx={60}
              cy={60}
              innerRadius={35}
              outerRadius={56}
              startAngle={90}
              endAngle={-270}
              paddingAngle={3}
              stroke="#ffffff"
              strokeWidth={3}
              isAnimationActive={false}
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        )}
      </div>

      <div className="w-full space-y-2">
        {data.map((item) => (
          <div key={item.name} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="font-medium text-gray-900">{item.name}</span>
            </div>
            <span className="font-semibold text-gray-900">{item.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
