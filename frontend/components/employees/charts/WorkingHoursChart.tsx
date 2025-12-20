"use client";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { WorkingHoursPoint } from "./data";

type Props = {
    data: WorkingHoursPoint[];
};

export default function WorkingHoursChart({ data }: Props) {
    return (
        <div className="bg-card border border-border rounded-xl p-4 h-64">
            <h3 className="font-medium mb-2 text-foreground">
                Working Hours per Week
            </h3>

            <ResponsiveContainer width="70%" height="100%">
                <BarChart data={data}>
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Bar
                        dataKey="hours"
                        fill="rgb(var(--primary-rgb))"
                        radius={[6, 6, 0, 0]}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
