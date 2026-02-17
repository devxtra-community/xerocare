'use client';

import React from 'react';
import StatCard from '@/components/StatCard';

interface EmployeeStatsProps {
  stats?: {
    total: number;
    rent: number;
    lease: number;
    sale: number;
  };
  loading?: boolean;
}

export default function EmployeeStats({ stats, loading }: EmployeeStatsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 md:gap-4">
      <StatCard
        title="Total Employees"
        value={loading ? '...' : (stats?.total || 0).toString()}
        subtitle="Global Workforce"
      />
      <StatCard
        title="Rent"
        value={loading ? '...' : (stats?.rent || 0).toString()}
        subtitle="Rental Agents"
      />
      <StatCard
        title="Lease"
        value={loading ? '...' : (stats?.lease || 0).toString()}
        subtitle="Lease Specialist"
      />
      <StatCard
        title="Sale"
        value={loading ? '...' : (stats?.sale || 0).toString()}
        subtitle="Sales Force"
      />
    </div>
  );
}
