import StatCard from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { dailyAttendance } from "@/lib/hr";

export default function DailyAttendancePage() {
  return (
    <div className="space-y-6 px-2 sm:px-4 md:px-6">
      <h1 className="text-xl font-semibold">Daily Attendance</h1>

      {/* KPI SUMMARY */}
      <h2 className="text-lg font-medium">Attendance Summary</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard title="Present" value="18" />
        <StatCard title="Late" value="4" />
        <StatCard title="Absent" value="2" />
        <StatCard title="On Leave" value="1" />
      </div>

      {/* FILTER BAR */}
      <h2 className="text-lg font-medium">Filters</h2>
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <input type="date" className="border bg-white rounded-md px-2 py-1 text-sm" />
          <select className="border bg-white rounded-md px-2 py-1 text-sm">
            <option>All Departments</option>
            <option>HR</option>
            <option>Finance</option>
            <option>Sales</option>
          </select>
        </div>

        <Button variant="outline">Export CSV</Button>
      </div>

      {/* ATTENDANCE TABLE */}
      <h2 className="text-lg font-medium">Attendance Log</h2>
      <div className="rounded-xl border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-white ">
            <tr className="text-left text-primary">
              <th className="p-3 ">Employee</th>
              <th className="p-3 hidden md:table-cell ">Department</th>
              <th className="p-3">Status</th>
              <th className="p-3 hidden lg:table-cell">Check In</th>
              <th className="p-3 hidden lg:table-cell">Check Out</th>
            </tr>
          </thead>
          <tbody>
            {dailyAttendance.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="p-3">{row.name}</td>
                <td className="p-3 hidden md:table-cell">{row.department}</td>
                <td className="p-3">
                  <StatusBadge status={row.status} />
                </td>
                <td className="p-3 hidden lg:table-cell">
                  {row.checkIn || "-"}
                </td>
                <td className="p-3 hidden lg:table-cell">
                  {row.checkOut || "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- STATUS BADGE ---------------- */

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "Present"
      ? "bg-green-100 text-green-700"
      : status === "Late"
      ? "bg-yellow-100 text-yellow-700"
      : status === "Absent"
      ? "bg-red-100 text-red-700"
      : "bg-blue-100 text-blue-700";

  return (
    <span className={`px-2 py-1 rounded-md text-xs font-medium ${color}`}>
      {status}
    </span>
  );
}
