'use client';

import { useSearchParams } from 'next/navigation';
import ProductStandardQuotation from '../../../public/quatationLayouts/productsalequatation/statnderd/productstatnderdquatation';
import SparePartsStandardQuotation from '../../../public/quatationLayouts/sparepartsalequatation/standerd/sparepartsstanderdquatation';

export default function StandardQuotationPreviewPage() {
  const searchParams = useSearchParams();
  const category = searchParams.get('category');
  const isSparePart = category === 'sparepart';

  return (
    <div style={{ backgroundColor: '#e5e7eb', minHeight: '100vh', padding: '40px 0' }}>
      {isSparePart ? <SparePartsStandardQuotation /> : <ProductStandardQuotation />}
    </div>
  );
}
