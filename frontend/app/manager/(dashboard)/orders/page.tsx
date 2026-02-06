'use client';

import React from 'react';
import OrderStats from '@/components/ManagerDashboardComponents/orderComponents/OrderStats';
import OrderTable from '@/components/ManagerDashboardComponents/orderComponents/OrderTable';

export default function OrdersPage() {
  return (
    <div className="bg-blue-100 min-h-screen p-3 sm:p-4 md:p-6 space-y-6 sm:space-y-8">
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold text-primary tracking-tight">
            Orders Management
          </h2>
          <p className="text-sm text-muted-foreground font-medium">
            Monitor and track sales, rentals, and lease orders across branches
          </p>
        </div>
      </div>

      {/* STATS SECTION */}
      <OrderStats />

      {/* TABLE SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-primary uppercase tracking-tighter">
            Live Order Feed
          </h3>
        </div>
        <OrderTable />
      </div>
    </div>
  );
}
