import React from 'react';
import FinanceQuotationTable from '@/components/Finance/FinanceQuotationTable';

export default function FinanceQuotationsPage() {
  return (
    // Same page shell as the employee Quotations page (tinted background, page heading,
    // generous spacing) — this used to be a bare max-w-7xl main with no heading at all,
    // so the Finance side read as a loose table dropped onto the dashboard rather than a
    // page of its own.
    <div className="bg-blue-100 min-h-full p-3 sm:p-4 md:p-6 space-y-6 sm:space-y-8">
      <div className="flex flex-col space-y-1">
        <h3 className="text-xl sm:text-2xl font-bold text-primary tracking-tight">
          Quotation Management
        </h3>
        <p className="text-sm text-muted-foreground font-medium">
          Review, approve and track quotations raised by your team
        </p>
      </div>
      <FinanceQuotationTable />
    </div>
  );
}
