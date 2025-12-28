"use client";
import AttendanceOverview from "@/components/hr/AttendanceOverview";
import AttritionJoinersChart from "@/components/hr/AttritionJoinersChart";
import RecentEmployeesTable from "@/components/hr/RecentEmployeesTable";
import DepartmentSummaryTable from "@/components/hr/DepartmentSummaryTable";

export default function HrDashboard() {
  return (
    <div className="bg-gray-50 min-h-screen p-4 sm:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-2">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-blue-900 tracking-tight">
             Human Resources
          </h1>
          <p className="text-gray-500 font-medium">
             Manage and track human resources information
          </p>
        </div>
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Last updated: Today, 02:48 AM</p>
      </div>


      {/* ROW 1: RECENT EMPLOYEES TABLE (FULL WIDTH) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">Recent Employees</h3>
        </div>
        <RecentEmployeesTable />
      </div>

      {/* ROW 2: ANALYTICS GRID (3 COLUMNS) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">Analytics Overview</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <AttendanceOverview />
          <AttritionJoinersChart />
          <DepartmentSummaryTable />
        </div>
      </div>
    </div>
  );
}
