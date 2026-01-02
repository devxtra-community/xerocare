"use client";

import { useState } from "react";
import StatCard from "@/components/StatCard";
import AttendanceChart from "@/components/employees/charts/AttandenceChart";
import PerformanceChart from "@/components/employees/charts/PerfomanceChart";

/* ---------------- TYPES ---------------- */

type TabKey = "overview" | "attendance" | "leave" | "documents";

type Employee = {
  id: string;
  name: string;
  department: string;
  designation: string;
  branch: string;
  joiningDate: string;
  email: string;
  phone: string;
};

/* ---------------- MOCK DATA ---------------- */

const employee: Employee = {
  id: "1",
  name: "Aisha Rahman",
  department: "HR",
  designation: "HR Executive",
  branch: "Bangalore",
  joiningDate: "11.01.2022",
  email: "aisha.rahman@company.com",
  phone: "+91 98765 43210",
};

const attendanceData = [
  { month: "Jan", attendancePercentage: 90 },
  { month: "Feb", attendancePercentage: 85 },
  { month: "Mar", attendancePercentage: 92 },
];

const performanceData = [
  { name: "Completed", value: 88 },
  { name: "Remaining", value: 12 },
];

/* ---------------- PAGE ---------------- */

export default function EmployeeProfilePage() {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  return (
    <div className="space-y-6 px-2 sm:px-6">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold">
          {employee.name}
        </h1>
        <p className="text-muted-foreground">
          {employee.designation} · {employee.department}
        </p>
      </div>

      {/* TABS */}
      <div className="flex gap-4 border-b">
        <Tab label="Overview" value="overview" active={activeTab} onChange={setActiveTab} />
        <Tab label="Attendance" value="attendance" active={activeTab} onChange={setActiveTab} />
        <Tab label="Leave" value="leave" active={activeTab} onChange={setActiveTab} />
        <Tab label="Documents" value="documents" active={activeTab} onChange={setActiveTab} />
      </div>

      {/* TAB CONTENT */}
      {activeTab === "overview" && <OverviewTab />}
      {activeTab === "attendance" && <AttendanceTab />}
      {activeTab === "leave" && <LeaveTab />}
      {activeTab === "documents" && <DocumentsTab />}
    </div>
  );
}

/* ---------------- TAB COMPONENTS ---------------- */

function OverviewTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Department" value={employee.department} />
        <StatCard title="Branch" value={employee.branch} />
        <StatCard title="Joined On" value={employee.joiningDate} />
        <StatCard title="Employee ID" value={employee.id} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PerformanceChart
          title="Performance"
          centerLabel="Completed"
          data={performanceData}
        />

        <AttendanceChart
          title="Attendance (%)"
          data={attendanceData}
          dataKey="attendancePercentage"
          yAxisDomain={[0, 100]}
        />
      </div>
    </div>
  );
}

function AttendanceTab() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Attendance Summary</h2>
      <AttendanceChart
        title="Monthly Attendance"
        data={attendanceData}
        dataKey="attendancePercentage"
        yAxisDomain={[0, 100]}
      />
    </div>
  );
}

function LeaveTab() {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-muted-foreground">
        Leave history and approvals will appear here.
      </p>
    </div>
  );
}

function DocumentsTab() {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-muted-foreground">
        Employee documents (ID, contract, visa) will appear here.
      </p>
    </div>
  );
}

/* ---------------- TAB BUTTON ---------------- */

function Tab({
  label,
  value,
  active,
  onChange,
}: {
  label: string;
  value: TabKey;
  active: TabKey;
  onChange: (v: TabKey) => void;
}) {
  const isActive = active === value;

  return (
    <button
      onClick={() => onChange(value)}
      className={`pb-2 text-sm font-medium ${
        isActive
          ? "border-b-2 border-primary text-primary"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}
