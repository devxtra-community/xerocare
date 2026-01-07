'use client';

import React from 'react';
import StatCard from '@/components/StatCard';

export default function OrderStats() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 md:gap-4">
      <StatCard
        title="Total Orders"
        value="482"
        subtitle="This Month"
      />
      <StatCard
        title="Pending Orders"
        value="24"
        subtitle="Require Action"
      />
      <StatCard
        title="Completed"
        value="415"
        subtitle="Successful Deliveries"
      />
      <StatCard
        title="Cancelled"
        value="43"
        subtitle="Order Returns/Voids"
      />
    </div>
  );
}
