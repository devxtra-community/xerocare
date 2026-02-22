'use client';

import { useEffect, useState } from 'react';
import StatCard from '@/components/StatCard';
import { getHRStats, HRStats } from '@/lib/employee';

/**
 * Component displaying high-level HR statistics.
 * Shows Total Employees, Active Today (Attendance), On Leave, and Department count.
 * Data is fetched from the employee API and processed for display.
 */
export default function HRStatCards() {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeToday: 0,
    onLeave: 0,
    departments: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await getHRStats();
        if (response.success) {
          const s: HRStats = response.data;

          setStats({
            totalEmployees: s.total || 0,
            activeToday: s.active || 0,
            onLeave: s.inactive || 0, // Using inactive as proxy for absence in stats
            departments: Object.keys(s.byRole).length || 0,
          });
        }
      } catch (error) {
        console.error('Failed to fetch employee stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-[80px] bg-gray-100 animate-pulse rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Total Employees"
        value={stats.totalEmployees.toString()}
        subtitle="All registered"
      />
      <StatCard
        title="Active Today"
        value={stats.activeToday.toString()}
        subtitle="Present employees"
      />
      <StatCard title="On Leave" value={stats.onLeave.toString()} subtitle="Absent today" />
      <StatCard title="Departments" value={stats.departments.toString()} subtitle="Active roles" />
    </div>
  );
}
