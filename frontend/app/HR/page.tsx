"use client";

import AttendanceTrendChart from "@/components/hr/attendenceTrendChart";
import PerformanceDonutChart from "@/components/hr/performanceDonutChart";
import StatCard from "@/components/StatCard";
import UserTable from "@/components/UserTable";
import { EmployeeFilters, employees, orgWorkloadData } from "@/lib/hr";
import { useMemo, useState } from "react";


export default function HROverviewPage() {
  const [filters, setFilters] = useState<EmployeeFilters>({
    department: "All",
    employmentType: "All",
    status: "All",
  });
  
  const applySingleFilter = (key: keyof EmployeeFilters, value: string) => {
    setFilters({
      department: key === "department" ? value : "All",
      employmentType: key === "employmentType" ? value : "All",
      status: key === "status" ? value : "All",
    });
  };
  /* ---------------- FILTER LOGIC ---------------- */
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (
        filters.department !== "All" &&
        emp.department !== filters.department
      ) {
        return false;
      }

      if (
        filters.employmentType !== "All" &&
        emp.employmentType !== filters.employmentType
      ) {
        return false;
      }

      if (filters.status !== "All" && emp.status !== filters.status) {
        return false;
      }

      return true;
    });
  }, [filters]);

  return (
    <div className="space-y-8 px-2 sm:px-4 md:px-6 pb-5 ">
      {/* PAGE TITLE */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Human Resources</h1>
      </div>

      {/* OVERVIEW */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard title="Total Employees" value="126" />
          <StatCard title="Present Today" value="112" />
          <StatCard title="On Leave" value="8" />
          <StatCard title="Pending Requests" value="6" />
        </div>
      </section>

      {/* WORKFORCE OVERVIEW */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Workforce Overview</h2>

        {/* FILTER BAR */}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          {/* Department */}
          <select
            value={filters.department}
            onChange={(e) => applySingleFilter("department", e.target.value)}
            className="rounded-md border px-2 py-1 text-sm"
          >
            <option value="All">All Departments</option>
            <option value="HR">HR</option>
            <option value="Finance">Finance</option>
          </select>

          {/* Employment Type */}
          <select
            value={filters.employmentType}
            onChange={(e) =>
              applySingleFilter("employmentType", e.target.value)
            }
            className="rounded-md border px-2 py-1 text-sm"
          >
            <option value="All">All Employment Types</option>
            <option value="Full-time">Full-time</option>
            <option value="Part-time">Part-time</option>
            <option value="Contract">Contract</option>
          </select>

          {/* Status */}
          <select
            value={filters.status}
            onChange={(e) => applySingleFilter("status", e.target.value)}
            className="rounded-md border px-2 py-1 text-sm"
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="On Leave">On Leave</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
        {/* TABLE */}
        <UserTable users={filteredEmployees} />
      </section>

      {/* ANALYTICS */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Analytics</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AttendanceTrendChart />
          <PerformanceDonutChart
            data={orgWorkloadData}
          />
        </div>
      </section>
    </div>
  );
}
