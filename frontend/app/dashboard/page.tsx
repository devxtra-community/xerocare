'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUserFromToken, UserRole } from '@/lib/auth';

import HrDashboard from '@/components/dashboard/HrDashboard';
import EmployeeDashboard from '@/components/dashboard/EmployeeDashboard';
import ManagerDashboard from '@/components/dashboard/ManagerDashboard';
import FinanceDashboard from '@/components/dashboard/FinanceDashboard';

export default function DashboardPage() {
  const router = useRouter();
  const [role, setRole] = useState<UserRole | null>(null);

  useEffect(() => {
    const user = getUserFromToken();

    if (!user) {
      router.replace('/login');
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRole(user.role);
  }, [router]);

  if (!role) {
    return <p>Loading...</p>;
  }

  switch (role) {
    case 'HR':
      return <HrDashboard />;

    case 'EMPLOYEE':
      return <EmployeeDashboard />;

    case 'FINANCE':
      return <FinanceDashboard />;

    case 'MANAGER':
      return <ManagerDashboard />;

    default:
      return <p>Unauthorized</p>;
  }
}
