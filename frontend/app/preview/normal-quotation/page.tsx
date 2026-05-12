'use client';

import { useSearchParams } from 'next/navigation';
import ProductNormalQuotation from '../../../public/quatationLayouts/productsalequatation/normal/productnormalqatation';
import SparePartsNormalQuotation from '../../../public/quatationLayouts/sparepartsalequatation/normal/sparepartsnormalquatation';

export default function NormalQuotationPreviewPage() {
  const searchParams = useSearchParams();
  const category = searchParams.get('category');
  const isSparePart = category === 'sparepart';

  return (
    <div style={{ backgroundColor: '#e5e7eb', minHeight: '100vh', padding: '40px 0' }}>
      {isSparePart ? <SparePartsNormalQuotation /> : <ProductNormalQuotation />}
    </div>
  );
}
