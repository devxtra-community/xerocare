'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getUserFromToken } from '@/lib/auth';
import { hasJobAccess, EmployeeJob } from '@/lib/employeeJob';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredModules: string[];
  fallbackPath?: string;
}

/**
 * HOC for protecting routes based on user role and module access.
 * Redirects unauthorized users to a fallback path or login.
 */
export default function ProtectedRoute({
  children,
  requiredModules,
  fallbackPath = '/employee/dashboard',
}: ProtectedRouteProps) {
  const router = useRouter();

  useEffect(() => {
    const user = getUserFromToken();

    // If not logged in, redirect to login
    if (!user) {
      router.push('/login');
      return;
    }

    // If not an employee, allow access (for admins/managers)
    if (user.role !== 'EMPLOYEE') {
      return;
    }

    // If employee doesn't have a job assigned, redirect
    if (!user.employeeJob) {
      router.push(fallbackPath);
      return;
    }

    // Check if employee's job has access to any of the required modules
    const hasAccess = requiredModules.some((module) =>
      hasJobAccess(user.employeeJob as EmployeeJob, module),
    );

    if (!hasAccess) {
      router.push(fallbackPath);
    }
  }, [router, requiredModules, fallbackPath]);

  return <>{children}</>;
}
