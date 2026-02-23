'use client';

import React from 'react';
import HREmployeeStats from '@/components/HrComponents/HREmployeeStats';
import HREmployeeManagementTable from '@/components/HrComponents/HREmployeeManagementTable';
import HRNewEmployeesGraph from '@/components/HrComponents/HRNewEmployeesGraph';
import HRBranchEmployeesGraph from '@/components/HrComponents/HRBranchEmployeesGraph';

export default function HREmployeesPage() {
  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-6 bg-blue-50/50 min-h-screen">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-primary">Employee Management</h2>
        <p className="text-sm text-muted-foreground font-medium">
          Manage staff, view distributions, and track organizational growth.
        </p>
      </div>

      {/* Role-based Stats */}
      <HREmployeeStats />

      {/* Graphs Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HRNewEmployeesGraph />
        <HRBranchEmployeesGraph />
      </div>

      {/* Management Table */}
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-blue-100/50">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-primary">Employee Directory</h3>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">
            Full control over employee access and records
          </p>
        </div>
        <HREmployeeManagementTable />
      </div>
    </div>
  );
}
