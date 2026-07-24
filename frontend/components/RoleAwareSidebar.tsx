'use client';

import { useEffect, useState } from 'react';
import { getUserFromToken } from '@/lib/auth';
import type { EmployeeJob } from '@/lib/employeeJob';
import ManagerSidebar from '@/components/ManagerDashboardComponents/ManagerAppSidebar';
import EmployeeSidebar from '@/components/employeeComponents/employeeAppsidebar';
import HrSidebar from '@/components/HrComponents/HrAppSidebar';
import FinanceSidebar from '@/components/Finance/financeSidebar';

// Managers keep their own sidebar on every desk page instead of switching
// to the employee/hr/finance sidebar with a "Back to Manager" link.
//
// `initialIsManager`/`initialEmployeeJob` are seeded server-side (from the
// accessToken cookie, see lib/server-auth.ts) by the layout that renders
// this component, so the correct sidebar shows on the very first paint
// instead of nothing (or the wrong one) flashing in after a client effect
// resolves on refresh.
export default function RoleAwareSidebar({
  fallback,
  initialIsManager = false,
  initialEmployeeJob = null,
}: {
  fallback: 'employee' | 'hr' | 'finance';
  initialIsManager?: boolean;
  initialEmployeeJob?: EmployeeJob | null;
}) {
  const [isManager, setIsManager] = useState(initialIsManager);

  useEffect(() => {
    setIsManager(getUserFromToken()?.role === 'MANAGER');
  }, []);

  if (isManager) return <ManagerSidebar />;
  if (fallback === 'hr') return <HrSidebar />;
  if (fallback === 'finance') return <FinanceSidebar />;
  return <EmployeeSidebar initialEmployeeJob={initialEmployeeJob} />;
}
