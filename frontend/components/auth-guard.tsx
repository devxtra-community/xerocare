'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUserFromToken } from '@/lib/auth';

interface AuthGuardProps {
  children: React.ReactNode;
  loginUrl?: string;
}

export default function AuthGuard({ children, loginUrl = '/login' }: AuthGuardProps) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const user = getUserFromToken();
    if (!user) {
      router.push(loginUrl);
    } else {
      setAuthorized(true);
    }
  }, [router, loginUrl]);

  if (!authorized) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
