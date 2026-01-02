import StatCard from "@/components/StatCard";

import Link from "next/link";
import { employees } from "@/lib/hr";
import AttendanceTrendChart from "@/components/hr/attendenceTrendChart";
import LateEarlyChart from "@/components/hr/lateEarlyChart";

export default function AttendancePage() {
  return (
    <div className="space-y-6 px-2 sm:px-4 md:px-6">
      <h1 className="text-xl font-semibold">Attendance Management</h1>

      {/* KPIs */}
        <h2 className="text-lg font-medium">Overview</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

        <StatCard title="Avg Attendance" value="86%" />
        <StatCard title="Late Entries" value="14" />
        <StatCard title="Early Exits" value="9" />
        <StatCard title="Absentees Today" value="3" />
      </div>

      {/* Charts */}
        <h2 className="text-lg font-medium">Attendance Trends</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <AttendanceTrendChart />
        <LateEarlyChart />
      </div>

      {/* Employee Attendance Access */}
        <h2 className="font-medium mb-3">Employee Attendance</h2>
      <div className="rounded-xl border bg-card p-4">

        <ul className="space-y-2 text-sm">
          {employees.map(emp => (
            <li key={emp.id}>
              <Link
                href={`/hr/attendance/${emp.id}`}
                className="text-primary hover:underline"
              >
                {emp.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
