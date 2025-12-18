"use client";

import { PieChart, Pie, Cell } from "recharts";
import { useState, useEffect } from "react";

const data = [
  { name: "Employee", value: 186, color: "#003F7D", percentage: 62.5 },
  { name: "Finance", value: 75, color: "#0284C7", percentage: 25 },
  { name: "HR", value: 37, color: "#9BD0E5", percentage: 12.5 },
];

const TOTAL = 300;

export default function EmployeePieChart() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div className="rounded-2xl bg-white shadow-sm w-full p-4 h-[280px] flex flex-col">
      <div className="relative w-[100px] h-[100px] mx-auto mb-2">
        {isClient && (
          <PieChart width={100} height={100}>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx={50}
              cy={50}
              innerRadius={30}
              outerRadius={47}
              startAngle={90}
              endAngle={-270}
              paddingAngle={3}
              stroke="#ffffff"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        )}

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="text-[8px] text-gray-500 leading-tight font-medium">
            Total Number
            <br />
            Of Employees
          </p>
          <p className="text-xl font-bold text-gray-900 leading-none mt-0.5">
            {TOTAL}
          </p>
        </div>
      </div>

      <div className="w-full flex-1 overflow-hidden">
        <div className="grid grid-cols-3 text-[10px] font-semibold text-blue-900 border-b border-gray-200 pb-1.5 mb-1.5">
          <span>Department</span>
          <span className="text-center">
            Number Of
            <br />
            Employees
          </span>
          <span className="text-right">%</span>
        </div>

        {data.map((item) => (
          <div
            key={item.name}
            className="grid grid-cols-3 items-center py-1.5 text-xs"
          >
            <div className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="font-medium text-gray-900">{item.name}</span>
            </div>
            <span className="text-center font-semibold text-gray-900">
              {item.value}
            </span>
            <span className="text-right font-semibold text-gray-900">
              {item.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
