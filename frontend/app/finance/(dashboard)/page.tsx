'use client';

import React from 'react';
import FinanceReport from '@/components/AdminDashboardComponents/FinanceComponents/FinanceReport';

export default function FinanceDashboardPage() {
  return (
    <div className="flex flex-col gap-4">
      <FinanceReport />
    </div>
  );
}
