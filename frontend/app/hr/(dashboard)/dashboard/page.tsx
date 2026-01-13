import HRStatCards from '@/components/HrComponents/HRStatCards';
import HREmployeeTable from '@/components/HrComponents/HREmployeeTable';
import HRAttendanceGraph from '@/components/HrComponents/HRAttendanceGraph';
import HRDepartmentGraph from '@/components/HrComponents/HRDepartmentGraph';

export default function HrDashboard() {
  return (
    <div className="bg-blue-100 min-h-full p-3 sm:p-4 md:p-6 space-y-6 sm:space-y-8">
      <div className="flex flex-col space-y-4 sm:space-y-6">
        <h3 className="text-xl sm:text-2xl font-bold text-primary">HR Report</h3>
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
    </div>
  );
}
