import React from 'react';

export interface QuotationLineItem {
  brand: string;
  modelNo?: string;
  modelName?: string;
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
  warranty?: string;
  features?: { subHeading: string; description: string }[];
}

export interface SparePartsStandardQuotationProps {
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

const SparePartsStandardQuotation: React.FC<SparePartsStandardQuotationProps> = ({
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
  const purpleColor = '#7c3aed';
  const lightBg = '#f3f7f9';
  const tableAltRow = '#f8fafc';
  const textColor = '#1a1a1a';
  const mutedText = '#64748b';

  return (
    <div
      style={{
        fontFamily: "'Inter', sans-serif",
        backgroundColor: '#ffffff',
        width: '900px',
        minHeight: '1123px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        color: textColor,
        fontSize: '13px',
        boxSizing: 'border-box',
        padding: '60px 48px',
      }}
    >
      {/* ─── HEADER SECTION ─── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '30px',
        }}
      >
        <div>
          <div
            style={{ fontWeight: '700', fontSize: '18px', color: textColor, marginBottom: '4px' }}
          >
            Xerocare trading & services W.L.L
          </div>
          <div style={{ color: mutedText, fontSize: '12px', lineHeight: '1.6' }}>
            <div>Agrico Quarter, Doha, Qatar</div>
            <div>mail@xerocare.com</div>
            <div>+974 7071 7282</div>
            <div>www.xerocare.com</div>
          </div>
        </div>

        <img
          src="/quatationLayouts/productsalequatation/normal/normallogo/xerocarelogo-removebg-preview.png"
          alt="Xerocare Logo"
          style={{ width: '120px', height: 'auto', objectFit: 'contain' }}
        />
      </div>

      <div style={{ borderTop: '2px solid #f1f5f9', marginBottom: '30px' }} />

      <div
        style={{
          marginBottom: '30px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h1
          style={{
            color: purpleColor,
            fontSize: '28px',
            margin: 0,
            fontWeight: '800',
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}
        >
          Quotation
        </h1>
        <div style={{ textAlign: 'right' }}>
          <div
            style={{ display: 'flex', gap: '8px', marginBottom: '2px', justifyContent: 'flex-end' }}
          >
            <span style={{ color: mutedText, fontWeight: '600' }}>No:</span>
            <span style={{ fontWeight: '700' }}>{quotation.number}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <span style={{ color: mutedText, fontWeight: '600' }}>Date:</span>
            <span style={{ fontWeight: '700' }}>{quotation.date}</span>
          </div>
        </div>
      </div>

      {/* ─── INFO BOXES ─── */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '10px' }}>
        {/* Quotation By */}
        <div style={{ flex: 1, backgroundColor: lightBg, padding: '20px', borderRadius: '4px' }}>
          <div
            style={{ color: mutedText, fontSize: '12px', fontWeight: '600', marginBottom: '12px' }}
          >
            Quotation by
          </div>
          <div style={{ fontWeight: '700', marginBottom: '8px' }}>
            Xerocare trading & services W.L.L
          </div>

          <div style={{ display: 'flex', gap: '15px', marginBottom: '6px' }}>
            <span style={{ color: mutedText, fontSize: '12px', minWidth: '60px' }}>Address</span>
            <span style={{ fontSize: '12px' }}>Agrico Quarter, Doha, Qatar</span>
          </div>
        </div>

        {/* Quotation To */}
        <div style={{ flex: 1, backgroundColor: lightBg, padding: '20px', borderRadius: '4px' }}>
          <div
            style={{ color: mutedText, fontSize: '12px', fontWeight: '600', marginBottom: '12px' }}
          >
            Quotation to
          </div>
          <div style={{ fontWeight: '700', marginBottom: '8px' }}>{billTo.name}</div>

          <div style={{ display: 'flex', gap: '15px', marginBottom: '6px' }}>
            <span style={{ color: mutedText, fontSize: '12px', minWidth: '60px' }}>Address</span>
            <span style={{ fontSize: '12px' }}>{billTo.address}</span>
          </div>
          <div style={{ display: 'flex', gap: '15px', marginBottom: '6px' }}>
            <span style={{ color: mutedText, fontSize: '12px', minWidth: '60px' }}>Contact</span>
            <span style={{ fontSize: '12px' }}>
              {billTo.phone || '---'} {billTo.email ? `| ${billTo.email}` : ''}
            </span>
          </div>
        </div>
      </div>

      {/* ─── SUBJECT LINE ─── */}
      <div
        style={{
          padding: '10px 0',
          fontSize: '14px',
          fontWeight: '700',
          color: textColor,
          marginBottom: '10px',
        }}
      >
        Subject: Spare Part Sale Quotation
      </div>

      {/* ─── BRAND / MODEL / SL ROW ─── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '60px',
          padding: '12px',
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '4px',
          marginBottom: '20px',
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
          <span style={{ fontWeight: '700', fontSize: '12px', color: textColor }}>
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
          <span style={{ fontWeight: '700', fontSize: '12px', color: textColor }}>
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
          <span style={{ fontWeight: '700', fontSize: '12px', color: textColor }}>
            {lineItems[0]?.slNo || 'TBD'}
          </span>
        </div>
      </div>

      {/* ─── TABLE ─── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
        <thead>
          <tr style={{ backgroundColor: purpleColor, color: '#ffffff' }}>
            <th
              style={{
                padding: '12px 10px',
                textAlign: 'left',
                fontWeight: '600',
                borderRadius: '4px 0 0 0',
                fontSize: '11px',
                width: '12%',
              }}
            >
              MPN
            </th>
            <th
              style={{
                padding: '12px 10px',
                textAlign: 'left',
                fontWeight: '600',
                fontSize: '11px',
                width: '50%',
              }}
            >
              Description
            </th>
            <th
              style={{
                padding: '12px 10px',
                textAlign: 'center',
                fontWeight: '600',
                fontSize: '11px',
                width: '8%',
              }}
            >
              Qty
            </th>
            <th
              style={{
                padding: '12px 10px',
                textAlign: 'right',
                fontWeight: '600',
                fontSize: '11px',
                width: '10%',
              }}
            >
              Rate
            </th>
            <th
              style={{
                padding: '12px 10px',
                textAlign: 'right',
                fontWeight: '600',
                fontSize: '11px',
                width: '8%',
              }}
            >
              Discount
            </th>
            <th
              style={{
                padding: '12px 10px',
                textAlign: 'right',
                fontWeight: '600',
                borderRadius: '0 4px 0 0',
                fontSize: '11px',
                width: '12%',
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
                backgroundColor: idx % 2 === 1 ? tableAltRow : 'transparent',
                height: '320px',
              }}
            >
              <td
                style={{
                  padding: '12px 10px',
                  fontSize: '11px',
                  fontWeight: '600',
                  textAlign: 'center',
                }}
              >
                {item.mpn || '---'}
              </td>
              <td style={{ padding: 0, position: 'relative', overflow: 'hidden' }}>
                {item.productImage && (
                  <img
                    src={item.productImage}
                    alt="bg"
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '100%',
                      height: '110%',
                      objectFit: 'contain',
                      opacity: 0.25,
                      zIndex: 0,
                      pointerEvents: 'none',
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
                      fontSize: '16px',
                      color: textColor,
                      fontWeight: '600',
                      maxWidth: '95%',
                      lineHeight: '1.6',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: '800',
                        color: '#dc2626',
                        textTransform: 'uppercase',
                        marginBottom: '6px',
                      }}
                    >
                      Product Description
                    </div>
                    {item.description}
                    {item.warranty && (
                      <div
                        style={{
                          marginTop: '8px',
                          fontSize: '12px',
                          color: '#000',
                          fontWeight: '400',
                          textTransform: 'uppercase',
                        }}
                      >
                        <span style={{ color: '#dc2626', fontWeight: '700' }}>Warranty: </span>
                        {(() => {
                          const parts = item.warranty.split(' ');
                          if (parts.length >= 2) {
                            return (
                              <>
                                <span style={{ color: '#dc2626' }}>
                                  {parts[0]} {parts[1]}
                                </span>
                                <span> {parts.slice(2).join(' ')}</span>
                              </>
                            );
                          }
                          return <span style={{ color: '#dc2626' }}>{item.warranty}</span>;
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              </td>
              <td style={{ padding: '12px 10px', textAlign: 'center' }}>{item.qty}</td>
              <td style={{ padding: '12px 10px', textAlign: 'right' }}>{fmt(item.unitPrice)}</td>
              <td
                style={{
                  padding: '12px 10px',
                  textAlign: 'right',
                  color: item.discount ? '#16a34a' : textColor,
                }}
              >
                {item.discount ? `${fmt(item.discount)}` : '0.00'}
              </td>
              <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '700' }}>
                {fmt(item.amount)}
              </td>
            </tr>
          ))}
          {/* Fill empty space if few items */}
          {lineItems.length < 5 &&
            Array.from({ length: 5 - lineItems.length }).map((_, i) => (
              <tr
                key={`empty-${i}`}
                style={{
                  backgroundColor: (lineItems.length + i) % 2 === 1 ? tableAltRow : 'transparent',
                }}
              >
                <td style={{ padding: '20px', height: '35px' }}></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
            ))}
        </tbody>
      </table>

      {/* ─── TOTALS & FOOTER ─── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '40px' }}>
        <div style={{ width: '300px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '8px 0',
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            <span style={{ color: mutedText, fontWeight: '400' }}>Subtotal (Before VAT)</span>
            <span style={{ fontWeight: '400' }}>QAR {fmt(totals.subTotal)}</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '8px 0',
              borderBottom: '1px solid #f1f5f9',
              color: '#16a34a',
            }}
          >
            <span style={{ fontWeight: '400' }}>Discount</span>
            <span style={{ fontWeight: '400' }}>- QAR {fmt(totals.discountTotal || 0)}</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '8px 0',
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            <span style={{ color: mutedText, fontWeight: '400' }}>VAT Amount</span>
            <span style={{ fontWeight: '400' }}>QAR {fmt(totals.vatTotal)}</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '12px 0',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '16px', fontWeight: '800', color: textColor }}>
              Grand Total (Including VAT)
            </span>
            <span style={{ fontSize: '24px', fontWeight: '900', color: purpleColor }}>
              QAR {fmt(totals.total)}
            </span>
          </div>
          <div
            style={{
              marginTop: '10px',
              backgroundColor: '#f8fafc',
              padding: '12px',
              borderRadius: '4px',
              borderLeft: `4px solid ${purpleColor}`,
            }}
          >
            <div
              style={{
                fontSize: '10px',
                color: mutedText,
                fontWeight: '700',
                textTransform: 'uppercase',
                marginBottom: '4px',
              }}
            >
              Amount in Words
            </div>
            <div style={{ fontWeight: '800', fontSize: '11px', lineHeight: '1.4' }}>
              {numberToWords(totals.total)} Qatari Riyals Only
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '40px', position: 'relative' }}>
            <img
              src="/seel/seel1.png"
              alt="Seal"
              style={{
                position: 'absolute',
                left: '-50px',
                top: '-65px',
                width: '100px',
                height: 'auto',
                transform: 'rotate(-15deg)',
              }}
            />
            <div
              style={{ borderTop: '1px solid #000', width: '150px', margin: '0 auto 5px' }}
            ></div>
            <div style={{ fontSize: '11px', fontWeight: '600' }}>Authorized Signature</div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {/* ─── FOOTER SECTION ─── */}
      <div
        style={{
          backgroundColor: lightBg,
          borderTop: '1px solid #e2e8f0',
          padding: '40px 48px',
          margin: '0 -48px -60px -48px',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ fontSize: '11px', color: '#444', lineHeight: '1.8' }}>
          <div style={{ fontWeight: '700', color: textColor }}>
            Xerocare trading & services W.L.L
          </div>
          <div>Agrico Quarter, Doha, Qatar</div>
          <div>+974 7071 7282</div>
        </div>
        <div style={{ fontSize: '11px', color: '#444', textAlign: 'right', lineHeight: '1.8' }}>
          <div>Email: mail@xerocare.com</div>
          <div>Web: www.xerocare.com</div>
          <div style={{ fontWeight: '700', color: textColor, marginTop: '5px' }}>BEST REGARDS</div>
        </div>
      </div>
    </div>
  );
};

// Simple number to words function for demonstration (Indian format or simplified)
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
  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const remainder = Math.floor(num);

  if (crore > 0) totalStr += convertGroup(crore) + 'Crore ';
  if (lakh > 0) totalStr += convertGroup(lakh) + 'Lakh ';
  if (thousand > 0) totalStr += convertGroup(thousand) + 'Thousand ';
  if (remainder > 0) totalStr += convertGroup(remainder);

  return totalStr.trim();
}

export default SparePartsStandardQuotation;
