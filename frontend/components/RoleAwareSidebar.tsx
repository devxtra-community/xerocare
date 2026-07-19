'use client';

import { useEffect, useState } from 'react';
import { getUserFromToken } from '@/lib/auth';
import ManagerSidebar from '@/components/ManagerDashboardComponents/ManagerAppSidebar';
import EmployeeSidebar from '@/components/employeeComponents/employeeAppsidebar';
import HrSidebar from '@/components/HrComponents/HrAppSidebar';
import FinanceSidebar from '@/components/Finance/financeSidebar';

// Managers keep their own sidebar on every desk page instead of switching
// to the employee/hr/finance sidebar with a "Back to Manager" link.
export default function RoleAwareSidebar({
  fallback,
}: {
  fallback: 'employee' | 'hr' | 'finance';
}) {
  const [isManager, setIsManager] = useState<boolean | null>(null);

  useEffect(() => {
    setIsManager(getUserFromToken()?.role === 'MANAGER');
  }, []);

  if (isManager === null) return null;
  if (isManager) return <ManagerSidebar />;
  if (fallback === 'hr') return <HrSidebar />;
  if (fallback === 'finance') return <FinanceSidebar />;
  return <EmployeeSidebar />;
}
