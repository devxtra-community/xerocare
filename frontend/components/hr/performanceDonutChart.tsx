"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  Label,
} from "recharts";


export type PerformanceData = {
  label: string;
  value: number;
};


type Props = {
  title?: string;
  data: PerformanceData[];
};

const COLORS = [
  "rgb(var(--primary-rgb))",
  "rgb(var(--muted-foreground-rgb))",
];

export default function PerformanceDonutChart({
  title = "Overall Performance",
  data,
}: Props) {
  const completed = data.find(d => d.label === "Completed")?.value ?? 0;

  return (
    <div className="rounded-xl border bg-card p-4 h-[280px]">
      <h3 className="font-medium mb-4">{title}</h3>

      <ResponsiveContainer width="100%" height="90%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius={60}
            outerRadius={90}
            stroke="none"
          >
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}

            
            <Label
              position="center"
              content={() => (
                <g textAnchor="middle">
                  <text
                    x="50%"
                    y="50%"
                    className="fill-primary text-2xl font-bold"
                  >
                    {completed}%
                  </text>
                  <text
                    x="50%"
                    y="58%"
                    className="fill-muted-foreground text-xs"
                  >
                    Completed
                  </text>
                </g>
              )}
            />
          </Pie>

          <Tooltip formatter={(value) => `${value}%`} />
          <Legend verticalAlign="bottom" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
