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
 * Security Guard: This tool acts like a guard for our company website.
 * Before showing a page, it checks:
 * 1. Are you logged in? (If not, it sends you to the Login page).
 * 2. Is this your department? (Ensures staff Only see modules they are assigned to).
 */
export default function ProtectedRoute({
  children,
  requiredModules,
  fallbackPath = '/employee/dashboard',
}: ProtectedRouteProps) {
  const router = useRouter();

  useEffect(() => {
    // Check our digital ID card
    const user = getUserFromToken();

    // Safety Check 1: If the user is not signed in at all, take them to the login screen.
    if (!user) {
      router.push('/login');
      return;
    }

    // Administrators and Managers are allowed to see any page.
    if (user.role !== 'EMPLOYEE') {
      return;
    }

    // Safety Check 2: If the employee hasn't been assigned a specific job yet,
    // send them back to their home dashboard.
    if (!user.employeeJob) {
      router.push(fallbackPath);
      return;
    }

    // Safety Check 3: Check if this specific page (Module) is part of their job description.
    const hasAccess = requiredModules.some((module) =>
      hasJobAccess(user.employeeJob as EmployeeJob, module),
    );

    // If they are trying to peek into a department they don't belong to,
    // send them back home.
    if (!hasAccess) {
      router.push(fallbackPath);
    }
  }, [router, requiredModules, fallbackPath]);

  return <>{children}</>;
}
