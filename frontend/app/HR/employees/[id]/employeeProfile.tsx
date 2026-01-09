'use client';

import { useState } from 'react';
import { EmployeeTabs, AttendanceTab, LeaveTab, DocumentsTab } from '@/components/hr/employeeTabs';
import OverviewTab, { Employee } from '@/components/hr/employeeOverViewTab';

/* ---------------- TYPES ---------------- */

type Tab = 'overview' | 'attendance' | 'leave' | 'documents';

type Props = {
  employee: Employee;
  stats: {
    presentDays: number;
    performance: number;
    tasksCompleted: number;
    leaveBalance: number;
  };
  attendance: { month: string; daysPresent: number }[];
  workingHours: { day: string; hours: number }[];
};

/* ---------------- COMPONENT ---------------- */

export default function EmployeeProfile({ employee, stats, attendance, workingHours }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  return (
    <div className="space-y-6 px-2 sm:px-4 md:px-6">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-semibold">{employee.name}</h1>
        <p className="text-muted-foreground">
          {employee.designation} · {employee.department}
        </p>
      </div>

      <EmployeeTabs active={activeTab} onChange={setActiveTab} />

      {activeTab === 'overview' && (
        <OverviewTab
          employee={employee}
          stats={stats}
          attendance={attendance}
          taskStatus={[
            { label: 'Completed', value: 18 },
            { label: 'Pending', value: 6 },
            { label: 'Overdue', value: 2 },
          ]}
          workingHours={workingHours}
        />
      )}

      {activeTab === 'attendance' && <AttendanceTab employeeId={employee.id} />}

      {activeTab === 'leave' && <LeaveTab employeeId={employee.id} />}

      {activeTab === 'documents' && <DocumentsTab />}
    </div>
  );
}
