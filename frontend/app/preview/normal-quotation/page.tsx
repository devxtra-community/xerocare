'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ProductNormalQuotation from '../../../public/quatationLayouts/productsalequatation/normal/productnormalqatation';
import SparePartsNormalQuotation from '../../../public/quatationLayouts/sparepartsalequatation/normal/sparepartsnormalquatation';
import RentNormalQuotation from '../../../public/quatationLayouts/rentquatation/normal/rentnormalquatatio';
import LeaseNormalQuotation from '../../../public/quatationLayouts/leasequatation/normal/leasenormalquatation';

function NormalQuotationPreviewContent() {
  const searchParams = useSearchParams();
  const category = searchParams.get('category');
  const isSparePart = category === 'sparepart';
  const isRental = category === 'rental' || category === 'rent';
  const isLease = category === 'lease';

  return (
    <div style={{ backgroundColor: '#e5e7eb', minHeight: '100vh', padding: '40px 0' }}>
      {isSparePart ? (
        <SparePartsNormalQuotation />
      ) : isRental ? (
        <RentNormalQuotation />
      ) : isLease ? (
        <LeaseNormalQuotation />
      ) : (
        <ProductNormalQuotation />
      )}
    </div>
  );
}

export default function NormalQuotationPreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <NormalQuotationPreviewContent />
    </Suspense>
  );
}
