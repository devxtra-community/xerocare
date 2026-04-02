import React from 'react';
import FinanceQuotationTable from '@/components/Finance/FinanceQuotationTable';

export default function FinanceQuotationsPage() {
  return (
    <main className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
      <FinanceQuotationTable />
    </main>
  );
}
