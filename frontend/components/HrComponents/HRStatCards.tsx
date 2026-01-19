'use client';

import { useEffect, useState } from 'react';
import StatCard from '@/components/StatCard';
import { getAllEmployees, Employee } from '@/lib/employee';

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
        const response = await getAllEmployees(1, 1000, 'All');
        if (response.success) {
          const employees: Employee[] = response.data.employees;
          const total = employees.length;

          // Count unique roles/departments
          const uniqueRoles = new Set(employees.map((emp) => emp.role));
          const departments = uniqueRoles.size;

          // Mock data for active today and on leave (can be replaced with real API data)
          const activeToday = Math.floor(total * 0.85); // 85% attendance mock
          const onLeave = Math.floor(total * 0.08); // 8% on leave mock

          setStats({
            totalEmployees: total,
            activeToday,
            onLeave,
            departments,
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
