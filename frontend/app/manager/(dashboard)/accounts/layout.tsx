'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Eye } from 'lucide-react';
import { getUserFromToken } from '@/lib/auth';

/**
 * Branch Manager's accounts section.
 *
 * The manager sees the same accounts pages Finance does — the billing service opens
 * every accounts GET to any signed-in role and blocks POST/PUT/PATCH/DELETE for
 * MANAGER (see requireWriteAccess), so read access here is enforced by the server, not
 * by hiding the pages. The banner says so plainly rather than leaving the manager to
 * discover it by clicking something that fails.
 *
 * ADMIN is allowed through too, so an admin following a manager's link is not bounced.
 */
export default function ManagerAccountsLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const user = getUserFromToken();
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role === 'MANAGER' || user.role === 'ADMIN') {
      setAuthorized(true);
    } else if (user.role === 'FINANCE') {
      // Send Finance to the same page under their own prefix — the route names match
      // one-for-one. There is no page at the bare /finance/accounts, so the section
      // root falls back to the first entry of their accounts menu instead of 404ing.
      const sub = pathname?.replace(/^\/manager\/accounts/, '') || '';
      router.replace(sub ? `/finance/accounts${sub}` : '/finance/accounts/chart-of-accounts');
    } else {
      router.replace('/unauthorized');
    }
  }, [router, pathname]);

  if (!authorized) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="sticky top-0 z-30 flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-1.5 text-[11px] font-semibold text-amber-800">
        <Eye className="h-3.5 w-3.5 shrink-0" />
        View only — branch managers can read every accounts page. Contact your Finance Manager to
        make changes.
      </div>
      {children}
    </div>
  );
}
