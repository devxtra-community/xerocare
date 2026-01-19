'use client';

import { useEffect, useState } from 'react';
import StatCard from '@/components/StatCard';
import { getAllEmployees } from '@/lib/employee';

export default function HRAttendanceStats() {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    present: 0,
    onLeave: 0,
    late: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await getAllEmployees(1, 1000, 'All');
        if (response.success) {
          const total = response.data.employees.length;

          // Realistic mock distributions
          // 85-92% Present
          // 5-8% On Leave
          // 3-7% Late
          const present = Math.floor(total * (0.85 + Math.random() * 0.07));
          const onLeave = Math.floor(total * (0.05 + Math.random() * 0.03));
          const late = Math.floor(total * (0.03 + Math.random() * 0.04));

          setStats({
            totalEmployees: total,
            present,
            onLeave,
            late,
          });
        }
      } catch (error) {
        console.error('Failed to fetch attendance stats:', error);
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
        subtitle="Staff strength"
      />
      <StatCard title="Present" value={stats.present.toString()} subtitle="In office today" />
      <StatCard title="On Leave" value={stats.onLeave.toString()} subtitle="Approved absences" />
      <StatCard title="Late Arrivals" value={stats.late.toString()} subtitle="After 9:30 AM" />
    </div>
  );
}
