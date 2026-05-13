import React from 'react';

export interface PremiumQuotationLineItem {
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

export interface ProductPremiumQuotationProps {
  productName?: string;
  modelName?: string;
  billTo?: {
    name: string;
    address?: string;
    trn?: string;
  };
  shipTo?: {
    name: string;
    address: string;
    email?: string;
    phone?: string;
  };
  quotation?: {
    number: string;
    date: string;
    terms: string;
    dueDate: string;
  };
  lineItems?: PremiumQuotationLineItem[];
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

const BG_DARK = '#282a36'; // Main dark theme background
const BG_DARKER = '#21222c'; // Slightly darker for contrast
const ACCENT = '#f5a623'; // Gold accent for premium feel
const TEXT_LIGHT = '#f8f8f2';
const TEXT_MUTED = '#6272a4';

const fmt = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ProductPremiumQuotation: React.FC<ProductPremiumQuotationProps> = ({
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
    },
    {
      brand: 'Xerox',
      modelNo: 'C8130',
      slNo: 'SN123457',
      description: 'DRUM CARTRIDGE | ALTALink C8130',
      qty: 2,
      unitPrice: 15.0,
      specialPrice: 12.0,
      vat: 1.0,
      amount: 24.0,
    },
  ],
  totals = {
    subTotal: 74.0,
    vatTotal: 3.5,
    total: 77.5,
    payment: 77.5,
    balanceDue: 0.0,
    paid: true,
  },
}) => {
  return (
    <div
      className="premium-quotation-root"
      style={{
        width: '900px',
        height: '100%',
        minHeight: '1191px',
        margin: '0 auto',
        backgroundColor: BG_DARK,
        color: TEXT_LIGHT,
        fontFamily: "'Inter', sans-serif",
        position: 'relative',
        boxShadow: '0 0 50px rgba(0,0,0,0.3)',
        overflow: 'hidden',
      }}
    >
      {/* ─── BACKGROUND SHAPES ─── */}
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 842 1191"
        preserveAspectRatio="none"
        style={{ position: 'absolute', top: 0, left: 0, zIndex: 0 }}
      >
        <polygon points="0,0 450,0 300,300 0,300" fill={BG_DARKER} />
        <polygon points="400,1191 842,1191 842,800 600,1191" fill={BG_DARKER} />
      </svg>

      <div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: '1191px',
        }}
      >
        {/* ─── HEADER ─── */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '50px 50px 20px',
          }}
        >
          {/* Logo & Company */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img
              src="/quatationLayouts/productsalequatation/normal/normallogo/xerocarelogo-removebg-preview.png"
              alt="Xerocare Logo"
              style={{
                width: '100px',
                height: '100px',
                objectFit: 'contain',
              }}
            />
            <div>
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: '800',
                  letterSpacing: '0.05em',
                  color: '#fff',
                }}
              >
                XEROCARE
              </div>
              <div
                style={{
                  fontSize: '10px',
                  color: '#aaa',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                Trading &amp; Services W.L.L
              </div>
            </div>
          </div>

          {/* Title */}
          <div style={{ textAlign: 'right', marginTop: '10px' }}>
            <div
              style={{
                fontSize: '36px',
                fontWeight: '900',
                letterSpacing: '0.02em',
                color: '#fff',
                textTransform: 'uppercase',
              }}
            >
              QUOTATION
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                marginTop: '10px',
                fontSize: '10px',
                color: '#ccc',
              }}
            >
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontWeight: '700' }}
              >
                <span>Quotation Number:</span>
                <span>Creation Date:</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  textAlign: 'right',
                  color: '#fff',
                }}
              >
                <span>{quotation.number}</span>
                <span>{quotation.date}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── TO / FROM SECTION ─── */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '40px 50px',
            marginTop: '20px',
          }}
        >
          {/* Bill To & Ship To */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Bill To */}
            <div>
              <div
                style={{
                  color: '#aaa',
                  fontSize: '10px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  marginBottom: '8px',
                  letterSpacing: '0.05em',
                }}
              >
                Bill To:
              </div>
              <div
                style={{ fontSize: '16px', fontWeight: '800', color: '#fff', marginBottom: '4px' }}
              >
                {billTo.name}
              </div>
            </div>

            {/* Ship To */}
            <div>
              <div
                style={{
                  color: '#aaa',
                  fontSize: '10px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  marginBottom: '8px',
                  letterSpacing: '0.05em',
                }}
              >
                Ship To:
              </div>
              <div
                style={{ fontSize: '16px', fontWeight: '800', color: '#fff', marginBottom: '4px' }}
              >
                {shipTo.name}
              </div>
              <div style={{ fontSize: '11px', color: '#ddd', lineHeight: '1.8' }}>
                <div>{shipTo.email}</div>
                <div>{shipTo.phone}</div>
              </div>
            </div>
          </div>

          {/* Quotation From */}
          <div style={{ flex: 1, textAlign: 'right' }}>
            <div
              style={{
                color: '#aaa',
                fontSize: '10px',
                fontWeight: '700',
                textTransform: 'uppercase',
                marginBottom: '8px',
                letterSpacing: '0.05em',
              }}
            >
              Quotation From:
            </div>
            <div
              style={{ fontSize: '16px', fontWeight: '800', color: '#fff', marginBottom: '4px' }}
            >
              Xerocare W.L.L
            </div>
            <div style={{ fontSize: '11px', color: '#ddd', lineHeight: '1.8' }}>
              <div>Agrico Quarter, Doha, Qatar</div>
              <div>Phone: +974 7071 7282</div>
              <div>Email: mail@xerocare.com</div>
            </div>
          </div>
        </div>

        {/* Subject Line */}
        <div
          style={{
            padding: '0 50px 20px',
            color: ACCENT,
            fontWeight: '700',
            fontSize: '12px',
            letterSpacing: '0.02em',
          }}
        >
          Subject: {productName} &amp; {modelName}
        </div>

        {/* ─── TABLE ─── */}
        <div style={{ padding: '0 50px', marginTop: '10px' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '11px',
            }}
          >
            <thead>
              <tr style={{ backgroundColor: ACCENT, color: '#111' }}>
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
                ].map(({ label, width }, i) => (
                  <th
                    key={label}
                    style={{
                      padding: '12px 6px',
                      textAlign: label === 'DESCRIPTION' ? 'left' : 'center',
                      fontWeight: '800',
                      fontSize: '9px',
                      letterSpacing: '0.05em',
                      width,
                      borderRight: i < 9 ? '1px solid rgba(0,0,0,0.1)' : 'none',
                    }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, idx) => (
                <tr
                  key={idx}
                  style={{
                    backgroundColor: idx % 2 === 0 ? '#303240' : '#282a36',
                    borderBottom: '1px solid #3c3e4e',
                    height: '320px',
                  }}
                >
                  <td style={tdStyle('left')}>
                    <div style={{ fontWeight: '700', color: '#fff', textTransform: 'uppercase' }}>
                      {item.productName}
                    </div>
                  </td>
                  <td style={tdStyle('center')}>{item.brand}</td>
                  <td style={tdStyle('center')}>{item.modelNo}</td>
                  <td style={tdStyle('center')}>{item.slNo}</td>
                  <td
                    style={{
                      ...tdStyle('left'),
                      lineHeight: '1.6',
                      whiteSpace: 'pre-line',
                      position: 'relative',
                      overflow: 'hidden',
                      padding: 0,
                    }}
                  >
                    {/* Watermark Image */}
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
                          color: '#ccc',
                          fontWeight: '500',
                          maxWidth: '85%',
                        }}
                      >
                        {item.description}
                      </div>
                    </div>
                  </td>
                  <td style={tdStyle('center')}>{item.qty}</td>
                  <td style={tdStyle('center')}>{fmt(item.unitPrice)}</td>
                  <td style={tdStyle('center')}>{fmt(item.discount || 0)}</td>
                  <td style={tdStyle('center')}>{fmt(item.specialPrice)}</td>
                  <td style={{ ...tdStyle('center'), fontWeight: '700', color: '#fff' }}>
                    {fmt(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ─── TOTALS & INFO ─── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '40px 50px' }}>
          {/* Left: Thank you & Policies */}
          <div style={{ flex: 1, paddingRight: '40px' }}>
            <div
              style={{ fontSize: '14px', fontWeight: '800', color: '#fff', marginBottom: '20px' }}
            >
              Thank You For Your Business!
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: '700',
                  color: '#aaa',
                  textTransform: 'uppercase',
                  marginBottom: '8px',
                }}
              >
                Terms &amp; Conditions:
              </div>
              <div
                style={{
                  fontSize: '10px',
                  color: TEXT_MUTED,
                  lineHeight: '1.7',
                  maxWidth: '300px',
                }}
              >
                Quotation valid for{' '}
                {quotation.terms === 'Due on receipt' ? '30 Days' : quotation.terms}. All supplied
                goods remain property of Xerocare until paid in full. Delivery &amp; Installation as
                per standard agreement.
              </div>
            </div>

            <div style={{ height: '40px' }} />
          </div>

          {/* Right: Totals Grid */}
          <div style={{ width: '260px', alignSelf: 'flex-start' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '20px',
                marginBottom: '8px',
                fontSize: '11px',
              }}
            >
              <div
                style={{
                  textAlign: 'right',
                  color: '#ccc',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <span>Subtotal:</span>
                <span>Discount:</span>
                <span>VAT Total:</span>
              </div>
              <div
                style={{
                  textAlign: 'right',
                  color: '#fff',
                  fontWeight: '600',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  minWidth: '80px',
                }}
              >
                <span>{fmt(totals.subTotal)}</span>
                <span style={{ color: ACCENT }}>- {fmt(totals.discountTotal || 0)}</span>
                <span>{fmt(totals.vatTotal)}</span>
              </div>
            </div>

            {/* Accent Total Box */}
            <div
              style={{
                backgroundColor: ACCENT,
                color: '#111',
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '16px',
                borderRadius: '2px',
              }}
            >
              <span style={{ fontWeight: '800', fontSize: '16px', textTransform: 'uppercase' }}>
                Total:
              </span>
              <span style={{ fontWeight: '900', fontSize: '18px' }}>
                QAR {fmt(totals.balanceDue)}
              </span>
            </div>

            {totals.paid && (
              <div
                style={{
                  textAlign: 'right',
                  marginTop: '12px',
                  color: '#4ade80',
                  fontWeight: '800',
                  fontSize: '16px',
                  letterSpacing: '0.1em',
                }}
              >
                PAID
              </div>
            )}
          </div>
        </div>

        {/* ─── SIGNATURE & SEAL ─── */}
        <div style={{ padding: '20px 50px', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ textAlign: 'center', position: 'relative', width: '180px' }}>
            <img
              src="/seel/seel1.png"
              alt="Seal"
              style={{
                position: 'absolute',
                left: '-20px',
                top: '-50px',
                width: '100px',
                height: 'auto',
                opacity: 0.8,
                transform: 'rotate(-15deg)',
              }}
            />
            <div
              style={{ borderTop: '1px solid #ffffff', width: '100%', marginBottom: '6px' }}
            ></div>
            <div style={{ fontSize: '10px', fontWeight: '800', color: '#ffffff' }}>
              AUTHORIZED SIGNATURE
            </div>
          </div>
        </div>

        {/* ─── FOOTER ─── */}
        <div
          style={{
            marginTop: 'auto',
            padding: '20px 50px 40px',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              textAlign: 'right',
              fontSize: '10px',
              color: '#aaa',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '10px',
              }}
            >
              <span>+974 7071 7282</span>
              <span
                style={{
                  display: 'inline-block',
                  width: '16px',
                  textAlign: 'center',
                  color: ACCENT,
                }}
              >
                ☎
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '10px',
              }}
            >
              <span>mail@xerocare.com</span>
              <span
                style={{
                  display: 'inline-block',
                  width: '16px',
                  textAlign: 'center',
                  color: ACCENT,
                }}
              >
                ✉
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '10px',
              }}
            >
              <span>www.xerocare.com</span>
              <span
                style={{
                  display: 'inline-block',
                  width: '16px',
                  textAlign: 'center',
                  color: ACCENT,
                }}
              >
                🌐
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function tdStyle(align: 'left' | 'center' | 'right'): React.CSSProperties {
  return {
    padding: '10px 6px',
    height: '260px',
    textAlign: align,
    border: 'none',
    color: '#ccc',
    verticalAlign: 'middle',
  };
}

export default ProductPremiumQuotation;
