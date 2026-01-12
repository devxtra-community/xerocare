import React from 'react';
import StatCard from '@/components/StatCard';

const statsData = [
  { title: 'Total Leads', value: '150', subtitle: '+12% from last month' },
  { title: 'Cold Leads', value: '45', subtitle: '-5% from last month' },
  { title: 'Lost Leads', value: '12', subtitle: '+2% from last month' },
  { title: 'Follow Up', value: '38', subtitle: 'Requires attention' },
];

export default function EmployeeLeadsStats() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
      {statsData.map((stat, index) => (
        <StatCard key={index} title={stat.title} value={stat.value} subtitle={stat.subtitle} />
      ))}
    </div>
  );
}
