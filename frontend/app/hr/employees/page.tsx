"use client";
import EmployeeTable from "@/components/hr/EmployeeTable";
import EmployeeDialog from "@/components/hr/EmployeeDialog";
import JoinedPerMonthChart from "@/components/hr/JoinedPerMonthChart";
import ActiveTimeChart from "@/components/hr/ActiveTimeChart";

export default function EmployeesPage() {
  return (
    <div className="bg-gray-50 min-h-screen p-4 sm:p-6 lg:p-8 space-y-8">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-2">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-blue-900 tracking-tight">
             Employee
          </h1>
          <p className="text-gray-500 font-medium">
             Manage and track employee information
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <EmployeeDialog />
        </div>
      </div>

      {/* ROW 1: EMPLOYEE TABLE (TOP) */}
      <div className="space-y-4">
         <div className="flex items-center justify-between px-2">
            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">Active Employee Directory</h3>
         </div>
         <EmployeeTable />
      </div>

      {/* ROW 2: ANALYTICS GRID (BOTTOM) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
         <JoinedPerMonthChart />
         <ActiveTimeChart />
      </div>

      {/* FOOTER */}
      <div className="pt-8 flex flex-col md:flex-row items-center justify-between border-t border-gray-100 gap-4 opacity-50">
         <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">© 2023 Xerocare HR Systems</p>
      </div>
    </div>
  );
}
