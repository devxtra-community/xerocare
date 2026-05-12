'use client';

import { useSearchParams } from 'next/navigation';
import ProductPremiumQuotation from '../../../public/quatationLayouts/productsalequatation/premium/productpremiumquatation';
import SparePartsPremiumQuotation from '../../../public/quatationLayouts/sparepartsalequatation/premium/sparepartspremiumquatation';

export default function PremiumQuotationPreviewPage() {
  const searchParams = useSearchParams();
  const category = searchParams.get('category');
  const isSparePart = category === 'sparepart';

  return (
    <div style={{ backgroundColor: '#1e1f29', minHeight: '100vh', padding: '40px 0' }}>
      {isSparePart ? <SparePartsPremiumQuotation /> : <ProductPremiumQuotation />}
    </div>
  );
}
