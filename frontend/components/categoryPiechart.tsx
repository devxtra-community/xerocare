"use client"

import { useState, useEffect } from "react"
import { PieChart, Pie, Cell } from "recharts"

const data = [
  { name: "Electronics", value: 60, color: "#FF6B35" },
  { name: "Cosmetics", value: 25, color: "#004E89" },
  { name: "Accessories", value: 15, color: "#00A8E8" },
]

export default function CategoryPieChart() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  return (
    <div className="rounded-2xl bg-white shadow-sm w-full p-6 h-[350px] flex flex-col">
      <h3 className="text-lg font-semibold text-blue-900 mb-4">
        Category
      </h3>

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
      </div>

      <div className="w-full space-y-3">
        {data.map((item) => (
          <div
            key={item.name}
            className="flex items-center justify-between text-sm"
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
            <span className="font-semibold text-gray-900">
              {item.value}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
