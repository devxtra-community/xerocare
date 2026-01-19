'use client';

import React from 'react';
import HRPayrollStats from '@/components/HrComponents/HRPayrollStats';
import HRPayrollTable from '@/components/HrComponents/HRPayrollTable';

export default function PayrollPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-primary">Payroll Management</h1>
        <p className="text-muted-foreground">Manage employee salaries and payroll records</p>
      </div>

      {/* Stats Cards */}
      <HRPayrollStats />

      {/* Payroll Table */}
      <HRPayrollTable />
    </div>
  );
}
