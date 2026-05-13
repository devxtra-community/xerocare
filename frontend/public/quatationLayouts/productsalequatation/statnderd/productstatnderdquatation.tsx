import React from 'react';

export interface StandardQuotationLineItem {
  brand: string;
  modelNo: string;
  slNo: string;
  description: string;
  qty: number;
  unitPrice: number;
  specialPrice: number;
  vat: number;
  amount: number;
  /** Optional product image URL */
  productImage?: string;
  productName?: string;
  discount?: number;
}

export interface ProductStandardQuotationProps {
  /** Subject line – product name */
  productName?: string;
  /** Subject line – model name */
  modelName?: string;
  /** Bill-to customer info */
  billTo?: {
    name: string;
    address?: string;
    trn?: string;
  };
  /** Ship-to customer info */
  shipTo?: {
    name: string;
    address: string;
    email?: string;
    phone?: string;
  };
  /** Quotation meta */
  quotation?: {
    number: string;
    date: string;
    terms: string;
    dueDate: string;
  };
  /** Table line items */
  lineItems?: StandardQuotationLineItem[];
  /** Totals */
  totals?: {
    subTotal: number;
    discountTotal?: number;
    vatTotal: number;
    total: number;
    payment: number;
    balanceDue: number;
    paid: boolean;
  };
}

const TEAL = '#134D47';
const GOLD = '#F5A623';

const fmt = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ProductStandardQuotation: React.FC<ProductStandardQuotationProps> = ({
  productName = 'TONER CHIP SET',
  modelName = 'ALTALink C8130',
  billTo = {
    name: 'XEROCARE W. L. L',
    address: 'SHARJAH UAE',
    trn: 'TRN 104623568300003',
  },
  shipTo = {
    name: 'XEROCARE W. L. L',
    address: 'SHARJAH UAE',
  },
  quotation = {
    number: 'GCM/26/05/04101',
    date: '01/05/2026',
    terms: 'Due on receipt',
    dueDate: '01/05/2026',
  },
  lineItems = [
    {
      brand: 'Xerox',
      modelNo: 'C8130',
      slNo: 'SN123456',
      description: 'TONER CHIP SET (C/M/Y/K) | ALTALink C8130/35 | 006R01754/5/6/7',
      qty: 1,
      unitPrice: 50.0,
      specialPrice: 48.0,
      vat: 2.5,
      amount: 50.0,
      productImage: undefined,
    },
  ],
  totals = {
    subTotal: 50.0,
    vatTotal: 2.5,
    total: 52.5,
    payment: 52.5,
    balanceDue: 0.0,
    paid: true,
  },
}) => {
  return (
    <div
      style={{
        width: '900px',
        minHeight: '1191px',
        margin: '0 auto',
        backgroundColor: '#ffffff',
        position: 'relative',
        fontFamily: "'Inter', sans-serif",
        color: '#111111',
        overflow: 'hidden',
        boxShadow: '0 0 40px rgba(0,0,0,0.05)',
      }}
    >
      {/* ─── WAVE HEADER ─── */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '180px',
          backgroundColor: TEAL,
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {/* White wave cutout — bottom right sweeping up */}
        <svg
          viewBox="0 0 794 180"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
          }}
          preserveAspectRatio="none"
        >
          {/* Teal base */}
          <rect width="794" height="180" fill={TEAL} />
          {/* White wave sweeping from bottom-left to top-right */}
          <path d="M320,0 Q480,-30 794,0 L794,180 Q600,180 380,100 Q260,55 320,0 Z" fill="white" />
          {/* Gold accent wave */}
          <path
            d="M290,170 Q400,100 560,130 Q660,150 794,110 L794,180 L0,180 Z"
            fill={GOLD}
            opacity="0.9"
          />
        </svg>

        {/* Logo — top-left on teal section */}
        <div
          style={{
            position: 'absolute',
            top: '24px',
            left: '36px',
            zIndex: 10,
          }}
        >
          <img
            src="/quatationLayouts/productsalequatation/normal/normallogo/xerocarelogo-removebg-preview.png"
            alt="Xerocare Logo"
            style={{
              width: '120px',
              height: '120px',
              objectFit: 'contain',
            }}
          />
          <div
            style={{
              color: 'rgba(255,255,255,0.85)',
              fontSize: '10px',
              marginTop: '4px',
              letterSpacing: '0.1em',
              textAlign: 'center',
              textTransform: 'uppercase',
            }}
          >
            trading &amp; services
          </div>
        </div>

        {/* QUOTATION title — top-right on white section */}
        <div
          style={{
            position: 'absolute',
            top: '30px',
            right: '40px',
            zIndex: 10,
            textAlign: 'right',
          }}
        >
          <div
            style={{
              fontSize: '34px',
              fontWeight: '900',
              color: '#111111',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            QUOTATION
          </div>
          <div
            style={{
              fontSize: '11px',
              color: '#666',
              marginTop: '2px',
              letterSpacing: '0.05em',
            }}
          >
            Sub: {productName} &amp; {modelName}
          </div>
        </div>
      </div>

      {/* ─── META INFO (Quotation No / Date / Bill To) ─── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '24px 40px 18px',
        }}
      >
        {/* Left: Quotation meta */}
        <div style={{ lineHeight: '2' }}>
          <div>
            <span style={{ fontWeight: '700', fontSize: '12px' }}>QUOTATION NO : </span>
            <span style={{ fontSize: '12px' }}>{quotation.number}</span>
          </div>
          <div>
            <span style={{ fontWeight: '700', fontSize: '12px' }}>DATE : </span>
            <span style={{ fontSize: '12px' }}>{quotation.date}</span>
          </div>
          <div>
            <span style={{ fontWeight: '700', fontSize: '12px' }}>TERMS : </span>
            <span style={{ fontSize: '12px' }}>{quotation.terms}</span>
          </div>
          <div>
            <span style={{ fontWeight: '700', fontSize: '12px' }}>DUE DATE : </span>
            <span style={{ fontSize: '12px' }}>{quotation.dueDate}</span>
          </div>
        </div>

        {/* Bill To & Ship To */}
        <div style={{ display: 'flex', gap: '40px', textAlign: 'right' }}>
          {/* Bill To */}
          <div style={{ lineHeight: '1.8' }}>
            <div
              style={{
                fontWeight: '700',
                fontSize: '11px',
                color: '#888',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '4px',
              }}
            >
              Bill To
            </div>
            <div style={{ fontWeight: '700', fontSize: '13px', color: '#111' }}>{billTo.name}</div>
          </div>

          {/* Ship To */}
          <div style={{ lineHeight: '1.8' }}>
            <div
              style={{
                fontWeight: '700',
                fontSize: '11px',
                color: '#888',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '4px',
              }}
            >
              Ship To
            </div>
            <div style={{ fontWeight: '700', fontSize: '13px', color: '#111' }}>{shipTo.name}</div>
            <div style={{ fontSize: '12px', color: '#555' }}>{shipTo.email}</div>
            <div style={{ fontSize: '12px', color: '#555' }}>{shipTo.phone}</div>
          </div>
        </div>
      </div>

      {/* ─── TABLE ─── */}
      <div style={{ paddingLeft: '40px', paddingRight: '40px' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '11.5px',
          }}
        >
          {/* Header — solid teal bg, white text */}
          <thead>
            <tr style={{ backgroundColor: TEAL }}>
              {[
                { label: 'PRODUCT', width: '12%' },
                { label: 'BRAND', width: '7%' },
                { label: 'MODEL', width: '7%' },
                { label: 'S/N', width: '7%' },
                { label: 'DESCRIPTION', width: '43%' },
                { label: 'QTY', width: '4%' },
                { label: 'UNIT', width: '6%' },
                { label: 'DISC', width: '4%' },
                { label: 'PRICE', width: '6%' },
                { label: 'TOTAL', width: '7%' },
              ].map(({ label, width }) => (
                <th
                  key={label}
                  style={{
                    padding: '10px 6px',
                    color: '#ffffff',
                    fontWeight: '700',
                    fontSize: '9px',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    textAlign: label === 'DESCRIPTION' || label === 'IMAGE' ? 'left' : 'center',
                    border: 'none',
                    width,
                  }}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>

          {/* Body — rows separated by thin horizontal lines only */}
          <tbody>
            {lineItems.map((item, idx) => (
              <tr
                key={idx}
                style={{
                  borderBottom: '1px solid #e0e0e0',
                  backgroundColor: '#ffffff',
                  height: '320px',
                }}
              >
                <td style={bodyTd('left')}>
                  <div style={{ fontWeight: '700', color: '#111' }}>{item.productName}</div>
                </td>
                <td style={bodyTd('center')}>{item.brand}</td>
                <td style={bodyTd('center')}>{item.modelNo}</td>
                <td style={bodyTd('center')}>{item.slNo}</td>
                <td
                  style={{
                    ...bodyTd('left'),
                    lineHeight: '1.5',
                    whiteSpace: 'pre-line',
                    position: 'relative',
                    overflow: 'hidden',
                    padding: 0,
                  }}
                >
                  {/* Background Watermark Image */}
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
                        height: '120%',
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
                        fontSize: '11px',
                        color: '#333',
                        fontWeight: '600',
                        maxWidth: '85%',
                      }}
                    >
                      {item.description}
                    </div>
                  </div>
                </td>
                <td style={bodyTd('center')}>{item.qty}</td>
                <td style={bodyTd('center')}>{fmt(item.unitPrice)}</td>
                <td style={bodyTd('center')}>{fmt(item.discount || 0)}</td>
                <td style={bodyTd('center')}>{fmt(item.specialPrice)}</td>
                <td style={bodyTd('center')}>{fmt(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ─── TOTALS + PAYMENT INFO ─── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '28px 40px 16px',
          gap: '24px',
        }}
      >
        {/* Left: Company / Payment info */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontWeight: '700',
              fontSize: '12px',
              marginBottom: '8px',
              color: '#111',
            }}
          >
            PAYMENT INFO:
          </div>
          <div style={{ fontSize: '11px', color: '#555', lineHeight: '1.9' }}>
            <div>
              <span style={{ fontWeight: '600' }}>Company &nbsp;: </span>
              Xerocare trading &amp; services W.L.L
            </div>
            <div>
              <span style={{ fontWeight: '600' }}>Email &nbsp;&nbsp;&nbsp;&nbsp;: </span>
              mail@xerocare.com
            </div>
            <div>
              <span style={{ fontWeight: '600' }}>Phone &nbsp;&nbsp;&nbsp;: </span>
              +974 7071 7282
            </div>
            <div>
              <span style={{ fontWeight: '600' }}>Web &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: </span>
              www.xerocare.com
            </div>
          </div>

          <div style={{ marginTop: '18px' }}>
            <div
              style={{
                fontWeight: '700',
                fontSize: '12px',
                marginBottom: '6px',
                color: '#111',
              }}
            >
              TERMS AND CONDITIONS
            </div>
            <div
              style={{
                fontSize: '10.5px',
                color: '#666',
                lineHeight: '1.7',
                maxWidth: '320px',
              }}
            >
              Prices are valid for 30 days from the quotation date. All amounts are in QAR unless
              stated otherwise. VAT is applicable at the current rate. Delivery terms as per
              agreement.
            </div>
          </div>

          <div
            style={{
              marginTop: '20px',
              fontWeight: '700',
              fontSize: '12px',
              color: TEAL,
            }}
          >
            Thank you for your business
          </div>
        </div>

        {/* Right: SUB TOTAL / VAT / TOTAL */}
        <div style={{ width: '240px', alignSelf: 'flex-start' }}>
          {[
            { label: 'SUB TOTAL', value: fmt(totals.subTotal), bold: false },
            {
              label: 'DISCOUNT',
              value: `- ${fmt(totals.discountTotal || 0)}`,
              bold: false,
              color: GOLD,
            },
            { label: 'VAT TOTAL', value: fmt(totals.vatTotal), bold: false },
            { label: 'TOTAL', value: fmt(totals.total), bold: true },
            { label: 'PAYMENT', value: fmt(totals.payment), bold: false },
          ].map(({ label, value, bold, color }) => (
            <div
              key={label}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '4px 0',
                fontSize: '11.5px',
                fontWeight: bold ? '700' : '500',
                color: color || '#333',
              }}
            >
              <span
                style={{
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontSize: '10px',
                  fontWeight: bold ? '700' : '600',
                }}
              >
                {label}
              </span>
              <span>{value}</span>
            </div>
          ))}

          {/* Divider */}
          <div style={{ borderTop: '2px solid #222', margin: '8px 0' }} />

          {/* Grand Total */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontWeight: '800',
                fontSize: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              BALANCE DUE
            </span>
            <span style={{ fontWeight: '800', fontSize: '15px' }}>
              QAR {fmt(totals.balanceDue)}
            </span>
          </div>

          {totals.paid && (
            <div
              style={{
                textAlign: 'right',
                color: '#16a34a',
                fontWeight: '800',
                fontSize: '14px',
                letterSpacing: '0.08em',
                marginTop: '4px',
              }}
            >
              PAID
            </div>
          )}

          {/* Authorised Sign */}
          <div
            style={{
              marginTop: '40px',
              textAlign: 'right',
              position: 'relative',
            }}
          >
            <img
              src="/seel/seel1.png"
              alt="Seal"
              style={{
                position: 'absolute',
                right: '120px',
                top: '-45px',
                width: '100px',
                height: 'auto',
                transform: 'rotate(-15deg)',
              }}
            />
            <div
              style={{
                borderTop: '1px solid #333',
                width: '140px',
                marginLeft: 'auto',
                paddingTop: '6px',
                fontSize: '11px',
                color: '#555',
                letterSpacing: '0.05em',
              }}
            >
              Authorised Sign
            </div>
          </div>
        </div>
      </div>

      {/* ─── SPACER ─── */}
      <div style={{ flex: 1 }} />

      {/* ─── BOTTOM WAVE FOOTER ─── */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100px',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <svg
          viewBox="0 0 794 100"
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '100%',
            height: '100%',
          }}
          preserveAspectRatio="none"
        >
          {/* Gold accent wave */}
          <path
            d="M0,60 Q200,10 400,50 Q560,80 794,20 L794,100 L0,100 Z"
            fill={GOLD}
            opacity="0.85"
          />
          {/* Teal wave on top */}
          <path d="M0,80 Q200,35 420,65 Q600,90 794,45 L794,100 L0,100 Z" fill={TEAL} />
        </svg>

        {/* Footer contact info */}
        <div
          style={{
            position: 'absolute',
            bottom: '14px',
            left: '40px',
            color: 'rgba(255,255,255,0.9)',
            fontSize: '10px',
            display: 'flex',
            gap: '20px',
            zIndex: 10,
          }}
        >
          <span>✉ mail@xerocare.com</span>
          <span>☎ +974 7071 7282</span>
          <span>🌐 www.xerocare.com</span>
        </div>
      </div>
    </div>
  );
};

/** Shared body cell style */
function bodyTd(align: 'left' | 'center' | 'right'): React.CSSProperties {
  return {
    padding: '10px 6px',
    height: '260px',
    textAlign: align,
    border: 'none',
    color: '#222222',
    verticalAlign: 'middle',
    fontSize: '11.5px',
  };
}

export default ProductStandardQuotation;
