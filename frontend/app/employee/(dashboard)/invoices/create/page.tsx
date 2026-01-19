'use client';

import { Suspense } from 'react';
import InvoiceForm from '@/components/invoice/InvoiceForm';

export default function CreateInvoicePage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Create Invoice</h2>
          <p className="text-muted-foreground">Create a new invoice for a customer.</p>
        </div>
      </div>
      <Suspense fallback={<div>Loading form...</div>}>
        <InvoiceForm />
      </Suspense>
    </div>
  );
}
