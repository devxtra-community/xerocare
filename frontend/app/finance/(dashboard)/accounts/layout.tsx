'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUserFromToken } from '@/lib/auth';

export default function AccountsRoleLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const user = getUserFromToken();

    if (!user) {
      router.replace('/login');
      return;
    }

    const { role } = user;

    if (role === 'FINANCE') {
      setAuthorized(true);
    } else if (role === 'MANAGER') {
      router.replace('/manager/accounts');
    } else if (role === 'ADMIN') {
      router.replace('/admin/accounts');
    } else {
      // HR, EMPLOYEE, and any unknown role
      router.replace('/unauthorized');
    }
  }, [router]);

  if (!authorized) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
