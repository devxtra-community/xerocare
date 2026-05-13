import React from 'react';

export interface QuotationLineItem {
  brand: string;
  modelNo: string;
  slNo: string;
  description: string;
  qty: number;
  unitPrice: number;
  specialPrice: number;
  amount: number;
  vat: number;
  productImage?: string;
  productName?: string;
  discount?: number;
  mpn?: string;
}

export interface SparePartsPremiumQuotationProps {
  /** Subject line – product name */
  productName?: string;
  /** Subject line – model name */
  modelName?: string;
  /** Bill-to customer info */
  billTo?: {
    name: string;
    address?: string;
    trn?: string;
    pan?: string;
    email?: string;
    phone?: string;
  };
  /** Ship-to customer info */
  shipTo?: {
    name: string;
    address: string;
    email?: string;
    phone?: string;
    placeOfSupply?: string;
    countryOfSupply?: string;
  };
  /** Quotation meta */
  quotation?: {
    number: string;
    date: string;
    terms: string;
    dueDate: string;
  };
  /** Table line items */
  lineItems?: QuotationLineItem[];
  /** Totals */
  totals?: {
    subTotal: number;
    vatTotal: number;
    total: number;
    payment: number;
    balanceDue: number;
    paid: boolean;
    discountTotal?: number;
  };
}

const fmt = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const SparePartsPremiumQuotation: React.FC<SparePartsPremiumQuotationProps> = ({
  modelName = '',
  billTo = {
    name: 'XEROCARE W. L. L',
    address: 'Agrico Quarter, Doha, Qatar',
    trn: '',
    email: '',
    phone: '',
  },
  quotation = {
    number: 'EST-001',
    date: '12/05/2026',
    terms: 'Due on receipt',
    dueDate: '12/05/2026',
  },
  lineItems = [],
  totals = {
    subTotal: 0.0,
    vatTotal: 0.0,
    total: 0.0,
    payment: 0.0,
    balanceDue: 0.0,
    paid: false,
    discountTotal: 0.0,
  },
}) => {
  const primaryRed = '#dc2626'; // Red 600
  const accentRed = '#991b1b'; // Red 800
  const bgColor = '#0f171c'; // Deep Slate/Black-Gray for premium tech feel
  const textColor = '#f8fafc'; // Very light gray/white
  const mutedText = '#94a3b8'; // Muted gray for dark bg

  return (
    <div
      style={{
        fontFamily: "'Inter', sans-serif",
        backgroundColor: bgColor,
        width: '900px',
        minHeight: '1123px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        color: textColor,
        fontSize: '13px',
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* ─── PREMIUM HEADER DESIGN ─── */}
      <div style={{ position: 'relative', height: '180px', overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '140px',
            background: `linear-gradient(135deg, ${primaryRed} 0%, ${accentRed} 100%)`,
            transform: 'skewY(-3deg)',
            transformOrigin: 'top left',
            zIndex: 1,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '300px',
            height: '140px',
            backgroundColor: '#7f1d1d',
            zIndex: 2,
            clipPath: 'polygon(20% 0%, 100% 0%, 100% 100%, 0% 100%)',
          }}
        />

        <div
          style={{
            position: 'relative',
            zIndex: 10,
            padding: '40px 48px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {/* Logo Section */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div
              style={{
                backgroundColor: '#fff',
                borderRadius: '50%',
                width: '70px',
                height: '70px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              }}
            >
              <img
                src="/quatationLayouts/productsalequatation/normal/normallogo/xerocarelogo-removebg-preview.png"
                alt="Logo"
                style={{ width: '55px', height: 'auto' }}
              />
            </div>
            <div>
              <div
                style={{ color: '#fff', fontSize: '24px', fontWeight: '900', letterSpacing: '1px' }}
              >
                XEROCARE
              </div>
              <div
                style={{
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '3px',
                }}
              >
                Trading & Services
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right', color: '#fff', marginTop: '10px' }}>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>Agrico Quarter, Doha, Qatar</div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>+974 7071 7282 | mail@xerocare.com</div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>www.xerocare.com</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 48px' }}>
        {/* Title Section */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '30px',
          }}
        >
          <div>
            <h1
              style={{
                color: primaryRed,
                fontSize: '42px',
                margin: 0,
                fontWeight: '900',
                textTransform: 'uppercase',
              }}
            >
              Quotation
            </h1>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontSize: '11px',
                color: mutedText,
                fontWeight: '700',
                textTransform: 'uppercase',
              }}
            >
              No: {quotation.number}
            </div>
            <div
              style={{
                fontSize: '11px',
                color: mutedText,
                fontWeight: '700',
                textTransform: 'uppercase',
              }}
            >
              Date: {quotation.date}
            </div>
          </div>
        </div>

        {/* ─── INFO BOXES ─── */}
        <div style={{ display: 'flex', gap: '30px', marginBottom: '30px' }}>
          <div style={{ flex: 1 }}>
            <div
              style={{
                color: primaryRed,
                fontSize: '10px',
                fontWeight: '800',
                textTransform: 'uppercase',
                marginBottom: '10px',
              }}
            >
              Quotation By
            </div>
            <div style={{ fontWeight: '700', marginBottom: '8px', fontSize: '14px' }}>
              Xerocare trading & services W.L.L
            </div>
            <div style={{ fontSize: '11px', color: mutedText, lineHeight: '1.6' }}>
              <div>Address: Agrico Quarter, Doha, Qatar</div>
              <div>Contact: +974 7071 7282</div>
            </div>
          </div>

          {/* Quotation To */}
          <div style={{ flex: 1 }}>
            <div
              style={{
                color: primaryRed,
                fontSize: '10px',
                fontWeight: '800',
                textTransform: 'uppercase',
                marginBottom: '10px',
              }}
            >
              Quotation To
            </div>
            <div style={{ fontWeight: '700', marginBottom: '8px', fontSize: '14px' }}>
              {billTo.name}
            </div>
            <div style={{ fontSize: '11px', color: mutedText, lineHeight: '1.6' }}>
              <div>Address: {billTo.address || '---'}</div>
              <div>
                Contact: {billTo.phone || '---'} {billTo.email ? `| ${billTo.email}` : ''}
              </div>
            </div>
          </div>
        </div>

        {/* ─── SUBJECT ─── */}
        <div
          style={{
            backgroundColor: 'rgba(255,255,255,0.05)',
            padding: '12px 20px',
            borderRadius: '4px',
            borderLeft: `5px solid ${primaryRed}`,
            marginBottom: '20px',
          }}
        >
          <span style={{ fontWeight: '700', color: primaryRed }}>Subject: </span>
          <span style={{ fontWeight: '600' }}>Spare Part Sale Quotation</span>
        </div>

        {/* ─── BRAND / MODEL / SL ROW ─── */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '60px',
            padding: '12px',
            backgroundColor: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '4px',
            marginBottom: '25px',
          }}
        >
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span
              style={{
                fontWeight: '800',
                fontSize: '10px',
                color: mutedText,
                textTransform: 'uppercase',
              }}
            >
              Brand
            </span>
            <span style={{ fontWeight: '700', fontSize: '13px' }}>
              {lineItems[0]?.brand || '---'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span
              style={{
                fontWeight: '800',
                fontSize: '10px',
                color: mutedText,
                textTransform: 'uppercase',
              }}
            >
              Model
            </span>
            <span style={{ fontWeight: '700', fontSize: '13px' }}>
              {lineItems[0]?.modelNo || modelName || '---'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span
              style={{
                fontWeight: '800',
                fontSize: '10px',
                color: mutedText,
                textTransform: 'uppercase',
              }}
            >
              S/N
            </span>
            <span style={{ fontWeight: '700', fontSize: '13px' }}>
              {lineItems[0]?.slNo || 'TBD'}
            </span>
          </div>
        </div>

        {/* ─── TABLE ─── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
          <thead>
            <tr
              style={{
                background: `linear-gradient(to right, ${primaryRed}, ${accentRed})`,
                color: '#ffffff',
              }}
            >
              <th
                style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontWeight: '800',
                  fontSize: '10px',
                  textTransform: 'uppercase',
                }}
              >
                MPN
              </th>
              <th
                style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontWeight: '800',
                  fontSize: '10px',
                  textTransform: 'uppercase',
                }}
              >
                Description
              </th>
              <th
                style={{
                  padding: '12px',
                  textAlign: 'center',
                  fontWeight: '800',
                  fontSize: '10px',
                  textTransform: 'uppercase',
                }}
              >
                Qty
              </th>
              <th
                style={{
                  padding: '12px',
                  textAlign: 'right',
                  fontWeight: '800',
                  fontSize: '10px',
                  textTransform: 'uppercase',
                }}
              >
                Rate
              </th>
              <th
                style={{
                  padding: '12px',
                  textAlign: 'right',
                  fontWeight: '800',
                  fontSize: '10px',
                  textTransform: 'uppercase',
                }}
              >
                Discount
              </th>
              <th
                style={{
                  padding: '12px',
                  textAlign: 'right',
                  fontWeight: '800',
                  fontSize: '10px',
                  textTransform: 'uppercase',
                }}
              >
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item, idx) => (
              <tr
                key={idx}
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  backgroundColor: idx % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent',
                  height: '320px',
                }}
              >
                <td style={{ padding: '12px', fontSize: '11px', fontWeight: '600' }}>
                  {item.mpn || '---'}
                </td>
                <td
                  style={{
                    padding: 0,
                    position: 'relative',
                    overflow: 'hidden',
                    zIndex: 1,
                  }}
                >
                  {item.productImage && (
                    <img
                      src={item.productImage}
                      alt=""
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        height: '110%',
                        width: '100%',
                        opacity: 0.25,
                        zIndex: -1,
                        pointerEvents: 'none',
                        objectFit: 'contain',
                        filter: 'grayscale(100%)',
                      }}
                    />
                  )}
                  <div
                    style={{
                      position: 'relative',
                      zIndex: 1,
                      padding: '24px',
                      textAlign: 'left',
                      height: '100%',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '11px',
                        color: mutedText,
                        fontWeight: '500',
                        maxWidth: '85%',
                        lineHeight: '1.4',
                      }}
                    >
                      {item.description}
                    </div>
                  </div>
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>{item.qty}</td>
                <td style={{ padding: '12px', textAlign: 'right' }}>{fmt(item.unitPrice)}</td>
                <td
                  style={{
                    padding: '12px',
                    textAlign: 'right',
                    color: item.discount ? '#f87171' : textColor,
                  }}
                >
                  {item.discount ? `${fmt(item.discount)}` : '0.00'}
                </td>
                <td style={{ padding: '12px', textAlign: 'right', fontWeight: '700' }}>
                  {fmt(item.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ─── BOTTOM SECTION ─── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto' }}>
          {/* Terms info */}
          <div style={{ flex: 1.2 }}>
            <div style={{ marginBottom: '25px' }}>
              <div
                style={{
                  color: primaryRed,
                  fontWeight: '800',
                  fontSize: '13px',
                  marginBottom: '10px',
                  textTransform: 'uppercase',
                }}
              >
                Terms & Conditions
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: mutedText,
                  lineHeight: '1.7',
                  whiteSpace: 'pre-line',
                  maxWidth: '400px',
                }}
              >
                {quotation.terms ||
                  '1. Please pay within 15 days from the date of invoice.\n2. Overdue interest @ 14% will be charged on delayed payments.\n3. Please quote invoice number when remitting funds.'}
              </div>
            </div>
          </div>

          {/* Totals Box */}
          <div style={{ flex: 0.8, minWidth: '250px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 0',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <span style={{ color: mutedText, fontWeight: '700', fontSize: '11px' }}>
                SUB TOTAL
              </span>
              <span style={{ fontWeight: '700' }}>QAR {fmt(totals.subTotal)}</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 0',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                color: '#f87171',
              }}
            >
              <span style={{ fontWeight: '700', fontSize: '11px' }}>DISCOUNT</span>
              <span style={{ fontWeight: '700' }}>- QAR {fmt(totals.discountTotal || 0)}</span>
            </div>

            <div
              style={{
                background: `linear-gradient(135deg, ${primaryRed}, ${accentRed})`,
                color: '#fff',
                padding: '15px 20px',
                marginTop: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderRadius: '2px',
                boxShadow: '0 4px 10px rgba(220, 38, 38, 0.2)',
              }}
            >
              <span style={{ fontWeight: '900', fontSize: '14px' }}>TOTAL</span>
              <span style={{ fontWeight: '900', fontSize: '20px' }}>QAR {fmt(totals.total)}</span>
            </div>

            <div style={{ marginTop: '15px', textAlign: 'right' }}>
              <div style={{ fontSize: '9px', color: mutedText, fontWeight: '800' }}>
                AMOUNT IN WORDS
              </div>
              <div
                style={{
                  fontWeight: '700',
                  fontSize: '11px',
                  color: primaryRed,
                  lineHeight: '1.4',
                }}
              >
                {numberToWords(totals.total)} Qatari Riyals Only
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '40px', position: 'relative' }}>
              <img
                src="/seel/seel1.png"
                alt="Seal"
                style={{
                  position: 'absolute',
                  right: '-10px',
                  top: '-45px',
                  width: '100px',
                  height: 'auto',
                  opacity: 0.8,
                  transform: 'rotate(-15deg)',
                }}
              />
              <div
                style={{ borderTop: '1px solid #fff', width: '150px', margin: '0 auto 5px' }}
              ></div>
              <div style={{ fontSize: '10px', fontWeight: '800', color: mutedText }}>
                AUTHORISED SIGNATURE
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {/* ─── FOOTER BAR ─── */}
      <div
        style={{
          backgroundColor: 'rgba(255,255,255,0.03)',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          padding: '30px 48px',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: mutedText,
        }}
      >
        <div>
          <div style={{ fontWeight: '800', color: '#fff', marginBottom: '4px' }}>
            XEROCARE TRADING & SERVICES W.L.L
          </div>
          <div>Agrico Quarter, Doha, Qatar</div>
          <div>Phone: +974 7071 7282</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div>Email: mail@xerocare.com</div>
          <div>Web: www.xerocare.com</div>
          <div style={{ fontWeight: '800', color: primaryRed, marginTop: '4px' }}>BEST REGARDS</div>
        </div>
      </div>
    </div>
  );
};

function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = [
    '',
    '',
    'Twenty',
    'Thirty',
    'Forty',
    'Fifty',
    'Sixty',
    'Seventy',
    'Eighty',
    'Ninety',
  ];
  const teens = [
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];

  const convertGroup = (n: number): string => {
    let res = '';
    if (n >= 100) {
      res += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 10 && n <= 19) {
      res += teens[n - 10] + ' ';
    } else if (n >= 20) {
      res += tens[Math.floor(n / 10)] + ' ' + ones[n % 10] + ' ';
    } else if (n > 0) {
      res += ones[n] + ' ';
    }
    return res;
  };

  if (num === 0) return 'Zero';

  let totalStr = '';
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const remainder = Math.floor(num);

  if (thousand > 0) totalStr += convertGroup(thousand) + 'Thousand ';
  if (remainder > 0) totalStr += convertGroup(remainder);

  return totalStr.trim();
}

export default SparePartsPremiumQuotation;
