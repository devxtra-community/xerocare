'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { getUserFromToken } from '@/lib/auth';
import EmployeeProfile from '@/components/AdminDahboardComponents/hrComponents/EmployeeProfile';

export default function MyProfilePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const user = getUserFromToken();
    if (!user) {
      router.push('/login');
      return;
    }
    setUserId(user.userId);
  }, [router]);

  if (!userId) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-transparent">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <EmployeeProfile id={userId} />;
}
