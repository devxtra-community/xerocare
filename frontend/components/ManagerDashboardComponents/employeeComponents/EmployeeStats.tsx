'use client';

import React from 'react';
import StatCard from '@/components/StatCard';

interface EmployeeStatsProps {
  stats?: {
    total: number;
    branchManager: number;
    salesRentLeaseStaff: number;
    finance: number;
  };
  loading?: boolean;
}

export default function EmployeeStats({ stats, loading }: EmployeeStatsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-2 md:gap-4">
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
        title="Sale, Rent & Lease"
        value={loading ? '...' : (stats?.salesRentLeaseStaff || 0).toString()}
        subtitle="Core Business Team"
      />
      <StatCard
        title="Finance"
        value={loading ? '...' : (stats?.finance || 0).toString()}
        subtitle="Accounts Team"
      />
    </div>
  );
}
