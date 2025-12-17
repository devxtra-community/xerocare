"use client"

import { PieChart, Pie, Cell } from "recharts"
import { useState, useEffect } from "react"

const data = [
  { name: "Employee", value: 186, color: "#003F7D", percentage: 62.5 },
  { name: "Finance", value: 75, color: "#0284C7", percentage: 25 },
  { name: "HR", value: 37, color: "#9BD0E5", percentage: 12.5 },
]

const TOTAL = 300

export default function EmployeePieChart() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  return (
    <div className="rounded-2xl bg-white shadow-sm w-full p-6 h-[400px] flex flex-col">
      <div className="relative w-[150px] h-[150px] mx-auto mb-6">
        {isClient && (
          <PieChart width={150} height={150}>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx={75}
              cy={75}
              innerRadius={44}
              outerRadius={70}
              startAngle={90}
              endAngle={-270}
              paddingAngle={3}
              stroke="#ffffff"
              strokeWidth={4}
              isAnimationActive={false}
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        )}

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="text-[10px] text-gray-500 leading-tight font-medium">
            Total Number<br />Of Employees
          </p>
          <p className="text-3xl font-bold text-gray-900 leading-none mt-1">
            {TOTAL}
          </p>
        </div>
      </div>

      <div className="w-full">
        <div className="grid grid-cols-3 text-xs font-semibold text-blue-900 border-b border-gray-200 pb-2 mb-2">
          <span>Department</span>
          <span className="text-center">
            Number Of<br />Employees
          </span>
          <span className="text-right">%</span>
        </div>

        {data.map((item) => (
          <div
            key={item.name}
            className="grid grid-cols-3 items-center py-3 text-sm"
          >
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="font-medium text-gray-900">
                {item.name}
              </span>
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
  )
}
