"use client";

import { useState } from "react";
import {
  EmployeeTabs,
  OverviewTab,
  AttendanceTab,
  LeaveTab,
  DocumentsTab,
} from "@/components/hr/employeeTabs";
import { Employee, employees, UserListItem } from "@/lib/hr";

type Tab = "overview" | "attendance" | "leave" | "documents";

export default function EmployeeProfile({
  employee,
}: {
  employee  : UserListItem;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  return (
    <div className="space-y-6 px-2 sm:px-4 md:px-6">
      
      <div>
        <h1 className="text-2xl font-semibold">{employee.name}</h1>
        <p className="text-muted-foreground">
          {employee.designation} · {employee.department}
        </p>
      </div>

      
      <EmployeeTabs active={activeTab} onChange={setActiveTab} />

      
      {activeTab === "overview" && <OverviewTab employee={employees} />}
      {activeTab === "attendance" && <AttendanceTab employeeId={employee.id} />}
      {activeTab === "leave" && <LeaveTab employeeId={employee.id} />}
      {activeTab === "documents" && <DocumentsTab />}
    </div>
  );
}
