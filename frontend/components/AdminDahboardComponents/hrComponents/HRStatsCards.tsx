'use client';

import React from 'react';
import StatCard from '@/components/StatCard';

export default function HRStatsCards() {
  // Mock data for display
  const stats = [
    {
      title: 'Total Employees',
      value: '156',
      subtitle: '+12% from last month',
    },
    {
      title: 'Active vs Inactive',
      value: '142 / 14',
      subtitle: '91% Active rate',
    },
    {
      title: 'New Joinees (Month)',
      value: '8',
      subtitle: 'Joined this month',
    },
    {
      title: 'Departments Count',
      value: '6',
      subtitle: 'Across 4 branches',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, index) => (
        <StatCard
          key={index}
          title={stat.title}
          value={stat.value}
          subtitle={stat.subtitle}
        />
      ))}
    </div>
  );
}
