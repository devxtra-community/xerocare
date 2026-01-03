import { employees } from "@/lib/hr";
import EmployeeProfile from "./employeeProfile.";
import type { Employee } from "@/components/hr/employeeOverViewTab";

export default async function EmployeePage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = await params; 

  const listEmployee = employees.find((e) => e.id === id);

  if (!listEmployee) return null;

  const employee: Employee = {
    id: listEmployee.id,
    name: listEmployee.name,
    designation: listEmployee.designation,
    department: listEmployee.department,
    outlet: listEmployee.branch,
    joiningDate: listEmployee.startDate,
    employeeType: listEmployee.employmentType,
    salary: String(listEmployee.salary),
    visaExpiry: listEmployee.visaExpiryDate,
    manager: "Branch Manager",
    phone: "+91 90000 00000",
    email: "employee@company.com",
    address: "Kerala, India",
  };

  // mock data
  const stats = {
    presentDays: 223,
    performance: 75,
    tasksCompleted: 43,
    leaveBalance: 22,
  };

  const attendance = [
    { month: "Jan", daysPresent: 20 },
    { month: "Feb", daysPresent: 18 },
    { month: "Mar", daysPresent: 22 },
    { month: "Apr", daysPresent: 19 },
  ];

  const workingHours = [
    { day: "Mon", hours: 8 },
    { day: "Tue", hours: 7.5 },
    { day: "Wed", hours: 8 },
    { day: "Thu", hours: 6.5 },
    { day: "Fri", hours: 7 },
  ];

  return (
    <EmployeeProfile
      employee={employee}
      stats={stats}
      attendance={attendance}
      workingHours={workingHours}
    />
  );
}
