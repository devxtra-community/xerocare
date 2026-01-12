import EmployeeStatsCards from '@/components/employeeComponents/EmployeeStatsCards';
import EmployeeSalesGraph from '@/components/employeeComponents/EmployeeSalesGraph';
import EmployeeLeadsGraph from '@/components/employeeComponents/EmployeeLeadsGraph';
import EmployeeOrdersTable from '@/components/employeeComponents/EmployeeOrdersTable';

export default function EmployeeDashboardPage() {
  return (
    <div className="bg-blue-100 min-h-full p-3 sm:p-4 md:p-6 space-y-6 sm:space-y-8">
      <div className="flex flex-col space-y-4 sm:space-y-6">
        <h3 className="text-xl sm:text-2xl font-bold text-primary">Employee Report</h3>
        <EmployeeStatsCards />

        <div className="flex flex-col lg:flex-row gap-6 w-full">
          <div className="w-full lg:w-1/2 space-y-2">
            <h3 className="text-lg sm:text-xl font-bold text-primary">Sales vs Rent vs Lease</h3>
            <EmployeeSalesGraph />
          </div>
          <div className="w-full lg:w-1/2 space-y-2">
            <h3 className="text-lg sm:text-xl font-bold text-primary">Leads Source</h3>
            <EmployeeLeadsGraph />
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-lg sm:text-xl font-bold text-primary">Recent Orders</h3>
          <EmployeeOrdersTable />
        </div>
      </div>
    </div>
  );
}
