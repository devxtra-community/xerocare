import React from 'react';
import StatCard from '@/components/StatCard';

export default function EmployeeStatsCards() {
  const cards = [
    { title: 'Customers', value: '1,234', subtitle: '+12% from last month' },
    { title: 'Leads', value: '567', subtitle: '+5% from last month' },
    { title: 'Sales Closed', value: '89', subtitle: '+8% from last month' },
    { title: 'Total Orders', value: '432', subtitle: '+2% from last month' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
      {cards.map((c) => (
        <StatCard key={c.title} title={c.title} value={c.value} subtitle={c.subtitle} />
      ))}
    </div>
  );
}
