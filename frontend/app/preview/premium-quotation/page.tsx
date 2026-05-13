'use client';

import { useSearchParams } from 'next/navigation';
import ProductPremiumQuotation from '../../../public/quatationLayouts/productsalequatation/premium/productpremiumquatation';
import SparePartsPremiumQuotation from '../../../public/quatationLayouts/sparepartsalequatation/premium/sparepartspremiumquatation';
import RentPremiumQuotation from '../../../public/quatationLayouts/rentquatation/premium/rentpremiumquatation';

export default function PremiumQuotationPreviewPage() {
  const searchParams = useSearchParams();
  const category = searchParams.get('category');
  const isSparePart = category === 'sparepart';
  const isRental = category === 'rental';

  return (
    <div style={{ backgroundColor: '#ffffff', minHeight: '100vh', padding: '40px 0' }}>
      {isSparePart ? (
        <SparePartsPremiumQuotation />
      ) : isRental ? (
        <RentPremiumQuotation
          billTo={{ name: 'XEROCARE W. L. L', email: 'mail@xerocare.com', phone: '+974 7071 7282' }}
          quotation={{
            number: 'EST-PRM-001',
            date: '13/05/2026',
            terms: 'Due on Receipt',
            dueDate: '13/05/2026',
            contractStartDate: '13/05/2026',
            contractEndDate: '12/05/2027',
          }}
          lineItems={[
            {
              model: 'ALTA Link C8130',
              description:
                'Xerox AltaLink C8130 Color Multifunction Printer\n- Speed: 30 PPM\n- High Quality Color Output',
              qty: 1,
              limit: 'Color: 1000, BW: 2000',
              excessRate: 'Color: 0.150, BW: 0.050',
              image: '/quatationLayouts/rentquatation/stanterd/img/machine.png',
              bwSlabs: [
                { from: 1, to: 2000, rate: 0.0 },
                { from: 2001, to: 5000, rate: 0.045 },
                { from: 5001, to: 999999, rate: 0.04 },
              ],
              colorSlabs: [
                { from: 1, to: 1000, rate: 0.0 },
                { from: 1001, to: 3000, rate: 0.15 },
                { from: 3001, to: 999999, rate: 0.13 },
              ],
            },
          ]}
          agreementDetails={{
            rentType: 'Fixed Flat',
            period: 'Monthly',
            advance: 3500,
            deposit: 5000,
            duration: '36 Months',
            monthlyRentAmount: 3500,
            discountPercent: 0,
            discountedMonthlyRent: 3500,
          }}
          totals={{ subTotal: 3500, tax: 0, total: 3500 }}
        />
      ) : (
        <ProductPremiumQuotation />
      )}
    </div>
  );
}
