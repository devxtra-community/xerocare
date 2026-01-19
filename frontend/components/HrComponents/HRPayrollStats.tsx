'use client';

import StatCard from '@/components/StatCard';

export default function HRPayrollStats() {
  // Mock data for payroll stats
  const stats = {
    employeeCount: 156,
    payrollPerMonth: '₹ 45,20,000',
    departments: 8,
    branches: 5,
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Employee Count"
        value={stats.employeeCount.toString()}
        subtitle="Total employees"
      />
      <StatCard
        title="Payroll / Month"
        value={stats.payrollPerMonth}
        subtitle="Total monthly payroll"
      />
      <StatCard
        title="Departments"
        value={stats.departments.toString()}
        subtitle="Active departments"
      />
      <StatCard title="Branches" value={stats.branches.toString()} subtitle="Active branches" />
    </div>
  );
}
