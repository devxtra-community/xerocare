import StatCard from "@/components/StatCard";
import { getEmployeeAttendance } from "@/lib/attendanceUtils";
import { attendanceRecords, Employee, leaveRecords, UserListItem } from "@/lib/hr";
import { getEmployeeLeaves } from "@/lib/leaveUtils";

export type Tab = "overview" | "attendance" | "leave" | "documents";

export function EmployeeTabs({
  active,
  onChange,
}: {
  active: Tab;
  onChange: (t: Tab) => void;
}) {
  const tabs: { label: string; value: Tab }[] = [
    { label: "Overview", value: "overview" },
    { label: "Attendance", value: "attendance" },
    { label: "Leave", value: "leave" },
    { label: "Documents", value: "documents" },
  ];

  return (
    <div className="border-b overflow-x-auto">
      <div className="flex gap-6 min-w-max">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={`pb-2 text-sm font-medium whitespace-nowrap ${
              active === tab.value
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function OverviewTab({ employee }: { employee: UserListItem }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard title="Department" value={employee.department} />
      <StatCard title="Branch" value={employee.branch} />
      <StatCard title="Joined On" value={employee.visaExpiryDate} />
      <StatCard title="Status" value="Active" />
    </div>
  );
}

export function AttendanceTab({ employeeId }: { employeeId: string }) {
  const { data, summary } = getEmployeeAttendance(
    employeeId,
    attendanceRecords
  );

  return (
    <div className="space-y-6">
      {/* SUMMARY */}
      <h2 className="text-lg font-medium">Attendance Summary</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard title="Present" value={summary.present.toString()} />
        <StatCard title="Absent" value={summary.absent.toString()} />
        <StatCard title="Late" value={summary.late.toString()} />
        <StatCard title="Leave" value={summary.leave.toString()} />
      </div>

      {/* DAILY LOG */}
      <h2 className="text-lg font-medium">Attendance History</h2>
      <div className="rounded-xl border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-white">
            <tr className="text-left text-primary">
              <th className="p-3">Date</th>
              <th className="p-3">Status</th>
              <th className="p-3 hidden md:table-cell">Check In</th>
              <th className="p-3 hidden md:table-cell">Check Out</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-t">
                <td className="p-3">{row.date}</td>
                <td className="p-3">{row.status}</td>
                <td className="p-3 hidden md:table-cell">
                  {row.checkIn ?? "-"}
                </td>
                <td className="p-3 hidden md:table-cell">
                  {row.checkOut ?? "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {data.length === 0 && (
          <div className="p-4 text-muted-foreground">
            No attendance records found.
          </div>
        )}
      </div>
    </div>
  );
}

export function LeaveTab({ employeeId }: { employeeId: string }) {
  const { data, balance } = getEmployeeLeaves(employeeId, leaveRecords);

  return (
    <div className="space-y-6">
      {/* LEAVE BALANCE */}
      <h2 className="text-lg font-medium">Leave Balance</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard title="Casual Leave" value={`${balance.Casual} days`} />
        <StatCard title="Sick Leave" value={`${balance.Sick} days`} />
        <StatCard title="Paid Leave" value={`${balance.Paid} days`} />
      </div>

      {/* LEAVE HISTORY */}
      <h2 className="text-lg font-medium">Leave History</h2>
      <div className="rounded-xl border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-white">
            <tr className="text-left text-primary">
              <th className="p-3">Type</th>
              <th className="p-3">From</th>
              <th className="p-3">To</th>
              <th className="p-3">Days</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map((leave, i) => (
              <tr key={i} className="border-t">
                <td className="p-3">{leave.type}</td>
                <td className="p-3">{leave.from}</td>
                <td className="p-3">{leave.to}</td>
                <td className="p-3">{leave.days}</td>
                <td className="p-3">
                  <LeaveStatusBadge status={leave.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {data.length === 0 && (
          <div className="p-4 text-muted-foreground">
            No leave records found.
          </div>
        )}
      </div>
    </div>
  );
}

export function DocumentsTab() {
  return (
    <div className="rounded-xl border bg-card p-6 text-muted-foreground">
      <h2 className="text-lg font-medium">Employee Documents</h2>
      Employee documents (ID, contract, visa) will be shown here.
    </div>
  );
}

function LeaveStatusBadge({ status }: { status: string }) {
  const color =
    status === "Approved"
      ? "bg-green-100 text-green-700"
      : status === "Pending"
      ? "bg-yellow-100 text-yellow-700"
      : "bg-red-100 text-red-700";

  return (
    <span className={`px-2 py-1 rounded-md text-xs font-medium ${color}`}>
      {status}
    </span>
  );
}
