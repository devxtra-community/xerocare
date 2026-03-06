'use client';

import React from 'react';
import RfqDetails from '@/components/ManagerDashboardComponents/RfqComponents/RfqDetails';
import { useParams } from 'next/navigation';

export default function RfqDetailPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-8 sm:space-y-10 bg-blue-100 min-h-screen">
      <div className="space-y-4 sm:space-y-6">
        <RfqDetails id={id} basePath="/manager" />
      </div>
    </div>
  );
}
