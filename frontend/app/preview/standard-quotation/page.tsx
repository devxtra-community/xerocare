'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ProductStandardQuotation from '../../../public/quatationLayouts/productsalequatation/statnderd/productstatnderdquatation';
import SparePartsStandardQuotation from '../../../public/quatationLayouts/sparepartsalequatation/standerd/sparepartsstanderdquatation';
import RentStandardQuotation from '../../../public/quatationLayouts/rentquatation/stanterd/rentstanderdquatation';
import LeaseStandardQuotation from '../../../public/quatationLayouts/leasequatation/standerd/leasestanterdquatation';

function StandardQuotationPreviewContent() {
  const searchParams = useSearchParams();
  const category = searchParams.get('category');
  const isSparePart = category === 'sparepart';
  const isRental = category === 'rental';
  const isLease = category === 'lease';

  return (
    <div style={{ backgroundColor: '#e5e7eb', minHeight: '100vh', padding: '40px 0' }}>
      {isSparePart ? (
        <SparePartsStandardQuotation />
      ) : isRental ? (
        <RentStandardQuotation />
      ) : isLease ? (
        <LeaseStandardQuotation />
      ) : (
        <ProductStandardQuotation />
      )}
    </div>
  );
}

export default function StandardQuotationPreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <StandardQuotationPreviewContent />
    </Suspense>
  );
}
