"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Label,
} from "recharts";

import type { TooltipProps } from "recharts";
/* ---------------- TYPES ---------------- */

export type OrgPerformanceData = {
  label: "Completed" | "In Progress" | "Pending" | "Overdue";
  value: number;
};

type Props = {
  title?: string;
  data: OrgPerformanceData[];
};

/* ---------------- COLORS ---------------- */

const COLORS: Record<OrgPerformanceData["label"], string> = {
  Completed: "rgb(var(--primary-rgb))",
  "In Progress": "#00A8E8",
  Pending: "rgb(var(--primary-light-rgb))",
  Overdue: "#FF6B35",
};

/* ---------------- CUSTOM TOOLTIP ---------------- */


function PerformanceTooltip({
  active,
  payload,
}: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload as OrgPerformanceData;

  return (
    <div className="rounded-md border bg-card px-3 py-2 shadow-sm">
      <p className="text-sm font-medium">{data.label}</p>
      <p className="text-xs text-muted-foreground">
        {data.value}%
      </p>
    </div>
  );
}


/* ---------------- COMPONENT ---------------- */

export default function PerformanceDonutChart({
  title = "Workload Status Overview",
  data,
}: Props) {
  const completedValue =
    data.find((d) => d.label === "Completed")?.value ?? 0;

  return (
    <div className="rounded-xl border bg-card p-3 ">
      <h3 className="font-medium mb-4">{title}</h3>
<div className="h-[220px]">

      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius={50}
            outerRadius={80}
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

          {/* CUSTOM TOOLTIP */}
          <Tooltip content={<PerformanceTooltip />} />

        </PieChart>
      </ResponsiveContainer>
              </div>
    </div>
  );
}
