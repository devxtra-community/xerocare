'use client';

import React from 'react';
import StatCard from '@/components/StatCard';
import { Users, UserCheck, UserMinus, Clock } from 'lucide-react';

export default function EmployeeStats() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 md:gap-4">
      <StatCard
        title="Total Employees"
        value="124"
        subtitle="Global Workforce"
      />
      <StatCard
        title="Present Today"
        value="112"
        subtitle="90% Attendance"
      />
      <StatCard
        title="On Leave"
        value="12"
        subtitle="Across Departments"
      />
      <StatCard
        title="Working Hours"
        value="892h"
        subtitle="Today's Total"
      />
    </div>
  );
}
