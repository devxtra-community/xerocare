import EmployeeTable from "@/components/employeeTable";
import AddEmployeeDialog from "@/components/hr/AddEmployeeDialog";
import { employees } from "@/lib/hr";
import Link from "next/link";

export default function EmployeesPage() {
  return (
    <div className="space-y-6 px-2 py-2 sm:px-4 md:px-6">
      <div className="flex flex-row justify-between items-center">
        <h1 className="text-xl font-semibold">Employees</h1>

        <AddEmployeeDialog />
      </div>
      {/* <div className="rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-white text-left text-primary">
            <tr>
              <th className="p-3 ">Name</th>
              <th className="p-3 hidden md:table-cell">Department</th>
              <th className="p-3 hidden lg:table-cell">Branch</th>
              <th className="p-3 ">Status</th>
              <th className="p-3 ">Join Date</th>
              <th className="p-3 ">Visa Expiry</th>
              <th className="p-3 ">Action</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id} className="border-t">
                <td className="p-3">
                  <Link
                    href={`/HR/employees/${emp.id}`}
                    className="text-primary hover:underline"
                  >
                    {emp.name}
                  </Link>
                </td>
                <td className="p-3 hidden md:table-cell">{emp.department}</td>
                <td className="p-3 hidden lg:table-cell">{emp.branch}</td>
                 <td className="p-3 hidden lg:table-cell">{emp.status}</td>
                  <td className="p-3 hidden lg:table-cell">{emp.joiningDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div> */}
      <EmployeeTable users={employees}/>
    </div>
  );
}
