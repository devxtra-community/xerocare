import AttendanceTrendChart from "@/components/hr/attendenceTrendChart";
import PerformanceDonutChart from "@/components/hr/performanceDonutChart";
import StatCard from "@/components/StatCard";
import AddEmployeeDialog from "@/components/hr/AddEmployeeDialog";
import UserTable, { UserListItem } from "@/components/UserTable";

/* ---------------- MOCK DATA (API READY) ---------------- */

const employees: UserListItem[] = [
  {
    id: "1",
    name: "Aisha Rahman",
    department: "HR",
    branch: "Kochi",
    employmentType: "Full-time",
    status: "Active",
    startDate: "2023-02-19",
    visaExpiryDate: "2026-02-19",
    salary: 3000,
  },
  {
    id: "2",
    name: "Mark Lue",
    department: "Finance",
    branch: "Ernakulam",
    employmentType: "Contract",
    status: "On Leave",
    startDate: "2022-05-10",
    visaExpiryDate: "2025-05-10",
    salary: 2500,
  },
  {
    id: "3",
    name: "Aisha Rahman",
    department: "HR",
    branch: "Kochi",
    employmentType: "Part-time",
    status: "Inactive",
    startDate: "2023-02-19",
    visaExpiryDate: "2026-02-19",
    salary: 6000,
  },
  {
    id: "4",
    name: "Mark Lue",
    department: "Finance",
    branch: "Ernakulam",
    employmentType: "Contract",
    status: "On Leave",
    startDate: "2022-05-10",
    visaExpiryDate: "2025-05-10",
    salary: 3500,
  },
];

export default function HROverviewPage() {
  return (
    <div className="space-y-8 px-2 pt-1 sm:px-4 md:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl sm:text-3xl font-serif">Human Resources</h1>
        <AddEmployeeDialog />
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard title="Total Employees" value="126" />
          <StatCard title="Present Today" value="112" />
          <StatCard title="On Leave" value="8" />
          <StatCard title="Pending Requests" value="6" />
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Workforce Overview</h2>
        <UserTable users={employees} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Analytics</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AttendanceTrendChart />
          <PerformanceDonutChart
            data={[
              { label: "Completed", value: 72 },
              { label: "Remaining", value: 28 },
            ]}
          />
        </div>
      </section>
    </div>
  );
}
