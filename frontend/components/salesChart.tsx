"use client"

import { useState, useEffect } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts"

const data = [
  { day: "18", sales: 30000 },
  { day: "20", sales: 45000 },
  { day: "22", sales: 70000 },
  { day: "24", sales: 55000 },
  { day: "26", sales: 25000 },
  { day: "28", sales: 50000 },
  { day: "30", sales: 60000 },
]

export default function SalesChart() {
  const [selectedPeriod, setSelectedPeriod] = useState("1M")
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  return (
    <div className="rounded-2xl bg-white h-[350px] w-full shadow-sm flex flex-col p-4">
      <div className="flex flex-row items-center justify-between pb-2">
        <p className="text-sm text-gray-600">Last 30 days</p>

        <div className="flex gap-2 text-xs">
          {["1W", "1M", "3M", "1Y"].map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-3 py-1 rounded-md transition-colors ${
                selectedPeriod === period
                  ? "bg-blue-900 text-white font-medium"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 w-full">
        {isClient && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, left: 0, right: 10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1d4ed8" stopOpacity={0.7} />
                  <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.05} />
                </linearGradient>
              </defs>

              <CartesianGrid
                vertical={false}
                strokeDasharray="3 3"
                strokeOpacity={0.3}
              />

              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tickMargin={8}
                tick={{ fill: "#6b7280", fontSize: 12 }}
              />

              <YAxis
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v / 1000}k`}
                tickMargin={8}
                domain={[0, 100000]}
                ticks={[0, 20000, 40000, 60000, 80000, 100000]}
                tick={{ fill: "#6b7280", fontSize: 12 }}
              />

              <Area
                type="monotone"
                dataKey="sales"
                stroke="#1d4ed8"
                strokeWidth={2}
                fill="url(#salesGradient)"
                dot={false}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
