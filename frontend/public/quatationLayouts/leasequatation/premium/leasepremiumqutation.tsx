import React from 'react';

// ─── Shared Types ─────────────────────────────────────────────────────────────

export interface SlabRange {
  from: number;
  to: number;
  rate: number;
}

export interface LeaseLineItem {
  productName: string;
  brand: string;
  model: string;
  modelName?: string;
  modelNo?: string;
  slNo?: string;
  description: string;
  qty: number;
  limit: string;
  excessRate?: string;
  rate: string;
  bwSlabs?: SlabRange[];
  colorSlabs?: SlabRange[];
  comboSlabs?: SlabRange[];
  productImage?: string;
  discount?: number;
  features?: { subHeading: string; description: string }[];
  warranty?: string;
}

export interface LeaseAgreementDetails {
  leaseType: string;
  rentType?: string;
  rentPeriod?: string;
  duration: string;
  advance: number;
  deposit: number;
  discountPercent?: number;
  startDate: string;
  endDate: string;
  monthlyEmi: number;
  totalLeaseValue?: number;
  warrantyType?: 'none' | 'duration' | 'copies';
  warrantyDurationValue?: number;
  warrantyDurationUnit?: 'months' | 'years';
  warrantyCopyLimit?: number;
}

export interface LeasePremiumQuotationProps {
  companyInfo?: {
    name: string;
    address: string;
    email: string;
    phone: string;
    website: string;
    logo?: string;
  };
  billTo: {
    name: string;
    address?: string;
    trn?: string;
    phone?: string;
    email?: string;
  };
  quotation: {
    number: string;
    date: string;
    terms: string;
    dueDate: string;
  };
  lineItems: LeaseLineItem[];
  leaseDetails: LeaseAgreementDetails;
  totals: {
    subTotal: number;
    tax: number;
    total: number;
  };
}

// ─── Premium Dark Theme Palette (Prestige Gold) ──────────────────────────────
const BG_GRAY = '#0f1115';
const CARD_GRAY = '#1a1d23';
const ACCENT_COLOR = '#C5A059'; // Prestige Gold
const TEXT_WHITE = '#ffffff';
const TEXT_MUTED = '#64748b';

const fmt = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const LeasePremiumQuotation: React.FC<LeasePremiumQuotationProps> = ({
  companyInfo = {
    name: 'Xerocare Trading & Services W.L.L',
    address: 'P.O.BOX 37494, DOHA-QATAR',
    email: 'mail@xerocare.com',
    phone: '+974 7071 7282',
    website: 'www.xerocare.com',
    logo: '/quatationLayouts/productsalequatation/normal/normallogo/xerocarelogo-removebg-preview.png',
  },
  billTo,
  quotation,
  lineItems = [],
  leaseDetails,
  totals,
}) => {
  const isFSM = leaseDetails.leaseType === 'FSM';
  const hasSlabs = lineItems.some(
    (it) =>
      (it.bwSlabs?.length || 0) > 0 ||
      (it.colorSlabs?.length || 0) > 0 ||
      (it.comboSlabs?.length || 0) > 0,
  );

  return (
    <div
      style={{
        width: '900px',
        minHeight: '1122px',
        margin: '0 auto',
        backgroundColor: BG_GRAY,
        fontFamily: "'Inter', sans-serif",
        color: TEXT_WHITE,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 0 100px rgba(0,0,0,0.8)',
      }}
    >
      {/* ─── MODERN DECORATIVE ELEMENTS ─── */}
      <div
        style={{
          position: 'absolute',
          top: '-150px',
          left: '-150px',
          width: '500px',
          height: '500px',
          background: `radial-gradient(circle, ${ACCENT_COLOR}11 0%, transparent 70%)`,
        }}
      />

      {/* ─── 01. HEADER: Company Info ─── */}
      <div
        style={{
          padding: '50px 60px 30px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div style={{ display: 'flex', gap: '20px' }}>
          <div
            style={{
              padding: '10px',
              background: '#fff',
              borderRadius: '15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src={companyInfo.logo}
              alt="Logo"
              style={{ width: '50px', height: '50px', objectFit: 'contain' }}
            />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '1px' }}>
              {companyInfo.name}
            </div>
            <div style={{ fontSize: '11px', color: TEXT_MUTED, marginTop: '4px' }}>
              📞 {companyInfo.phone} &nbsp;•&nbsp; ✉ {companyInfo.email}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontSize: '32px',
              fontWeight: '900',
              color: ACCENT_COLOR,
              letterSpacing: '2px',
              lineHeight: '1',
            }}
          >
            LEASE
          </div>
          <div style={{ fontSize: '14px', fontWeight: '700', letterSpacing: '4px', opacity: 0.5 }}>
            QUOTATION
          </div>
          <div style={{ marginTop: '10px', fontSize: '12px', fontWeight: '800' }}>
            #{quotation.number}
          </div>
          <div style={{ fontSize: '11px', color: TEXT_MUTED, marginTop: '4px' }}>
            Date: {quotation.date}
          </div>
        </div>
      </div>

      {/* ─── 02. CUSTOMER INFO ─── */}
      <div style={{ padding: '30px 60px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div
          style={{
            fontSize: '10px',
            color: ACCENT_COLOR,
            fontWeight: '800',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            marginBottom: '10px',
          }}
        >
          Quotation Prepared For
        </div>
        <div style={{ fontSize: '24px', fontWeight: '900', color: '#fff' }}>{billTo.name}</div>
        <div style={{ fontSize: '12px', color: TEXT_MUTED, marginTop: '5px' }}>
          ✉ {billTo.email} &nbsp;•&nbsp; 📞 {billTo.phone}
        </div>
        {billTo.address && (
          <div style={{ fontSize: '11px', color: TEXT_MUTED, marginTop: '3px' }}>
            📍 {billTo.address}
          </div>
        )}
      </div>

      {/* ─── 03. MACHINE CORE SPECS ─── */}
      <div style={{ padding: '30px 60px 10px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          {[
            { l: 'Brand', v: lineItems[0]?.brand || 'N/A' },
            { l: 'Model', v: lineItems[0]?.model || 'N/A' },
            { l: 'Serial Number', v: lineItems[0]?.slNo || 'TBD', highlight: true },
          ].map((it, i) => (
            <div
              key={i}
              style={{
                background: CARD_GRAY,
                padding: '20px',
                borderRadius: '15px',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <div
                style={{
                  fontSize: '9px',
                  color: TEXT_MUTED,
                  textTransform: 'uppercase',
                  marginBottom: '6px',
                }}
              >
                {it.l}
              </div>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: '800',
                  color: it.highlight ? ACCENT_COLOR : '#fff',
                }}
              >
                {it.v}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── 04. ITEMS TABLE (Same fields as Standard) ─── */}
      <div style={{ padding: '20px 60px', flex: 1 }}>
        <div
          style={{
            borderRadius: '20px',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                <th
                  style={{
                    padding: '15px',
                    textAlign: 'center',
                    fontSize: '10px',
                    color: ACCENT_COLOR,
                    width: '40px',
                  }}
                >
                  SL.
                </th>
                <th
                  style={{
                    padding: '15px',
                    textAlign: 'left',
                    fontSize: '10px',
                    color: ACCENT_COLOR,
                    width: '50%',
                  }}
                >
                  ITEM DESCRIPTION
                </th>
                <th
                  style={{
                    padding: '15px',
                    textAlign: 'center',
                    fontSize: '10px',
                    color: ACCENT_COLOR,
                    width: '50px',
                  }}
                >
                  QTY
                </th>
                <th
                  style={{
                    padding: '15px',
                    textAlign: 'center',
                    fontSize: '10px',
                    color: ACCENT_COLOR,
                    width: '100px',
                  }}
                >
                  LIMIT
                </th>
                {isFSM ? (
                  <>
                    <th
                      style={{
                        padding: '15px',
                        textAlign: 'right',
                        fontSize: '10px',
                        color: ACCENT_COLOR,
                        width: '100px',
                      }}
                    >
                      EXCESS RATE
                    </th>
                    <th
                      style={{
                        padding: '15px',
                        textAlign: 'right',
                        fontSize: '10px',
                        color: ACCENT_COLOR,
                        width: '80px',
                      }}
                    >
                      DISC
                    </th>
                  </>
                ) : (
                  <>
                    <th
                      style={{
                        padding: '15px',
                        textAlign: 'right',
                        fontSize: '10px',
                        color: ACCENT_COLOR,
                        width: '110px',
                      }}
                    >
                      UNIT PRICE
                    </th>
                    <th
                      style={{
                        padding: '15px',
                        textAlign: 'right',
                        fontSize: '10px',
                        color: ACCENT_COLOR,
                        width: '80px',
                      }}
                    >
                      DISC
                    </th>
                    <th
                      style={{
                        padding: '15px',
                        textAlign: 'right',
                        fontSize: '10px',
                        color: ACCENT_COLOR,
                        width: '120px',
                      }}
                    >
                      TOTAL PRICE
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {lineItems.map((it, idx) => (
                <tr
                  key={idx}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', minHeight: '320px' }}
                >
                  <td
                    style={{
                      padding: '20px 15px',
                      textAlign: 'center',
                      fontSize: '13px',
                      color: TEXT_MUTED,
                      minHeight: '320px',
                    }}
                  >
                    {idx + 1}
                  </td>
                  <td
                    style={{
                      padding: 0,
                      position: 'relative',
                      overflow: 'hidden',
                      minWidth: '400px',
                      minHeight: '320px',
                    }}
                  >
                    <div
                      style={{
                        position: 'relative',
                        zIndex: 1,
                        padding: '25px 15px',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '20px',
                        width: '100%',
                        boxSizing: 'border-box',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: '20px',
                            fontWeight: '800',
                            color: '#fff',
                            marginBottom: '8px',
                          }}
                        >
                          {it.productName}
                        </div>
                        <div
                          style={{
                            fontSize: '16px',
                            color: TEXT_WHITE,
                            fontWeight: '600',
                            maxWidth: '95%',
                            lineHeight: '1.6',
                          }}
                        >
                          <div
                            style={{
                              fontSize: '13px',
                              fontWeight: '800',
                              color: '#ff4d4d',
                              textTransform: 'uppercase',
                              marginBottom: '6px',
                            }}
                          >
                            Product Description
                          </div>
                          <div style={{ marginBottom: it.features?.length ? '12px' : '0' }}>
                            {it.description}
                          </div>
                          {(it.features || []).length > 0 && (
                            <>
                              <div
                                style={{
                                  fontSize: '13px',
                                  fontWeight: '800',
                                  color: '#ff4d4d',
                                  textTransform: 'uppercase',
                                  marginBottom: '6px',
                                  marginTop: '16px',
                                }}
                              >
                                Features
                              </div>
                              {(it.features || []).map((f, i) => (
                                <div key={i} style={{ marginTop: '8px', fontSize: '15px' }}>
                                  {f.subHeading && (
                                    <strong
                                      style={{
                                        color: '#ff4d4d',
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
                          {it.warranty && (
                            <div
                              style={{
                                marginTop: '12px',
                                fontSize: '12px',
                                color: '#fff',
                                fontWeight: '400',
                                textTransform: 'uppercase',
                              }}
                            >
                              <span style={{ color: '#ff4d4d', fontWeight: '700' }}>
                                Warranty:{' '}
                              </span>
                              {(() => {
                                const parts = it.warranty.split(' ');
                                if (parts.length >= 2) {
                                  return (
                                    <>
                                      <span style={{ color: '#ff4d4d' }}>
                                        {parts[0]} {parts[1]}
                                      </span>
                                      <span> {parts.slice(2).join(' ')}</span>
                                    </>
                                  );
                                }
                                return <span style={{ color: '#ff4d4d' }}>{it.warranty}</span>;
                              })()}
                            </div>
                          )}
                        </div>
                      </div>
                      {it.productImage && (
                        <div
                          style={{
                            width: '350px',
                            flexShrink: 0,
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            background: 'rgba(255,255,255,0.05)',
                            padding: '15px',
                            borderRadius: '15px',
                            border: '1px solid rgba(255,255,255,0.1)',
                          }}
                        >
                          <img
                            src={it.productImage}
                            alt="Product"
                            style={{
                              width: '100%',
                              height: 'auto',
                              objectFit: 'contain',
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </td>
                  <td
                    style={{
                      padding: '20px 15px',
                      textAlign: 'center',
                      fontSize: '16px',
                      fontWeight: '700',
                      minHeight: '320px',
                    }}
                  >
                    {it.qty}
                  </td>
                  <td
                    style={{
                      padding: '20px 15px',
                      textAlign: 'center',
                      fontSize: '12px',
                      color: TEXT_MUTED,
                      minHeight: '320px',
                    }}
                  >
                    {it.limit}
                  </td>
                  {isFSM ? (
                    <>
                      <td style={{ padding: '20px 15px', textAlign: 'right', fontSize: '12px' }}>
                        {it.excessRate || 'N/A'}
                      </td>
                      <td style={{ padding: '20px 15px', textAlign: 'right', fontSize: '12px' }}>
                        {it.discount || 0}%
                      </td>
                    </>
                  ) : (
                    <>
                      <td
                        style={{
                          padding: '20px 15px',
                          textAlign: 'right',
                          fontSize: '12px',
                          fontWeight: '600',
                        }}
                      >
                        {fmt(Number(it.rate))}
                      </td>
                      <td style={{ padding: '20px 15px', textAlign: 'right', fontSize: '12px' }}>
                        {it.discount || 0}%
                      </td>
                      <td
                        style={{
                          padding: '20px 15px',
                          textAlign: 'right',
                          fontSize: '18px',
                          fontWeight: '800',
                          color: ACCENT_COLOR,
                        }}
                      >
                        {fmt(it.qty * Number(it.rate))}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── 05. SLAB RATES (For CPC / Combined) ─── */}
      {isFSM && hasSlabs && (
        <div style={{ padding: '0 60px 20px' }}>
          <div
            style={{
              fontSize: '10px',
              color: ACCENT_COLOR,
              fontWeight: '800',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              marginBottom: '15px',
            }}
          >
            Usage Based Pricing (Slabs)
          </div>
          {lineItems.map(
            (item, idx) =>
              ((item.bwSlabs?.length || 0) > 0 ||
                (item.colorSlabs?.length || 0) > 0 ||
                (item.comboSlabs?.length || 0) > 0) && (
                <div
                  key={idx}
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '15px',
                    padding: '20px',
                    border: '1px solid rgba(255,255,255,0.05)',
                    marginBottom: '15px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: '800',
                      color: ACCENT_COLOR,
                      marginBottom: '15px',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      paddingBottom: '10px',
                    }}
                  >
                    MACHINE: {item.brand} {item.model}
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                      gap: '20px',
                    }}
                  >
                    {/* BW Slabs */}
                    {item.bwSlabs && item.bwSlabs.length > 0 && (
                      <div>
                        <div
                          style={{
                            fontSize: '9px',
                            fontWeight: '900',
                            color: TEXT_MUTED,
                            marginBottom: '8px',
                            textTransform: 'uppercase',
                          }}
                        >
                          B&W Rate Table
                        </div>
                        <table style={{ width: '100%', fontSize: '11px' }}>
                          <thead>
                            <tr
                              style={{
                                color: ACCENT_COLOR,
                                textAlign: 'left',
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                              }}
                            >
                              <th style={{ padding: '5px 0' }}>Range</th>
                              <th style={{ padding: '5px 0', textAlign: 'right' }}>Rate</th>
                            </tr>
                          </thead>
                          <tbody>
                            {item.bwSlabs.map((s, i) => (
                              <tr
                                key={i}
                                style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}
                              >
                                <td style={{ padding: '6px 0' }}>
                                  {s.from.toLocaleString()} -{' '}
                                  {s.to >= 999999 ? '∞' : s.to.toLocaleString()}
                                </td>
                                <td
                                  style={{
                                    padding: '6px 0',
                                    textAlign: 'right',
                                    fontWeight: '700',
                                  }}
                                >
                                  QAR {fmt(s.rate)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {/* Color Slabs */}
                    {item.colorSlabs && item.colorSlabs.length > 0 && (
                      <div>
                        <div
                          style={{
                            fontSize: '9px',
                            fontWeight: '900',
                            color: TEXT_MUTED,
                            marginBottom: '8px',
                            textTransform: 'uppercase',
                          }}
                        >
                          Color Rate Table
                        </div>
                        <table style={{ width: '100%', fontSize: '11px' }}>
                          <thead>
                            <tr
                              style={{
                                color: ACCENT_COLOR,
                                textAlign: 'left',
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                              }}
                            >
                              <th style={{ padding: '5px 0' }}>Range</th>
                              <th style={{ padding: '5px 0', textAlign: 'right' }}>Rate</th>
                            </tr>
                          </thead>
                          <tbody>
                            {item.colorSlabs.map((s, i) => (
                              <tr
                                key={i}
                                style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}
                              >
                                <td style={{ padding: '6px 0' }}>
                                  {s.from.toLocaleString()} -{' '}
                                  {s.to >= 999999 ? '∞' : s.to.toLocaleString()}
                                </td>
                                <td
                                  style={{
                                    padding: '6px 0',
                                    textAlign: 'right',
                                    fontWeight: '700',
                                  }}
                                >
                                  QAR {fmt(s.rate)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {/* Combo Slabs */}
                    {item.comboSlabs && item.comboSlabs.length > 0 && (
                      <div>
                        <div
                          style={{
                            fontSize: '9px',
                            fontWeight: '900',
                            color: TEXT_MUTED,
                            marginBottom: '8px',
                            textTransform: 'uppercase',
                          }}
                        >
                          Combo Rate Table
                        </div>
                        <table style={{ width: '100%', fontSize: '11px' }}>
                          <thead>
                            <tr
                              style={{
                                color: ACCENT_COLOR,
                                textAlign: 'left',
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                              }}
                            >
                              <th style={{ padding: '5px 0' }}>Range</th>
                              <th style={{ padding: '5px 0', textAlign: 'right' }}>Rate</th>
                            </tr>
                          </thead>
                          <tbody>
                            {item.comboSlabs.map((s, i) => (
                              <tr
                                key={i}
                                style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}
                              >
                                <td style={{ padding: '6px 0' }}>
                                  {s.from.toLocaleString()} -{' '}
                                  {s.to >= 999999 ? '∞' : s.to.toLocaleString()}
                                </td>
                                <td
                                  style={{
                                    padding: '6px 0',
                                    textAlign: 'right',
                                    fontWeight: '700',
                                  }}
                                >
                                  QAR {fmt(s.rate)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ),
          )}
        </div>
      )}

      {/* ─── 06. GLOBAL WARRANTY (Premium) ─── */}
      {leaseDetails.warrantyType && leaseDetails.warrantyType !== 'none' && (
        <div style={{ padding: '20px 60px' }}>
          <div
            style={{
              fontSize: '10px',
              color: ACCENT_COLOR,
              fontWeight: '800',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              marginBottom: '15px',
            }}
          >
            Elite Protection Program
          </div>
          <div
            style={{
              background: `linear-gradient(135deg, ${CARD_GRAY} 0%, #252830 100%)`,
              padding: '30px',
              borderRadius: '20px',
              border: '1px solid rgba(197, 160, 89, 0.2)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Subtle gloss effect */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '100px',
                height: '100%',
                background: 'linear-gradient(to left, rgba(197,160,89,0.05), transparent)',
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '15px',
                  backgroundColor: 'rgba(197, 160, 89, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                }}
              >
                🛡️
              </div>
              <div>
                <div
                  style={{
                    fontSize: '18px',
                    fontWeight: '800',
                    color: '#fff',
                    marginBottom: '4px',
                  }}
                >
                  Coverage Type:{' '}
                  {leaseDetails.warrantyType === 'duration'
                    ? 'Full Term Duration'
                    : 'Copy Count Based'}
                </div>
                <div style={{ fontSize: '14px', color: TEXT_MUTED, lineHeight: '1.6' }}>
                  {leaseDetails.warrantyType === 'duration' ? (
                    <>
                      Comprehensive maintenance and replacement coverage for{' '}
                      <span style={{ color: ACCENT_COLOR, fontWeight: '800' }}>
                        {leaseDetails.warrantyDurationValue} {leaseDetails.warrantyDurationUnit}
                      </span>
                    </>
                  ) : (
                    <>
                      Elite service and parts coverage active until{' '}
                      <span style={{ color: ACCENT_COLOR, fontWeight: '800' }}>
                        {leaseDetails.warrantyCopyLimit?.toLocaleString()} copies
                      </span>
                    </>
                  )}
                  <div
                    style={{
                      marginTop: '12px',
                      fontSize: '11px',
                      opacity: 0.8,
                      fontStyle: 'italic',
                    }}
                  >
                    * Technical support and replacement parts are provided free of charge during the
                    warranty period specified above. After the warranty period expires, or once the
                    applicable usage limit is reached, all technical support services, spare parts,
                    repairs, and related charges will be billable at the prevailing rates.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── 06. LEASE AGREEMENT DETAILS ─── */}
      <div style={{ padding: '20px 60px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '30px' }}>
          {/* Structural Box */}
          <div
            style={{
              background: CARD_GRAY,
              borderRadius: '20px',
              padding: '30px',
              border: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                color: ACCENT_COLOR,
                fontWeight: '800',
                textTransform: 'uppercase',
                marginBottom: '20px',
                letterSpacing: '1px',
              }}
            >
              Lease Agreement Meta
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {[
                { l: 'Lease Type', v: leaseDetails.leaseType },
                { l: 'Tenure / Duration', v: leaseDetails.duration },
                {
                  l: 'Advance / Deposit',
                  v: `QAR ${fmt(leaseDetails.advance || leaseDetails.deposit || 0)}`,
                },
                { l: 'Start Date', v: leaseDetails.startDate || 'TBD' },
                { l: 'End Date', v: leaseDetails.endDate || 'TBD' },
              ].map((it, i) => (
                <div key={i}>
                  <div
                    style={{
                      fontSize: '8px',
                      color: TEXT_MUTED,
                      textTransform: 'uppercase',
                      marginBottom: '4px',
                    }}
                  >
                    {it.l}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '700' }}>{it.v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Impact Box */}
          <div
            style={{
              border: `1px solid ${ACCENT_COLOR}44`,
              background: `linear-gradient(135deg, ${ACCENT_COLOR}0A, ${ACCENT_COLOR}15)`,
              borderRadius: '20px',
              padding: '30px',
              display: 'flex',
              flexDirection: 'column',
              gap: '15px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11px',
                color: TEXT_MUTED,
              }}
            >
              <span>Total Lease Value</span>
              <span style={{ fontWeight: '400', color: TEXT_WHITE }}>
                QAR {fmt(totals.subTotal)}
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11px',
                color: TEXT_MUTED,
              }}
            >
              <span>Tax (0%)</span>
              <span style={{ fontWeight: '400', color: TEXT_WHITE }}>QAR {fmt(totals.tax)}</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11px',
                paddingTop: '5px',
                borderTop: '1px solid rgba(255,255,255,0.05)',
                color: ACCENT_COLOR,
                fontWeight: '800',
              }}
            >
              <span>GRAND TOTAL</span>
              <span>QAR {fmt(totals.total)}</span>
            </div>

            <div
              style={{
                marginTop: '10px',
                paddingTop: '10px',
                borderTop: '1px dotted rgba(255,255,255,0.1)',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '9px',
                  color: TEXT_MUTED,
                  textTransform: 'uppercase',
                  marginBottom: '4px',
                }}
              >
                {isFSM ? 'PERIODIC LEASE' : 'MONTHLY EMI'}
              </div>
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: '900',
                  color: '#fff',
                  letterSpacing: '-0.5px',
                  lineHeight: '1',
                }}
              >
                QAR {fmt(leaseDetails.monthlyEmi)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 06. FOOTER & SIGNATORY ─── */}
      <div
        style={{
          padding: '0 60px 50px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
        }}
      >
        <div style={{ fontSize: '10px', color: TEXT_MUTED, lineHeight: '1.8' }}>
          <div style={{ fontWeight: '800', color: ACCENT_COLOR }}>TERMS & CONDITIONS:</div>
          <div>• Validity: {quotation.dueDate}</div>
          <div>• All amounts are in Qatari Riyal (QAR)</div>
          <div>• Subject to Xerocare Standard Lease Agreement</div>
        </div>
        <div style={{ textAlign: 'center', position: 'relative' }}>
          <img
            src="/seel/seel1.png"
            alt="Seal"
            style={{
              width: '70px',
              position: 'absolute',
              top: '-60px',
              left: '20px',
              opacity: 0.3,
              transform: 'rotate(-15deg)',
            }}
          />
          <div
            style={{
              width: '200px',
              height: '1px',
              background: ACCENT_COLOR,
              marginBottom: '10px',
            }}
          />
          <div style={{ fontSize: '11px', fontWeight: '800', color: ACCENT_COLOR }}>
            AUTHORIZED SIGNATURE
          </div>
        </div>
      </div>

      {/* Minimal Bottom Bar */}
      <div
        style={{
          padding: '15px 60px',
          background: 'rgba(255,255,255,0.02)',
          fontSize: '10px',
          color: TEXT_MUTED,
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>{companyInfo.website}</span>
        <span>{companyInfo.address}</span>
      </div>
    </div>
  );
};

export default LeasePremiumQuotation;
