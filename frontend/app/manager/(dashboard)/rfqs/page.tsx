'use client';

import React from 'react';
import RfqTable from '@/components/ManagerDashboardComponents/RfqComponents/RfqTable';

export default function RfqsPage() {
  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-8 sm:space-y-10 bg-blue-100 min-h-screen">
      <div className="flex justify-between items-center px-4">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold text-primary tracking-tight">
            Request For Quotations (RFQs)
          </h2>
          <p className="text-sm text-muted-foreground font-medium">
            Manage your multi-vendor procurement workflows
          </p>
        </div>
      </div>

      <div className="space-y-4 sm:space-y-6">
        <RfqTable basePath="/manager" />
      </div>
    </div>
  );
}
