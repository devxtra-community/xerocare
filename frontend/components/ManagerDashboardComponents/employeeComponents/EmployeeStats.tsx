'use client';

import React from 'react';
import StatCard from '@/components/StatCard';

interface EmployeeStatsProps {
  stats?: {
    total: number;
    branchManager: number;
    employeeManager: number;
    salesStaff: number;
    rentLeaseStaff: number;
    finance: number;
  };
  loading?: boolean;
}

export default function EmployeeStats({ stats, loading }: EmployeeStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-1.5 sm:gap-2 md:gap-4">
      <StatCard
        title="Total Employees"
        value={loading ? '...' : (stats?.total || 0).toString()}
        subtitle="Global Workforce"
      />
      <StatCard
        title="Branch Manager"
        value={loading ? '...' : (stats?.branchManager || 0).toString()}
        subtitle="Operations Lead"
      />
      <StatCard
        title="Employee Manager"
        value={loading ? '...' : (stats?.employeeManager || 0).toString()}
        subtitle="Staff Management"
      />
      <StatCard
        title="Sales Staff"
        value={loading ? '...' : (stats?.salesStaff || 0).toString()}
        subtitle="Sales Force"
      />
      <StatCard
        title="Rent & Lease Staff"
        value={loading ? '...' : (stats?.rentLeaseStaff || 0).toString()}
        subtitle="Service Agents"
      />
      <StatCard
        title="Finance"
        value={loading ? '...' : (stats?.finance || 0).toString()}
        subtitle="Accounts Team"
      />
    </div>
  );
}
