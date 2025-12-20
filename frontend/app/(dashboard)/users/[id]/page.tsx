import AttendanceChart from "@/components/employees/charts/AttendanceChart";
import StatCard from "../components/StatCard";
import PerformanceChart from "@/components/employees/charts/PerformanceChart";
import WorkingHoursChart from "@/components/employees/charts/WorkingHoursChart";
import Image from "next/image";

type Employee = {
  id: string;
  name: string;
  department: string;
  designation: string;
  outlet: string;
  joiningDate: string;
  employeeType: string;
  salary: string;
  contractPeriod: string;
  manager: string;
  phone: string;
  email: string;
  address: string;
};

type EmployeeStats = {
  presentDays: number;
  performance: number; // percentage
  tasksCompleted: number; // percentage
  leaveBalance: number;
};

async function getEmployeeById(id: string): Promise<Employee> {
  // 🔹 TEMP mock (replace with real API later)
  return {
    id: "1",
    name: "Aliana",
    department: "Finance Department",
    designation: "Accountant",
    outlet: "Ernakulam",
    joiningDate: "31/03/2025",
    employeeType: "Full Time",
    salary: "$2200",
    contractPeriod: "3 Years",
    manager: "Branch Manager",
    phone: "+91 9043847732",
    email: "aliana700@gmail.com",
    address: "Aluva, Muttom – Kerala",
  };
}

async function getEmployeeStats(id: string): Promise<EmployeeStats> {
  // 🔹 TEMP mock — backend will replace this
  return {
    presentDays: 223,
    performance: 75,
    tasksCompleted: 43,
    leaveBalance: 22,
  };
}

async function getEmployeeCharts(id: string) {
  return {
    attendance: [
      { month: "Jan", days: 20 },
      { month: "Feb", days: 18 },
      { month: "Mar", days: 22 },
      { month: "Apr", days: 19 },
      { month: "May", days: 23 },
      { month: "Jun", days: 21 },
    ],
    workingHours: [
      { day: "Mon", hours: 8 },
      { day: "Tue", hours: 7.5 },
      { day: "Wed", hours: 8 },
      { day: "Thu", hours: 6.5 },
      { day: "Fri", hours: 7 },
      { day: "sat", hours: 6 },
    ],
    performance: [
      { name: "Task Completed", value: 62.5 },
      { name: "Remaining", value: 37.5 },
    ],
  };
}

export default async function EmployeeProfile({
  params,
}: {
  params: { id: string };
}) {
  const employee = await getEmployeeById(params.id);
  const stats = await getEmployeeStats(params.id);
  const charts = await getEmployeeCharts(params.id);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* LEFT PROFILE */}
      <div className="lg:col-span-5 xl:col-span-4 rounded-xl border border-border bg-card p-6">
        <Image
          src="/image/profilePic.png"
          alt={`${employee.name} profile picture`}
          width={96}
          height={96}
          className="mx-auto rounded-full"
        />

        <h2 className="mt-3 text-center text-lg font-semibold">
          {employee.name}
        </h2>

        <p className="text-center text-sm text-muted-foreground">
          {employee.email}
        </p>
        <div className="mt-4 flex justify-center gap-4">
          <button className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-primary">
            🔒
          </button>
          <button className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-primary">
            ✉️
          </button>
        </div>

        <div className="lg:col-span-4 xl:col-span-3 rounded-2xl bg-card p-4 sm:p-6">
          <div className="mt-6 space-y-4">
            {/* Identity */}
            <div className="rounded-xl border border-border  p-4">
              <Info label="Employee ID" value={employee.id} />
              <Info label="Department" value={employee.department} />
              <Info label="Designation" value={employee.designation} />
            </div>

            {/* Work */}
            <div className="rounded-xl border border-border  p-4">
              <Info label="Outlet Allocation" value={employee.outlet} />
              <Info label="Date of Joining" value={employee.joiningDate} />
              <Info label="Employee Type" value={employee.employeeType} />
              <Info label="Salary" value={employee.salary} />
              <Info label="Contract Period" value={employee.contractPeriod} />
              <Info label="Reporting Manager" value={employee.manager} />
            </div>

            {/* Contact */}
            <div className="rounded-xl border border-border  p-4">
              <Info label="Mobile Number" value={employee.phone} />
              <Info label="Email" value={employee.email} />
              <Info label="Address" value={employee.address} />
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT DASHBOARD */}
      <div className="lg:col-span-7 xl:col-span-8 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 gap-4">
          <StatCard title="Present Days" value={stats.presentDays} />
          <StatCard title="Performance Trend" value={`${stats.performance}%`} />
          <StatCard
            title="Tasks Completed"
            value={`${stats.tasksCompleted}%`}
          />
          <StatCard title="Leave Balance" value={stats.leaveBalance} />
        </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <AttendanceChart data={charts.attendance} />
              <PerformanceChart data={charts.performance} />
            </div>
          
        <div className="p-4 rounded-xl border border-border bg-card">
          <WorkingHoursChart data={charts.workingHours} />
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border pb-2 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-xs font-medium uppercase text-primary">
        {label}
      </span>

      <span className="text-sm font-semibold text-foreground sm:text-right break-words">
        {value}
      </span>
    </div>
  );
}
