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

/* ---------------- TYPES ---------------- */

export type OrgPerformanceData = {
  label: "Completed" | "In Progress" | "Pending" | "Overdue";
  value: number; 
};

type Props = {
  title?: string;
  data: OrgPerformanceData[];
};


const COLORS: Record<OrgPerformanceData["label"], string> = {
  Completed: "rgb(var(--primary-rgb))",
  "In Progress": "rgb(var(--secondary-rgb))",
  Pending: "rgb(var(--muted-foreground-rgb))",
  Overdue: "rgb(var(--destructive-rgb))",
};



export default function PerformanceDonutChart({
  title = "Workload Status Overview",
  data,
}: Props) {
  const completedValue =
    data.find((d) => d.label === "Completed")?.value ?? 0;

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
            label={({ name, value }) => `${name} (${value}%)`}
          >
            {data.map((entry) => (
              <Cell
                key={entry.label}
                fill={COLORS[entry.label]}
              />
            ))}

            {/* CENTER LABEL */}
            <Label
              position="center"
              content={() => (
                <g textAnchor="middle">
                  <text
                    x="50%"
                    y="48%"
                    className="fill-primary text-2xl font-bold"
                  >
                    {completedValue}%
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
