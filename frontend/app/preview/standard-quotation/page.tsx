'use client';

import { useSearchParams } from 'next/navigation';
import ProductStandardQuotation from '../../../public/quatationLayouts/productsalequatation/statnderd/productstatnderdquatation';
import SparePartsStandardQuotation from '../../../public/quatationLayouts/sparepartsalequatation/standerd/sparepartsstanderdquatation';
import RentStandardQuotation from '../../../public/quatationLayouts/rentquatation/stanterd/rentstanderdquatation';

export default function StandardQuotationPreviewPage() {
  const searchParams = useSearchParams();
  const category = searchParams.get('category');
  const isSparePart = category === 'sparepart';
  const isRental = category === 'rental';

  return (
    <div style={{ backgroundColor: '#e5e7eb', minHeight: '100vh', padding: '40px 0' }}>
      {isSparePart ? (
        <SparePartsStandardQuotation />
      ) : isRental ? (
        <RentStandardQuotation />
      ) : (
        <ProductStandardQuotation />
      )}
    </div>
  );
}
