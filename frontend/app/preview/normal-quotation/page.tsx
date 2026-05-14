'use client';

import { useSearchParams } from 'next/navigation';
import ProductNormalQuotation from '../../../public/quatationLayouts/productsalequatation/normal/productnormalqatation';
import SparePartsNormalQuotation from '../../../public/quatationLayouts/sparepartsalequatation/normal/sparepartsnormalquatation';
import RentNormalQuotation from '../../../public/quatationLayouts/rentquatation/normal/rentnormalquatatio';
import LeaseNormalQuotation from '../../../public/quatationLayouts/leasequatation/normal/leasenormalquatation';

export default function NormalQuotationPreviewPage() {
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
