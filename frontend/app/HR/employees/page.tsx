import EmployeeTable from "@/components/employeeTable";
import AddEmployeeDialog from "@/components/hr/AddEmployeeDialog";
import { employees } from "@/lib/hr";

export default function EmployeesPage() {
  return (
    <div className="space-y-6 px-2 py-2 sm:px-4 md:px-6">
      <div className="flex flex-row justify-between items-center">
        <h1 className="text-xl font-semibold">Employees</h1>

        <AddEmployeeDialog />
      </div>
           <EmployeeTable users={employees}/>
    </div>
  );
}
