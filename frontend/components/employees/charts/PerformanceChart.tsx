    "use client";

    import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
    import { PerformancePoint } from "./data";

    type Props = {
    data: PerformancePoint[];
    title?: string;
    centerLabel?: string;
    };



    export default function PerformanceChart({ data, title,centerLabel }: Props) {
    const COLORS = ["rgb(var(--primary-rgb))", "rgb(var(--muted-rgb))"];

    const completed = data.find((d) => d.name === "Task Completed")?.value ?? 0;
    const remaining = data.find((d) => d.name === "Remaining")?.value ?? 0;

    return (
        <div className="bg-card border shadow-sm rounded-xl w-full p-4 h-70 flex flex-col">
        <h3 className="font-medium mb-2 text-foreground">
            {title ?? "Performance Score"}
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
            <p className="text-sm text-foreground">{centerLabel ?? "Completed"}</p>
            <p className="text-2xl md:text-lg font-semibold text-foreground">{completed}%</p>
            </div>
        </div>
        <div className="w-auto h-12">
            <div className="text-sm mt-2 ">
            Task Completion:{" "}
            <span className="font-medium text-foreground">{completed}%</span>
            </div>
            <div className="text-sm mt-2">
            Task Remaining:{" "}
            <span className="font-medium text-foreground">{remaining}%</span>
            </div>
        </div>
        </div>
    );
    }
