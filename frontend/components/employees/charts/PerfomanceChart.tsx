"use client";

import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
} from "recharts";
import { PerformancePoint } from "./data";

type Props = {
    data: PerformancePoint[];
};

export default function PerformanceChart({ data }: Props) {
    const COLORS = [
        "rgb(var(--primary-rgb))",
  "rgb(var(--muted-rgb))",

    ];

    const score = data[0]?.value ?? 0;

    return (
        <div className="bg-card border border-border rounded-xl p-4 h-64 flex flex-col">
            <h3 className="font-medium mb-2 text-foreground">
                Performance Score
            </h3>

            <div className="flex-1 relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                        stroke="none"
                            data={data}
                            dataKey="value"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={4}
                        >
                            {data.map((_, index) => (
                                <Cell key={index} fill={COLORS[index]} />
                            ))}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-sm text-muted-foreground">Score</p>
                    <p className="text-2xl font-semibold text-foreground">
                        {score}
                    </p>
                </div>
            </div>

            <div className="text-sm mt-2">
                Task Completion:{" "}
                <span className="font-medium text-foreground">
                    {score}%
                </span>
            </div>
        </div>
    );
}