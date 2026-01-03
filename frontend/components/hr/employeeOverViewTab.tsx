"use client";

import Image from "next/image";
import { Bell, MailIcon, LucidePencil } from "lucide-react";
import StatCard from "../StatCard";
import EmployeeAttendanceTrend from "./employees/employeeAttendenceTrend";
import EmployeeTaskStatusChart from "./employees/employeeTaskStatusChart";
import WorkingHoursChart from "./employees/WorkingHoursChart";



/* ---------------- TYPES ---------------- */

export type Employee = {
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

type Props = {
  employee: Employee;
  stats: {
    presentDays: number;
    performance: number;
    tasksCompleted: number;
    leaveBalance: number;
  };
  attendance: { month: string; daysPresent: number }[];
  taskStatus: {
    label: "Completed" | "Pending" | "Overdue";
    value: number;
  }[];
  workingHours: { day: string; hours: number }[];
};



/* ---------------- COMPONENT ---------------- */

export default function OverviewTab({ employee, stats, attendance,taskStatus,workingHours }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

      {/* LEFT PROFILE */}
      <aside className="lg:col-span-4 xl:col-span-3">
        <div className="border border-border bg-card rounded-xl p-6">

          <Image
            src="/image/profilePic.png"
            alt={employee.name}
            width={96}
            height={96}
            className="mx-auto rounded-full"
          />

          <h2 className="mt-3 text-center text-lg font-semibold">
            {employee.name}
          </h2>

          <p className="text-center text-sm text-muted-foreground">
            {employee.designation}
          </p>

          <div className="mt-4 flex justify-center gap-4">
            <IconButton><Bell size={18} /></IconButton>
            <IconButton><MailIcon size={18} /></IconButton>
            <IconButton><LucidePencil size={18} /></IconButton>
          </div>

          <div className="mt-6 space-y-6">
            <ProfileSection title="Employee">
              <Info label="Employee ID" value={employee.id} />
              <Info label="Department" value={employee.department} />
              <Info label="Designation" value={employee.designation} />
            </ProfileSection>

            <ProfileSection title="Job Details">
              <Info label="Outlet" value={employee.outlet} />
              <Info label="Joining Date" value={employee.joiningDate} />
              <Info label="Employee Type" value={employee.employeeType} />
              <Info label="Salary" value={employee.salary} />
              <Info label="Visa Expiry" value={employee.visaExpiry} />
              <Info label="Manager" value={employee.manager} />
            </ProfileSection>

            <ProfileSection title="Contact">
              <Info label="Phone" value={employee.phone} />
              <Info label="Email" value={employee.email} />
              <Info label="Address" value={employee.address} />
            </ProfileSection>
          </div>
        </div>
      </aside>

      {/* RIGHT DASHBOARD */}
      <section className="lg:col-span-8 xl:col-span-9 space-y-6">

        {/* STAT CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Present Days" value={`${stats.presentDays}`} />
          <StatCard title="Performance" value={`${stats.performance}%`} />
          <StatCard title="Tasks Completed" value={`${stats.tasksCompleted}`} />
          <StatCard title="Leave Balance" value={`${stats.leaveBalance}`} />
        </div>

        {/* CHARTS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <EmployeeAttendanceTrend data={attendance}/>
          <EmployeeTaskStatusChart data={taskStatus}/>
        </div>

        <WorkingHoursChart data={workingHours} />
      </section>
    </div>
  );
}

/* ---------------- SMALL UI ---------------- */

function IconButton({ children }: { children: React.ReactNode }) {
  return (
    <button className="h-10 w-10 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-primary">
      {children}
    </button>
  );
}

function ProfileSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold">{title}</h4>
      <div className="rounded-xl bg-muted/40 p-3 space-y-1">
        {children}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2 text-sm py-1">
      <span className="uppercase text-xs text-primary">{label}</span>
      <span className="font-medium break-all">{value}</span>
    </div>
  );
}
