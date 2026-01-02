"use client";

import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { AttendancePoint } from "./data";

type Props = {
    data: AttendancePoint[];
};

export default function AttendanceChart1({ data }: Props) {
    return (
        <div className="bg-card border border-border rounded-xl p-6 h-64">
            <h3 className="font-medium mb-2 text-foreground">
                Present Days per Month
            </h3>

            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Area
                        type="monotone"
                        dataKey="days"
                        stroke="rgb(var(--primary-rgb))"
                        fill="rgb(var(--primary-light-rgb))"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
