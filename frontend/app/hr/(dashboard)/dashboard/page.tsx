'use client';
import HRStatCards from '@/components/HrComponents/HRStatCards';
import HREmployeeTable from '@/components/HrComponents/HREmployeeTable';
import HRAttendanceGraph from '@/components/HrComponents/HRAttendanceGraph';
import HRDepartmentGraph from '@/components/HrComponents/HRDepartmentGraph';
import DashboardPage from '@/components/DashboardPage';
import { useState } from 'react';
import { YearSelector } from '@/components/ui/YearSelector';

export default function HrDashboard() {
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(new Date().getFullYear());

  return (
    <DashboardPage>
      <div className="flex flex-col space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-xl sm:text-2xl font-bold text-primary tracking-tight">HR Report</h3>
            <p className="text-sm text-muted-foreground font-medium">
              Employee statistics, attendance trends, and department metrics
            </p>
          </div>
          <YearSelector selectedYear={selectedYear} onYearChange={setSelectedYear} />
        </div>
        <HRStatCards />

        <div className="flex flex-col lg:flex-row gap-6 w-full">
          <div className="w-full lg:w-1/2 space-y-2">
            <h3 className="text-lg sm:text-xl font-bold text-primary">Attendance Overview</h3>
            <HRAttendanceGraph />
          </div>
          <div className="w-full lg:w-1/2 space-y-2">
            <h3 className="text-lg sm:text-xl font-bold text-primary">Department Distribution</h3>
            <HRDepartmentGraph />
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-lg sm:text-xl font-bold text-primary">Employee Directory</h3>
          <HREmployeeTable />
        </div>
      </div>
    </DashboardPage>
  );
}
