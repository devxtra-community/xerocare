import { employees } from "@/lib/hr";
import Link from "next/link";


export default function EmployeesPage() {
  return (
    <div className="space-y-6 px-2 sm:px-4 md:px-6">
      <h1 className="text-xl font-semibold">Employees</h1>
      

      <div className="rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 hidden md:table-cell">Department</th>
              <th className="p-3 hidden lg:table-cell">Branch</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => (
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
