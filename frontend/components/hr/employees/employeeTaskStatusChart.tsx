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

export type EmployeeTaskStatus = {
  label: "Completed" | "Pending" | "Overdue";
  value: number;
};

type Props = {
  data: EmployeeTaskStatus[];
};

/* ---------------- COLORS ---------------- */

const COLORS: Record<EmployeeTaskStatus["label"], string> = {
  Completed: "rgb(var(--primary-rgb))",
  Pending: "rgb(var(--muted-foreground-rgb))",
  Overdue: "#FF6B35",
};

/* ---------------- TOOLTIP ---------------- */

function TaskTooltip({
  active,
  payload,
}: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;

  const d = payload[0].payload as EmployeeTaskStatus;

  return (
    <div className="rounded-md border bg-card px-3 py-2 shadow-sm">
      <p className="text-sm font-medium">{d.label}</p>
      <p className="text-xs text-muted-foreground">
        {d.value} Tasks
      </p>
    </div>
  );
}

/* ---------------- COMPONENT ---------------- */

export default function EmployeeTaskStatusChart({ data }: Props) {
  const completed = data.find(d => d.label === "Completed")?.value ?? 0;
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="rounded-xl border bg-card p-4">
      <h3 className="font-medium mb-3">Task Status Breakdown</h3>

      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius={55}
              outerRadius={85}
              stroke="none"
            >
              {data.map(d => (
                <Cell key={d.label} fill={COLORS[d.label]} />
              ))}

              <Label
                position="center"
                content={() => (
                  <g textAnchor="middle">
                    <text x="50%" y="48%" className="fill-primary text-xl font-bold">
                      {completed}/{total}
                    </text>
                    <text x="50%" y="58%" className="fill-muted-foreground text-xs">
                      Completed
                    </text>
                  </g>
                )}
              />
            </Pie>

            <Tooltip content={<TaskTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
