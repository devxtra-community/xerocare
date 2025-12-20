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

export default function AttendanceChart({ data }: Props) {
    return (
        <div className="bg-card border border-border rounded-xl p-4 sm:p-5 lg:p-6 h-65 md:h-75 lg:h-85 w-full">
            <h3 className= "font-medium mb-4 text-foreground">
                Present Days per Month
            </h3>

            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <XAxis dataKey="month" tickMargin={8}/>
                    <YAxis tickMargin={8}/>
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
