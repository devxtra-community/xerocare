import React from 'react';
import { numberToWords } from '@/lib/numberToWords';

export interface Consumable {
  partName: string;
  description: string;
  yield: string;
  price: string;
}

export interface StandardQuotationLineItem {
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
      modelName: 'ALTALink C8130',
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
            <span style={{ fontWeight: '500', fontSize: '12px' }}>QUOTATION NO : </span>
            <span style={{ fontSize: '12px' }}>{quotation.number}</span>
          </div>
          <div>
            <span style={{ fontWeight: '500', fontSize: '12px' }}>DATE : </span>
            <span style={{ fontSize: '12px' }}>{quotation.date}</span>
          </div>
          <div>
            <span style={{ fontWeight: '500', fontSize: '12px' }}>TERMS : </span>
            <span style={{ fontSize: '12px' }}>{quotation.terms}</span>
          </div>
          <div>
            <span style={{ fontWeight: '500', fontSize: '12px' }}>DUE DATE : </span>
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
            <div style={{ fontWeight: '500', fontSize: '13px', color: '#111' }}>{billTo.name}</div>
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

      {/* ─── SUBJECT LINE ─── */}
      <div style={{ margin: '10px 40px 25px' }}>
        <div
          style={{
            backgroundColor: TEAL,
            color: '#ffffff',
            padding: '6px 20px',
            borderRadius: '8px',
            textAlign: 'center',
            fontSize: '13px',
            fontWeight: '500',
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}
        >
          Sub: Quatation for {lineItems[0]?.productName || 'N/A'}
        </div>
      </div>
      <div style={{ margin: '0 40px 15px', color: '#333', fontSize: '12.5px', lineHeight: '1.4' }}>
        <div style={{ marginBottom: '2px' }}>Dear Sir,</div>
        <div>
          Thank you for your valuable enquiry, please find our best competitive offers below:
        </div>
      </div>
      {/* ─── PRODUCT INFO SUMMARY ─── */}
      <div style={{ padding: '10px 40px 20px' }}>
        <div
          style={{
            display: 'flex',
            backgroundColor: '#f8fbfc',
            border: `1px solid ${TEAL}25`,
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
          }}
        >
          {lineItems.length > 0 && (
            <>
              <div style={{ flex: 1.5, padding: '8px 24px', borderRight: '1px solid #eaedf0' }}>
                <div
                  style={{
                    fontSize: '9px',
                    fontWeight: '800',
                    color: TEAL,
                    textTransform: 'uppercase',
                    marginBottom: '3px',
                    letterSpacing: '0.05em',
                  }}
                >
                  PRODUCT NAME
                </div>
                <div style={{ fontSize: '12px', fontWeight: '500', color: '#111' }}>
                  {lineItems[0].productName}
                </div>
              </div>
              <div style={{ flex: 1, padding: '8px 24px', borderRight: '1px solid #eaedf0' }}>
                <div
                  style={{
                    fontSize: '9px',
                    fontWeight: '800',
                    color: TEAL,
                    textTransform: 'uppercase',
                    marginBottom: '3px',
                    letterSpacing: '0.05em',
                  }}
                >
                  BRAND
                </div>
                <div style={{ fontSize: '12px', fontWeight: '500', color: '#444' }}>
                  {lineItems[0].brand}
                </div>
              </div>
              <div style={{ flex: 1, padding: '8px 24px', borderRight: '1px solid #eaedf0' }}>
                <div
                  style={{
                    fontSize: '9px',
                    fontWeight: '800',
                    color: TEAL,
                    textTransform: 'uppercase',
                    marginBottom: '3px',
                    letterSpacing: '0.05em',
                  }}
                >
                  MODEL NAME
                </div>
                <div style={{ fontSize: '12px', fontWeight: '500', color: '#444' }}>
                  {lineItems[0].modelName}
                </div>
              </div>
              <div style={{ flex: 1, padding: '8px 24px', borderRight: '1px solid #eaedf0' }}>
                <div
                  style={{
                    fontSize: '9px',
                    fontWeight: '800',
                    color: TEAL,
                    textTransform: 'uppercase',
                    marginBottom: '3px',
                    letterSpacing: '0.05em',
                  }}
                >
                  MODEL NO
                </div>
                <div style={{ fontSize: '12px', fontWeight: '500', color: '#444' }}>
                  {lineItems[0].modelNo}
                </div>
              </div>
              <div style={{ flex: 1, padding: '8px 24px' }}>
                <div
                  style={{
                    fontSize: '9px',
                    fontWeight: '800',
                    color: TEAL,
                    textTransform: 'uppercase',
                    marginBottom: '3px',
                    letterSpacing: '0.05em',
                  }}
                >
                  SERIAL NUMBER
                </div>
                <div style={{ fontSize: '12px', fontWeight: '500', color: '#444' }}>
                  {lineItems[0].slNo}
                </div>
              </div>
            </>
          )}
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
                { label: 'DESCRIPTION', width: '70%' },
                { label: 'QTY', width: '4%' },
                { label: 'UNIT', width: '7%' },
                { label: 'DISC', width: '5%' },
                { label: 'PRICE', width: '7%' },
                { label: 'TOTAL', width: '7%' },
              ].map(({ label, width }) => (
                <th
                  key={label}
                  style={{
                    padding: '10px 6px',
                    color: '#ffffff',
                    fontWeight: '700',
                    fontSize: '10px',
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
                  minHeight: '320px',
                }}
              >
                <td
                  style={{
                    ...bodyTd('left'),
                    lineHeight: '1.5',
                    whiteSpace: 'pre-wrap',
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
                        width: '90%',
                        height: '90%',
                        objectFit: 'contain',
                        opacity: 0.15,
                        zIndex: 0,
                        pointerEvents: 'none',
                        filter: 'grayscale(100%) brightness(1.2)',
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
                        color: '#333',
                        fontWeight: '600',
                        maxWidth: '95%',
                        lineHeight: '1.6',
                      }}
                    >
                      <div
                        style={{
                          marginBottom: (item.features?.length ?? 0) > 0 ? '12px' : '0',
                          fontSize: '11px',
                          color: '#333',
                          fontWeight: '600',
                          maxWidth: '95%',
                          lineHeight: '1.6',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {item.description}
                        {(item.features || []).length > 0 && (
                          <>
                            <div
                              style={{
                                fontSize: '13px',
                                fontWeight: '800',
                                color: '#10b981',
                                textTransform: 'uppercase',
                                marginBottom: '4px',
                                marginTop: '12px',
                              }}
                            >
                              Features
                            </div>
                            {(item.features || []).map((f, i) => (
                              <div key={i} style={{ marginTop: '6px', fontSize: '12px' }}>
                                {f.subHeading && (
                                  <strong
                                    style={{
                                      color: '#dc2626',
                                      display: 'block',
                                      marginBottom: '2px',
                                    }}
                                  >
                                    {f.subHeading}
                                  </strong>
                                )}
                                {f.description && (
                                  <div style={{ color: '#555' }}>{f.description}</div>
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

          {lineItems?.[0]?.productImage && (
            <div style={{ marginTop: '20px' }}>
              <img
                src={lineItems[0].productImage}
                alt="Product"
                style={{
                  maxWidth: '500px',
                  maxHeight: '450px',
                  objectFit: 'contain',
                  filter: 'grayscale(100%)',
                  opacity: 0.7,
                }}
              />
            </div>
          )}
        </div>

        {/* Right: SUB TOTAL / VAT / TOTAL */}
        <div style={{ width: '240px', alignSelf: 'flex-start' }}>
          {[
            { label: 'SUB TOTAL', value: totals.subTotal, num: totals.subTotal, bold: false },
            {
              label: 'DISCOUNT',
              value: `- ${fmt(totals.discountTotal || 0)}`,
              num: totals.discountTotal || 0,
              bold: false,
              color: GOLD,
            },
            { label: 'VAT TOTAL', value: fmt(totals.vatTotal), num: totals.vatTotal, bold: false },
            { label: 'TOTAL', value: fmt(totals.total), num: totals.total, bold: true },
            { label: 'PAYMENT', value: fmt(totals.payment), num: totals.payment, bold: false },
          ].map(({ label, value, num, bold, color }) => (
            <div
              key={label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '4px 0',
                color: color || '#000',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontWeight: bold ? '800' : '400',
                  fontSize: '11.5px',
                }}
              >
                <span
                  style={{
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontSize: '10px',
                    fontWeight: bold ? '700' : '400',
                  }}
                >
                  {label}
                </span>
                <span>{value}</span>
              </div>
              <div
                style={{
                  fontSize: '9px',
                  color: '#111827',
                  fontStyle: 'italic',
                  textAlign: 'right',
                  marginTop: '1px',
                }}
              >
                {numberToWords(num)}
              </div>
            </div>
          ))}

          {/* Divider */}
          <div style={{ borderTop: 'none', margin: '8px 0' }} />

          {/* Grand Total */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span
                style={{
                  fontWeight: '500',
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                BALANCE DUE
              </span>
              <span style={{ fontWeight: '500', fontSize: '15px' }}>
                QAR {fmt(totals.balanceDue)}
              </span>
            </div>
            <div
              style={{
                fontSize: '9.5px',
                color: '#111827',
                fontStyle: 'italic',
                textAlign: 'right',
                marginTop: '3px',
              }}
            >
              {numberToWords(totals.balanceDue)}
            </div>
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
        </div>
      </div>

      {/* ─── SPACER ─── */}
      <div style={{ flex: 1 }} />

      {/* ─── BOTTOM WAVE FOOTER ─── */}
      <div style={{ position: 'relative', height: '100px', marginTop: 'auto' }}>
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
          <span>37494,Doha-qatar / ٣٧٤٩٤ ، الدوحة-قطر</span>
          <span>✉ mail@xerocare.com</span>
          <span>☎ +974 7071 7282 / +٩٧٤ ٧٠٧١ ٧٢٨٢</span>
          <span>🌐 www.xerocare.com</span>
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
            backgroundColor: '#ffffff',
            minHeight: '1191px',
            position: 'relative',
          }}
        >
          {/* Header for Second Page - Replicated Branding */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '35px',
            }}
          >
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
                    color: TEAL,
                    letterSpacing: '0.05em',
                  }}
                >
                  XEROCARE
                </div>
                <div
                  style={{
                    fontSize: '10px',
                    color: '#666',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                  }}
                >
                  Trading & Services W.L.L
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right', marginTop: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: '400', color: TEAL }}>
                QUOTATION NO: {quotation.number}
              </div>
              <div style={{ fontSize: '11px', color: '#888' }}>Date: {quotation.date}</div>
            </div>
          </div>

          <div style={{ borderTop: `2px solid ${TEAL}`, marginBottom: '10px' }} />

          <div style={{ marginBottom: '20px' }}>
            <div
              style={{
                fontSize: '14px',
                fontWeight: '900',
                color: '#111',
                textTransform: 'uppercase',
                textAlign: 'center',
              }}
            >
              Replacement Consumables for {lineItems?.[0]?.productName || 'Equipment'}
            </div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              Complete price list for associated product consumables
            </div>
          </div>

          {(lineItems || [])
            .filter((item) => (item.consumables || []).length > 0)
            .map((item, idx) => (
              <div key={idx} style={{ marginBottom: '40px' }}>
                <div
                  style={{
                    backgroundColor: '#f9f9f9',
                    padding: '12px 16px',
                    borderRadius: '4px',
                    marginBottom: '16px',
                    borderLeft: `4px solid ${GOLD}`,
                  }}
                >
                  <div style={{ fontSize: '14px', fontWeight: '400', color: '#111' }}>
                    {item.brand} {item.modelNo}
                  </div>
                  <div style={{ fontSize: '12px', color: '#555' }}>{item.description}</div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: TEAL, color: '#ffffff' }}>
                      <th
                        style={{
                          textAlign: 'left',
                          fontSize: '10px',
                          padding: '12px',
                          textTransform: 'uppercase',
                          fontWeight: '400',
                        }}
                      >
                        Part Number
                      </th>
                      <th
                        style={{
                          textAlign: 'left',
                          fontSize: '10px',
                          padding: '12px',
                          textTransform: 'uppercase',
                          fontWeight: '400',
                        }}
                      >
                        Specifications
                      </th>
                      <th
                        style={{
                          textAlign: 'left',
                          fontSize: '10px',
                          padding: '12px',
                          textTransform: 'uppercase',
                          fontWeight: '400',
                        }}
                      >
                        Yield
                      </th>
                      <th
                        style={{
                          textAlign: 'right',
                          fontSize: '10px',
                          padding: '12px',
                          textTransform: 'uppercase',
                          fontWeight: '400',
                        }}
                      >
                        Price (QAR)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(item.consumables || []).map((cons, cIdx) => (
                      <tr key={cIdx} style={{ borderBottom: '1px solid #eee' }}>
                        <td
                          style={{
                            fontSize: '12.5px',
                            fontWeight: '700',
                            padding: '14px 12px',
                            color: '#111',
                          }}
                        >
                          {cons.partName}
                        </td>
                        <td style={{ fontSize: '12px', padding: '14px 12px', color: '#444' }}>
                          {cons.description}
                        </td>
                        <td style={{ fontSize: '12.5px', padding: '14px 12px', color: '#444' }}>
                          {cons.yield}
                        </td>
                        <td
                          style={{
                            fontSize: '13px',
                            textAlign: 'right',
                            padding: '14px 12px',
                            color: TEAL,
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
        </div>
      )}

      {/* ─── TERMS AND CONDITIONS (BOTTOM) ─── */}
      <div style={{ padding: '0 48px', marginTop: '40px' }}>
        <div
          style={{
            fontSize: '13px',
            fontWeight: '800',
            color: TEAL,
            textTransform: 'uppercase',
            marginBottom: '15px',
          }}
        >
          Terms and Conditions
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '120px 1fr',
            gap: '10px 20px',
            fontSize: '11px',
            color: '#555',
            lineHeight: '1.6',
          }}
        >
          <div style={{ fontWeight: '800' }}>1) PAYMENT</div>
          <div>: CONFIRMED LPO</div>
          <div style={{ fontWeight: '800' }}>2) PRICES</div>
          <div>: 350.00 INCLUSIVE OF DELIVERY & INSTALLATION AT YOUR SITE</div>
          <div style={{ fontWeight: '800' }}>3) DELIVERY</div>
          <div>: EX STOCK, SUBJECT TO AVAILABILITY</div>
          <div style={{ fontWeight: '800' }}>5) VALIDITY</div>
          <div>: 30 DAYS FROM ORDER DATE</div>
        </div>

        <div
          style={{
            marginTop: '60px',
            borderTop: '1px solid #eee',
            paddingTop: '30px',
            marginBottom: '80px',
          }}
        >
          <p style={{ fontSize: '11.5px', color: '#444', marginBottom: '25px' }}>
            for any further clarifications please feel free to contact the undersigned on{' '}
            <span style={{ color: TEAL }}>mob: 70717282</span> or{' '}
            <span style={{ color: TEAL }}>email:mail@xerocare.com</span>
          </p>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ fontSize: '11.5px', color: '#111', lineHeight: '1.6' }}>
              with warm regards,
              <br />
              <br />
              <strong style={{ color: TEAL }}>For Xerocare Trading&services WLL</strong>
              <br />
              DOHA QTAR
            </div>

            <div style={{ position: 'relative', width: '180px', textAlign: 'center' }}>
              <img
                src="/seel/seel1.png"
                alt="Seal"
                style={{
                  position: 'absolute',
                  bottom: '10px',
                  right: '30px',
                  width: '110px',
                  opacity: 0.8,
                  transform: 'rotate(-15deg)',
                  zIndex: 1,
                }}
              />
              <div
                style={{
                  borderTop: 'none',
                  paddingTop: '8px',
                  fontSize: '11px',
                  fontWeight: '800',
                  color: '#111',
                }}
              >
                AUTHORIZED SIGNATURE
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/** Shared body cell style */
function bodyTd(align: 'left' | 'center' | 'right'): React.CSSProperties {
  return {
    padding: '10px 6px',
    textAlign: align,
    border: 'none',
    color: '#222222',
    verticalAlign: 'middle',
    fontSize: '12px',
  };
}

export default ProductStandardQuotation;
