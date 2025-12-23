// "use client"

import AttendanceChart from "@/components/employees/charts/AttendanceChart";
import StatCard from "../components/StatCard";
import PerformanceChart from "@/components/employees/charts/PerformanceChart";
import WorkingHoursChart from "@/components/employees/charts/WorkingHoursChart";
import { Bell, MailIcon, LucidePencil } from "lucide-react";
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
  visaExpiry: string;
  manager: string;
  phone: string;
  email: string;
  address: string;
};

type EmployeeStats = {
  presentDays: number;
  performance: number;
  tasksCompleted: number;
  leaveBalance: number;
};

async function getEmployeeById(id: string): Promise<Employee> {
  return {
    id: "1",
    name: "Aliana",
    department: "Finance Department",
    designation: "Accountant",
    outlet: "Ernakulam",
    joiningDate: "31/03/2025",
    employeeType: "Full Time",
    salary: "$2200",
    visaExpiry: "10/05/2025",
    manager: "Branch Manager",
    phone: "+91 9043847732",
    email: "aliana700@gmail.com",
    address: "Aluva, Muttom – Kerala",
  };
}

async function getEmployeeStats(id: string): Promise<EmployeeStats> {
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
      { day: "Sat", hours: 6 },
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
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 h-screen min-h-0 md:overflow-hidden">
      {/* LEFT PROFILE */}
      <div className="col-span-4 rounded-xl border shadow-sm bg-card p-4 sm:p-6 overflow-x-0 overflow-x-hidden min-h-0">
        <div className="w-full h-14 bg-blue-500 rounded-t-xl">

        <Image
          src="/image/profilePic.png"
          alt={`${employee.name} profile picture`}
          width={96}
          height={96}
          className="mx-auto pt-1 h-20 w-20 sm:h-24 sm:w-24 rounded-full"
          />
          </div>

        <h2 className="mt-3 text-center text-lg font-semibold">
          {employee.name}
        </h2>

        <p className="text-center text-sm text-muted-foreground">
          {employee.designation}
        </p>

        <div className="mt-4 flex justify-center gap-4">
          <button className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-primary">
            <Bell size={18} />
          </button>
          <button className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-primary">
            <MailIcon size={18} />
          </button>
          <button className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-primary">
            <LucidePencil size={18} />
          </button>
        </div>

        <div className="mt-6 border-t pt-2"></div>

        {/* DETAILS */}
        <div className=" bg-card p-1">
          <div className="mt-2 space-y-4">
            <div>
              <h4>Employee</h4>
              <div className=" bg-muted/40 p-1">
                <Info label="Employee ID" value={employee.id} />
                <Info label="Department" value={employee.department} />
                <Info label="Designation" value={employee.designation} />
              </div>
            </div>

            <div>
              <h4>Job Details</h4>
              <div className=" bg-muted p-1">
                <Info label="Outlet Allocation" value={employee.outlet} />
                <Info label="Date of Joining" value={employee.joiningDate} />
                <Info label="Employee Type" value={employee.employeeType} />
                <Info label="Salary" value={employee.salary} />
                <Info label="Visa Expiry Date" value={employee.visaExpiry} />
                <Info label="Reporting Manager" value={employee.manager} />
              </div>
            </div>

            <div>
              <h4>Contact</h4>
              <div className=" bg-muted/40 p-1">
                <Info label="Mobile Number" value={employee.phone} />
                <Info label="Email" value={employee.email} />
                <Info label="Address" value={employee.address} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT DASHBOARD */}
      <div className="lg:col-span-8 xl:col-span-8 space-y-6 min-h-screen">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatC ard title="Present Days" value={stats.presentDays} />
          <StatCard title="Performance Trend" value={`${stats.performance}%`} />
          <StatCard title="Tasks Completed" value={`${stats.tasksCompleted}%`} />
          <StatCard title="Leave Balance" value={stats.leaveBalance} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div >
            <AttendanceChart data={charts.attendance} />
          </div>
          <div >
            <PerformanceChart data={charts.performance} />
          </div>
        </div>

        <div >
          <WorkingHoursChart data={charts.workingHours} />
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-[140px_1fr] gap-3 py-1 ">
      <span className="text-xs font-medium uppercase text-primary">
        {label}
      </span>
      <span className="text-sm font-semibold break-words">
        {value}
      </span>
    </div>
  );
}
