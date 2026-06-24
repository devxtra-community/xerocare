import React from 'react';
import ManagerProduct from '@/components/ManagerDashboardComponents/productComponents/managerProductTable';

export default function managerProductpage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      }
    >
      <ManagerProduct />
    </React.Suspense>
  );
}
