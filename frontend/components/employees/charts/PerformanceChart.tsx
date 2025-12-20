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

    const completed =
        data.find(d => d.name === "Task Completed")?.value ?? 0;
    const remaining =
        data.find(d => d.name === "Remaining")?.value ?? 0;

    return (
        <div className="bg-card border border-border rounded-xl p-5 h-64 flex flex-col">
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
                            innerRadius={45}
                            outerRadius={70}
                            paddingAngle={7}
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
                        {completed}
                    </p>
                </div>
            </div>
            <div className="w-auto h-10">
                <div className="text-sm mt-2 ">
                    Task Completion:{" "}
                    <span className="font-medium text-foreground">
                        {completed}%
                    </span>
                </div>
                <div className="text-sm mt-2">
                    Task Remaining:{" "}
                    <span className="font-medium text-foreground">
                        {remaining}%
                    </span>
                </div>
            </div>
        </div>
    );
}
