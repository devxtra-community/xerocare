import { Suspense } from 'react';
import ManagerModel from '@/components/ManagerDashboardComponents/productComponents/ManagerModel';

export const dynamic = 'force-dynamic';

export default function ModelPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-blue-100">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
        </div>
      }
    >
      <ManagerModel />
    </Suspense>
  );
}
