'use client';

import StatCard from '@/components/StatCard';

export default function HRLeaveStats() {
  // TODO: Fetch real data from API
  const stats = {
    totalLeaves: 124,
    holidays: 12,
    leavePerMonth: 15,
    holidaysPerMonth: 2,
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard title="Total Leaves" value={stats.totalLeaves.toString()} subtitle="Year to date" />
      <StatCard title="Holidays" value={stats.holidays.toString()} subtitle="Total holidays" />
      <StatCard title="Leave Per Month" value={stats.leavePerMonth.toString()} subtitle="Average" />
      <StatCard
        title="Holidays Per Month"
        value={stats.holidaysPerMonth.toString()}
        subtitle="Average"
      />
    </div>
  );
}
