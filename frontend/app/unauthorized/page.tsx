'use client';

import { useRouter } from 'next/navigation';
import { getUserFromToken } from '@/lib/auth';
import { ShieldX } from 'lucide-react';

const ROLE_HOME: Record<string, string> = {
  ADMIN: '/admin/dashboard',
  FINANCE: '/finance/dashboard',
  MANAGER: '/manager/dashboard',
  HR: '/hr/dashboard',
  EMPLOYEE: '/employee/dashboard',
};

export default function UnauthorizedPage() {
  const router = useRouter();

  const goHome = () => {
    const user = getUserFromToken();
    if (!user) {
      router.push('/login');
      return;
    }
    const home = ROLE_HOME[user.role] ?? '/login';
    router.push(home);
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gray-50">
      <div className="max-w-md w-full mx-4 text-center">
        <div className="bg-white rounded-2xl shadow-sm border p-10 space-y-6">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
              <ShieldX className="h-8 w-8 text-red-600" />
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
            <p className="mt-2 text-gray-500 text-sm">
              You do not have permission to view this page. If you believe this is a mistake,
              contact your administrator.
            </p>
          </div>

          <button
            onClick={goHome}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
