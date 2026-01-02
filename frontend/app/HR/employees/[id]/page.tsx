import { employees } from "@/lib/hr";
import { notFound } from "next/navigation";
import EmployeeProfile from "./employeeProfile.";


export default async function Employee({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const employee = employees.find(e => e.id === id);

  if (!employee) notFound();

  return <EmployeeProfile employee={employee} />;
}
