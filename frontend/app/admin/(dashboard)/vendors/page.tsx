'use client';

import React from 'react';
import VendorTable from '@/components/AdminDahboardComponents/VendorComponents/VendorTable';

export default function VendorsPage() {
  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-8 sm:space-y-10 bg-blue-100 min-h-screen">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold text-primary">Vendor Management</h2>
          <p className="text-sm text-muted-foreground">
            Manage suppliers, distributors, and service providers
          </p>
        </div>
      </div>

      <div className="space-y-4 sm:space-y-6">
        <VendorTable basePath="/admin" />
      </div>
    </div>
  );
}
