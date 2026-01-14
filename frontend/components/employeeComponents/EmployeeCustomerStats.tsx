import React from 'react';
import StatCard from '@/components/StatCard';

export default function EmployeeCustomerStats() {
  const cards = [
    { title: 'Total Customers', value: '2,543', subtitle: '+12% from last month' },
    { title: 'New Customers', value: '145', subtitle: '+5% from last month' },
    { title: 'From Leads', value: '890', subtitle: '+18% from last month' },
    { title: 'High Value Customers', value: '320', subtitle: '+2% from last month' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
      {cards.map((c) => (
        <StatCard key={c.title} title={c.title} value={c.value} subtitle={c.subtitle} />
      ))}
    </div>
  );
}
