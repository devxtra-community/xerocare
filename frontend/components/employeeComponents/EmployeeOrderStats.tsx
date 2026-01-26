'use client';

import React from 'react';
import StatCard from '@/components/StatCard';

export default function EmployeeOrderStats() {
  const cards = [
    { title: 'Total Orders', value: '432', subtitle: '+2% from last month' },
    { title: 'New Orders', value: '45', subtitle: '+10% from last month' },
    { title: 'Pending Orders', value: '12', subtitle: '-3% from last month' },
    { title: 'Delivered Orders', value: '375', subtitle: '+5% from last month' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
      {cards.map((c) => (
        <StatCard key={c.title} title={c.title} value={c.value} subtitle={c.subtitle} />
      ))}
    </div>
  );
}
