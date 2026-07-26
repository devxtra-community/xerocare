'use client';

import { useEffect, useState } from 'react';
import { getUserFromToken } from '@/lib/auth';
import type { EmployeeJob } from '@/lib/employeeJob';
import AdminSidebar from '@/components/AdminDahboardComponents/AdminAppSidebar';
import ManagerSidebar from '@/components/ManagerDashboardComponents/ManagerAppSidebar';
import EmployeeSidebar from '@/components/employeeComponents/employeeAppsidebar';
import HrSidebar from '@/components/HrComponents/HrAppSidebar';
import FinanceSidebar from '@/components/Finance/financeSidebar';

// Admins and managers keep their own sidebar on every desk page instead of
// switching to the employee/hr/finance sidebar with a "Back to …" link. Their
// sidebar already deep-links into these sections, so swapping it out would
// strip away the navigation they arrived with.
//
// `initialRole`/`initialEmployeeJob` are seeded server-side (from the
// accessToken cookie, see lib/server-auth.ts) by the layout that renders
// this component, so the correct sidebar shows on the very first paint
// instead of nothing (or the wrong one) flashing in after a client effect
// resolves on refresh.
export default function RoleAwareSidebar({
  fallback,
  initialRole = null,
  initialEmployeeJob = null,
}: {
  fallback: 'employee' | 'hr' | 'finance';
  initialRole?: string | null;
  initialEmployeeJob?: EmployeeJob | null;
}) {
  const [role, setRole] = useState<string | null>(initialRole);

  useEffect(() => {
    // Keep the server-seeded role when the client has no token yet, so a slow
    // localStorage hydration cannot downgrade the sidebar mid-session.
    setRole(getUserFromToken()?.role ?? initialRole);
  }, [initialRole]);

  if (role === 'ADMIN') return <AdminSidebar />;
  if (role === 'MANAGER') return <ManagerSidebar />;
  if (fallback === 'hr') return <HrSidebar />;
  if (fallback === 'finance') return <FinanceSidebar />;
  return <EmployeeSidebar initialEmployeeJob={initialEmployeeJob} />;
}
