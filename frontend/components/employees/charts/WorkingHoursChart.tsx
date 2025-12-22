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
        <div className="bg-card border shadow-sm rounded-xl p-4 sm:p-5 lg:p-6 h-65 md:h-75 lg:h-85 w-full">
            <h3 className="font-medium mb-4 text-foreground">
                Working Hours per Week
            </h3>

            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 20 }}>
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
