'use client';

import { useEffect, useState } from 'react';
import StatCard from '@/components/StatCard';
import { getAllEmployees, Employee } from '@/lib/employee';

/**
 * Component displaying employee distribution statistics.
 * Shows total count and breakdown by key roles (Managers, Employees, Finance).
 * Data is fetched dynamically from the backend.
 */
export default function HREmployeeStats() {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    managers: 0,
    employees: 0,
    finance: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await getAllEmployees(1, 1000, 'All');
        if (response.success) {
          const employees = response.data.employees;

          setStats({
            totalEmployees: employees.length,
            managers: employees.filter((e: Employee) => e.role === 'MANAGER').length,
            employees: employees.filter((e: Employee) => e.role === 'EMPLOYEE').length,
            finance: employees.filter((e: Employee) => e.role === 'FINANCE').length,
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
        subtitle="Across all roles"
      />
      <StatCard title="Managers" value={stats.managers.toString()} subtitle="Team leaders" />
      <StatCard title="Employees" value={stats.employees.toString()} subtitle="Support & Staff" />
      <StatCard title="Finance" value={stats.finance.toString()} subtitle="Accounts & Payroll" />
    </div>
  );
}
