import React from 'react';
import { numberToWords } from '@/lib/numberToWords';

export interface Consumable {
  partName: string;
  description: string;
  yield: string;
  price: string;
}

export interface PremiumQuotationLineItem {
  brand: string;
  modelNo: string;
  modelName: string;
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
  features?: { subHeading: string; description: string }[];
  consumables?: Consumable[];
  warranty?: string;
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
      modelName: 'ALTALink C8130',
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
      modelName: 'ALTALink C8130',
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
                style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontWeight: '400' }}
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
            margin: '10px 50px 15px',
            backgroundColor: ACCENT,
            color: '#ffffff', // White text for better contrast on green background
            padding: '6px 20px',
            borderRadius: '6px',
            textAlign: 'center',
            fontSize: '13px',
            fontWeight: '500',
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}
        >
          Sub: Quatation for {lineItems[0]?.productName || productName || 'N/A'}
        </div>
        <div
          style={{
            margin: '0 50px 15px',
            color: '#eeeeee',
            fontSize: '13px',
            lineHeight: '1.4',
            opacity: 0.9,
          }}
        >
          <div style={{ color: '#ffffff', marginBottom: '4px' }}>Dear Sir,</div>
          <div>
            Thank you for your valuable enquiry, please find our best competitive offers below:
          </div>
        </div>
        {/* ─── PRODUCT INFO SUMMARY ─── */}
        <div style={{ padding: '0 50px', marginBottom: '25px' }}>
          <div
            style={{
              display: 'flex',
              borderRadius: '12px',
              overflow: 'hidden',
              border: `1px solid ${ACCENT}20`,
              background: '#252733',
            }}
          >
            {lineItems.length > 0 && (
              <>
                <div
                  style={{ flex: 2, padding: '10px 24px', borderRight: `1px solid ${ACCENT}15` }}
                >
                  <div
                    style={{
                      fontSize: '9px',
                      fontWeight: '800',
                      color: ACCENT,
                      textTransform: 'uppercase',
                      marginBottom: '4px',
                      letterSpacing: '0.05em',
                    }}
                  >
                    PRODUCT
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: '#ffffff' }}>
                    {lineItems[0].productName}
                  </div>
                </div>
                <div
                  style={{ flex: 1, padding: '10px 24px', borderRight: `1px solid ${ACCENT}15` }}
                >
                  <div
                    style={{
                      fontSize: '9px',
                      fontWeight: '800',
                      color: ACCENT,
                      textTransform: 'uppercase',
                      marginBottom: '4px',
                      letterSpacing: '0.05em',
                    }}
                  >
                    BRAND
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#eeeeee' }}>
                    {lineItems[0].brand}
                  </div>
                </div>
                <div
                  style={{ flex: 1.2, padding: '10px 24px', borderRight: `1px solid ${ACCENT}15` }}
                >
                  <div
                    style={{
                      fontSize: '9px',
                      fontWeight: '800',
                      color: ACCENT,
                      textTransform: 'uppercase',
                      marginBottom: '4px',
                      letterSpacing: '0.05em',
                    }}
                  >
                    MODEL
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#eeeeee' }}>
                    {lineItems[0].modelNo}
                  </div>
                </div>
                <div style={{ flex: 1.5, padding: '10px 24px' }}>
                  <div
                    style={{
                      fontSize: '9px',
                      fontWeight: '800',
                      color: ACCENT,
                      textTransform: 'uppercase',
                      marginBottom: '4px',
                      letterSpacing: '0.05em',
                    }}
                  >
                    SERIAL NUMBER
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#eeeeee' }}>
                    {lineItems[0].slNo}
                  </div>
                </div>
              </>
            )}
          </div>
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
                  { label: 'DESCRIPTION', width: '71%' },
                  { label: 'QTY', width: '4%' },
                  { label: 'UNIT', width: '6%' },
                  { label: 'DISC', width: '4%' },
                  { label: 'PRICE', width: '7%' },
                  { label: 'TOTAL', width: '8%' },
                ].map(({ label, width }, i) => (
                  <th
                    key={label}
                    style={{
                      padding: '12px 6px',
                      textAlign: label === 'DESCRIPTION' ? 'left' : 'center',
                      fontWeight: '800',
                      fontSize: '10px',
                      letterSpacing: '0.05em',
                      width,
                      borderRight: i < 5 ? '1px solid rgba(0,0,0,0.1)' : 'none',
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
                    minHeight: '320px',
                  }}
                >
                  <td
                    style={{
                      ...tdStyle('left'),
                      lineHeight: '1.6',
                      whiteSpace: 'pre-wrap',
                      position: 'relative',
                      overflow: 'hidden',
                      padding: 0,
                    }}
                  >
                    {/* Watermark Image - Scaled Contained */}
                    {item.productImage && (
                      <img
                        src={item.productImage}
                        alt="bg"
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          width: '90%',
                          height: '90%',
                          objectFit: 'contain',
                          opacity: 0.15,
                          zIndex: 0,
                          pointerEvents: 'none',
                          filter: 'grayscale(100%) brightness(1.5)',
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
                          color: '#fff',
                          fontWeight: '500',
                          maxWidth: '95%',
                          lineHeight: '1.6',
                        }}
                      >
                        <div
                          style={{
                            marginBottom: (item.features?.length ?? 0) > 0 ? '12px' : '0',
                            fontSize: '11px',
                            color: '#eeeeee',
                            fontWeight: '500',
                            maxWidth: '95%',
                            lineHeight: '1.6',
                          }}
                        >
                          {item.description}
                          {(item.features || []).length > 0 && (
                            <>
                              <div
                                style={{
                                  fontSize: '13px',
                                  fontWeight: '800',
                                  color: ACCENT,
                                  textTransform: 'uppercase',
                                  marginBottom: '6px',
                                  marginTop: '16px',
                                }}
                              >
                                Features
                              </div>
                              {(item.features || []).map((f, i: number) => (
                                <div key={i} style={{ marginTop: '8px', fontSize: '11px' }}>
                                  {f.subHeading && (
                                    <strong
                                      style={{
                                        color: ACCENT,
                                        display: 'block',
                                        marginBottom: '4px',
                                      }}
                                    >
                                      {f.subHeading}
                                    </strong>
                                  )}
                                  {f.description && (
                                    <div style={{ color: '#ccc' }}>{f.description}</div>
                                  )}
                                </div>
                              ))}
                            </>
                          )}
                          {item.warranty && (
                            <div
                              style={{
                                marginTop: '12px',
                                fontSize: '12px',
                                color: '#fff',
                                fontWeight: '400',
                                textTransform: 'uppercase',
                              }}
                            >
                              <span style={{ color: ACCENT, fontWeight: '700' }}>Warranty: </span>
                              {(() => {
                                const parts = item.warranty.split(' ');
                                if (parts.length >= 2) {
                                  return (
                                    <>
                                      <span style={{ color: ACCENT }}>
                                        {parts[0]} {parts[1]}
                                      </span>
                                      <span> {parts.slice(2).join(' ')}</span>
                                    </>
                                  );
                                }
                                return <span style={{ color: ACCENT }}>{item.warranty}</span>;
                              })()}
                            </div>
                          )}
                        </div>
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

            {lineItems?.[0]?.productImage && (
              <div style={{ marginBottom: '20px' }}>
                <img
                  src={lineItems[0].productImage}
                  alt="Product"
                  style={{
                    maxWidth: '600px',
                    maxHeight: '500px',
                    objectFit: 'contain',
                    filter: 'grayscale(100%) brightness(1.2)',
                    opacity: 0.6,
                  }}
                />
              </div>
            )}

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
                  maxWidth: '350px',
                }}
              >
                <div style={{ marginBottom: '4px' }}>
                  <strong>1) PAYMENT:</strong> : CONFIRMED LPO
                </div>
                <div style={{ marginBottom: '4px' }}>
                  <strong>2) PRICES:</strong> : 350.00 INCLUSIVE OF DELIVERY & INSTALLATION AT YOUR
                  SITE
                </div>
                <div style={{ marginBottom: '4px' }}>
                  <strong>3) DELIVERY:</strong> : EX STOCK, SUBJECT TO AVAILABILITY
                </div>
                <div>
                  <strong>5) VALIDITY:</strong> : 30 DAYS FROM ORDER DATE
                </div>
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
                <span>Subtotal (Before VAT):</span>
                <span>Discount:</span>
                <span>VAT Amount:</span>
              </div>
              <div
                style={{
                  textAlign: 'right',
                  color: '#fff',
                  fontWeight: '400',
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
                flexDirection: 'column',
                marginTop: '16px',
                borderRadius: '2px',
              }}
            >
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span style={{ fontWeight: '500', fontSize: '16px', textTransform: 'uppercase' }}>
                  Grand Total (Including VAT):
                </span>
                <span style={{ fontWeight: '500', fontSize: '18px' }}>
                  QAR {fmt(totals.balanceDue)}
                </span>
              </div>
              <div
                style={{
                  fontSize: '10px',
                  color: '#eeeeee',
                  fontStyle: 'italic',
                  textAlign: 'right',
                  marginTop: '1px',
                }}
              >
                {numberToWords(totals.balanceDue)}
              </div>
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
              <span>+974 7071 7282 / +٩٧٤ ٧٠٧١ ٧٢٨٢</span>
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
              <span>37494,Doha-qatar</span>
              <span
                style={{
                  display: 'inline-block',
                  width: '16px',
                  textAlign: 'center',
                  color: ACCENT,
                }}
              >
                📍
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

      {/* ─── DEDICATED CONSUMABLES PAGE ─── */}
      {(lineItems || []).some((item) => (item.consumables || []).length > 0) && (
        <div
          style={{
            pageBreakBefore: 'always',
            paddingTop: '60px',
            paddingLeft: '48px',
            paddingRight: '48px',
            backgroundColor: BG_DARK,
            color: TEXT_LIGHT,
            minHeight: '1191px',
            position: 'relative',
          }}
        >
          {/* Background Shape for Second Page */}
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 842 1191"
            preserveAspectRatio="none"
            style={{ position: 'absolute', top: 0, left: 0, zIndex: 0 }}
          >
            <polygon points="0,0 200,0 0,200" fill={BG_DARKER} />
          </svg>

          <div style={{ position: 'relative', zIndex: 10 }}>
            {/* Header for Second Page - Replicated Premium Style with Logo */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '40px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img
                  src="/quatationLayouts/productsalequatation/normal/normallogo/xerocarelogo-removebg-preview.png"
                  alt="Xerocare Logo"
                  style={{
                    width: '80px',
                    height: '80px',
                    objectFit: 'contain',
                  }}
                />
                <div>
                  <div
                    style={{
                      fontSize: '18px',
                      fontWeight: '800',
                      color: '#fff',
                      letterSpacing: '0.05em',
                    }}
                  >
                    XEROCARE
                  </div>
                  <div
                    style={{
                      fontSize: '9px',
                      color: TEXT_MUTED,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                    }}
                  >
                    Trading &amp; Services W.L.L
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right', marginTop: '10px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: ACCENT }}>
                  QUOTATION: {quotation.number}
                </div>
                <div style={{ fontSize: '10px', color: TEXT_MUTED }}>Date: {quotation.date}</div>
              </div>
            </div>

            <div style={{ borderTop: `1px solid ${ACCENT}20`, marginBottom: '10px' }} />

            <div style={{ marginBottom: '20px' }}>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: '800',
                  color: ACCENT,
                  textTransform: 'uppercase',
                  textAlign: 'center',
                }}
              >
                Replacement Consumables for {lineItems?.[0]?.productName || 'Equipment'}
              </div>
              <div style={{ fontSize: '12px', color: TEXT_MUTED, marginTop: '4px' }}>
                Premium supplementary price list for your equipment
              </div>
            </div>

            {(lineItems || [])
              .filter((item) => (item.consumables || []).length > 0)
              .map((item, idx) => (
                <div key={idx} style={{ marginBottom: '40px' }}>
                  <div
                    style={{
                      backgroundColor: BG_DARKER,
                      padding: '12px 16px',
                      borderRadius: '4px',
                      marginBottom: '16px',
                      borderLeft: `4px solid ${ACCENT}`,
                    }}
                  >
                    <div style={{ fontSize: '14px', fontWeight: '400', color: ACCENT }}>
                      {item.brand} {item.modelNo}
                    </div>
                    <div style={{ fontSize: '12px', color: TEXT_LIGHT }}>{item.description}</div>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: BG_DARKER, color: ACCENT }}>
                        <th
                          style={{
                            textAlign: 'left',
                            fontSize: '10px',
                            padding: '10px 12px',
                            textTransform: 'uppercase',
                            borderBottom: `1px solid ${ACCENT}`,
                            fontWeight: '400',
                          }}
                        >
                          Part Number
                        </th>
                        <th
                          style={{
                            textAlign: 'left',
                            fontSize: '10px',
                            padding: '10px 12px',
                            textTransform: 'uppercase',
                            borderBottom: `1px solid ${ACCENT}`,
                            fontWeight: '400',
                          }}
                        >
                          Description / Specifications
                        </th>
                        <th
                          style={{
                            textAlign: 'left',
                            fontSize: '10px',
                            padding: '10px 12px',
                            textTransform: 'uppercase',
                            borderBottom: `1px solid ${ACCENT}`,
                            fontWeight: '400',
                          }}
                        >
                          Yield
                        </th>
                        <th
                          style={{
                            textAlign: 'right',
                            fontSize: '10px',
                            padding: '10px 12px',
                            textTransform: 'uppercase',
                            borderBottom: `1px solid ${ACCENT}`,
                            fontWeight: '400',
                          }}
                        >
                          Unit Price (QAR)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(item.consumables || []).map((cons, cIdx) => (
                        <tr key={cIdx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td
                            style={{
                              fontSize: '12px',
                              fontWeight: '700',
                              padding: '12px',
                              color: TEXT_LIGHT,
                            }}
                          >
                            {cons.partName}
                          </td>
                          <td style={{ fontSize: '11px', padding: '12px', color: TEXT_MUTED }}>
                            {cons.description}
                          </td>
                          <td style={{ fontSize: '12px', padding: '12px', color: TEXT_MUTED }}>
                            {cons.yield}
                          </td>
                          <td
                            style={{
                              fontSize: '12px',
                              textAlign: 'right',
                              padding: '12px',
                              color: ACCENT,
                            }}
                          >
                            {cons.price}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}

            {/* Page Note / Terms */}
            <div style={{ marginTop: '40px' }}>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: '800',
                  color: ACCENT,
                  textTransform: 'uppercase',
                  marginBottom: '12px',
                  borderBottom: `1px solid ${ACCENT}20`,
                  paddingBottom: '6px',
                }}
              >
                Terms and Conditions
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '120px 1fr',
                  gap: '8px 20px',
                  fontSize: '11px',
                  color: TEXT_MUTED,
                  lineHeight: '1.6',
                }}
              >
                <div style={{ fontWeight: '800', color: '#fff' }}>1) PAYMENT</div>
                <div>: CONFIRMED LPO</div>

                <div style={{ fontWeight: '800', color: '#fff' }}>2) PRICES</div>
                <div>: 350.00 INCLUSIVE OF DELIVERY & INSTALLATION AT YOUR SITE</div>

                <div style={{ fontWeight: '800', color: '#fff' }}>3) DELIVERY</div>
                <div>: EX STOCK, SUBJECT TO AVAILABILITY</div>

                <div style={{ fontWeight: '800', color: '#fff' }}>5) VALIDITY</div>
                <div>: 30 DAYS FROM ORDER DATE</div>
              </div>
            </div>

            {/* Professional Footer for Second Page */}
            <div
              style={{ marginTop: '60px', borderTop: `1px solid ${ACCENT}20`, paddingTop: '20px' }}
            >
              <p
                style={{
                  fontSize: '11px',
                  color: TEXT_MUTED,
                  marginBottom: '20px',
                  lineHeight: '1.6',
                }}
              >
                for any further clarifications please feel free to contact the undersigned on{' '}
                <span style={{ color: ACCENT }}>mob: 70717282</span> or{' '}
                <span style={{ color: ACCENT }}>email:mail@xerocare.com</span>
              </p>

              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}
              >
                <div style={{ fontSize: '11px', color: '#eee' }}>
                  with warm regards,
                  <br />
                  <br />
                  <strong style={{ color: ACCENT }}>For Xerocare Trading&services WLL</strong>
                  <br />
                  DOHA QTAR
                </div>

                <div style={{ position: 'relative', width: '150px', textAlign: 'center' }}>
                  <img
                    src="/seel/seel1.png"
                    alt="Seal"
                    style={{
                      position: 'absolute',
                      bottom: '10px',
                      right: '15px',
                      width: '90px',
                      opacity: 0.8,
                      transform: 'rotate(-15deg)',
                      zIndex: 1,
                      filter: 'brightness(1.2)',
                    }}
                  />
                  <div
                    style={{
                      borderTop: `1px solid ${ACCENT}80`,
                      paddingTop: '5px',
                      fontSize: '10px',
                      fontWeight: '800',
                      color: ACCENT,
                    }}
                  >
                    AUTHORIZED SIGNATURE
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function tdStyle(align: 'left' | 'center' | 'right'): React.CSSProperties {
  return {
    padding: '10px 6px',
    textAlign: align,
    border: 'none',
    color: '#ccc',
    verticalAlign: 'middle',
    fontSize: '12px',
  };
}

export default ProductPremiumQuotation;
