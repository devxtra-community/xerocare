import React from 'react';

// ─── Shared Types (same as LeaseNormalQuotation) ──────────────────────────────

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

export interface LeaseStandardQuotationProps {
  companyInfo?: {
    name: string;
    address: string;
    email: string;
    phone: string;
    website: string;
    logo?: string;
  };
  billTo?: {
    name: string;
    address?: string;
    email?: string;
    phone?: string;
    trn?: string;
  };
  quotation?: {
    number: string;
    date: string;
    dueDate: string;
  };
  lineItems?: LeaseLineItem[];
  leaseDetails?: LeaseAgreementDetails;
  totals?: {
    subTotal: number;
    tax: number;
    total: number;
  };
}

// ─── Color palette (reference: navy + gold) ───────────────────────────────────
const NAVY = '#1B2A4A';
const GOLD = '#F5B700';
const GOLD_DARK = '#D4A000';
const WHITE = '#FFFFFF';
const LIGHT_BG = '#F8F9FC';

const fmt = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── Helper styles ─────────────────────────────────────────────────────────────
const th = (
  align: 'left' | 'center' | 'right' = 'left',
  bg = GOLD,
  color = NAVY,
): React.CSSProperties => ({
  padding: '10px 12px',
  textAlign: align,
  fontWeight: '800',
  fontSize: '11px',
  letterSpacing: '0.5px',
  textTransform: 'uppercase',
  backgroundColor: bg,
  color,
  borderBottom: `2px solid ${GOLD_DARK}`,
});

const td = (align: 'left' | 'center' | 'right' = 'left'): React.CSSProperties => ({
  padding: '11px 12px',
  textAlign: align,
  verticalAlign: 'top',
  fontSize: '12px',
  color: '#333',
  borderBottom: '1px solid #eaecf0',
});

// ─── Component ────────────────────────────────────────────────────────────────

const LeaseStandardQuotation: React.FC<LeaseStandardQuotationProps> = ({
  companyInfo = {
    name: 'Xerocare Trading & Services W.L.L',
    address: 'P.O.BOX 37494, DOHA-QATAR',
    email: 'mail@xerocare.com',
    phone: '+974 7071 7282',
    website: 'www.xerocare.com',
    logo: '/quatationLayouts/productsalequatation/normal/normallogo/xerocarelogo-removebg-preview.png',
  },
  billTo = {
    name: 'Customer Name',
    address: '123 Customer St, Doha, Qatar',
    email: 'customer@example.com',
    phone: '+974 5000 0000',
  },
  quotation = {
    number: 'INV-2026-0001',
    date: '14-05-2026',
    dueDate: '14-06-2026',
  },
  lineItems = [
    {
      productName: 'Xerox Altalink',
      brand: 'Xerox',
      model: 'C8130',
      slNo: 'SN123456789',
      description: 'Multifunction Color Printer',
      qty: 1,
      limit: 'BW: 3000, Color: 500',
      excessRate: 'BW: 0.050, Color: 0.450',
      rate: '0.00',
    },
  ],
  leaseDetails = {
    leaseType: 'EMI',
    duration: '12 Months',
    advance: 0,
    deposit: 0,
    discountPercent: 0,
    startDate: '14-05-2026',
    endDate: '14-05-2027',
    monthlyEmi: 0,
  },
  totals = { subTotal: 0, tax: 0, total: 0 },
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
        fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
        backgroundColor: WHITE,
        width: '794px',
        minHeight: '1122px',
        margin: '0 auto',
        color: '#1a1a1a',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
      }}
    >
      {/* ═══════════════════════════════════════════════════════════════
          HEADER — navy left strip + gold "LEASE QUOTATION" banner
      ═══════════════════════════════════════════════════════════════ */}
      <div style={{ display: 'flex', minHeight: '130px' }}>
        {/* Left navy panel: logo + company */}
        <div
          style={{
            backgroundColor: NAVY,
            width: '55%',
            padding: '28px 28px 20px 28px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          {/* Logo area */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                backgroundColor: GOLD,
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              {companyInfo.logo ? (
                <img
                  src={companyInfo.logo}
                  alt="Logo"
                  style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px' }}
                />
              ) : (
                <span style={{ fontSize: '22px', fontWeight: '900', color: NAVY }}>X</span>
              )}
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '900', color: WHITE, lineHeight: '1.2' }}>
                {companyInfo.name}
              </div>
            </div>
          </div>

          {/* Contact strip */}
          <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
            <span style={{ fontSize: '10px', color: '#90a4b0' }}>📞 {companyInfo.phone}</span>
            <span style={{ fontSize: '10px', color: '#90a4b0' }}>✉ {companyInfo.email}</span>
          </div>
        </div>

        {/* Right gold panel: title + quotation meta */}
        <div
          style={{
            backgroundColor: GOLD,
            flex: 1,
            padding: '24px 28px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              fontSize: '32px',
              fontWeight: '900',
              color: NAVY,
              letterSpacing: '1px',
              textTransform: 'uppercase',
              textAlign: 'right',
              lineHeight: '1',
            }}
          >
            LEASE
            <br />
            <span style={{ fontSize: '22px', fontWeight: '800', letterSpacing: '3px' }}>
              QUOTATION
            </span>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: NAVY, marginBottom: '2px' }}>
              INVOICE NO: {quotation.number}
            </div>
            <div style={{ fontSize: '11px', color: '#4a3800', lineHeight: '1.6' }}>
              Due Date &nbsp;&nbsp; {quotation.dueDate}
              <br />
              Invoice Date &nbsp; {quotation.date}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          BILL-TO + PAYMENT METHOD ROW
      ═══════════════════════════════════════════════════════════════ */}
      <div
        style={{
          display: 'flex',
          gap: '0',
          padding: '22px 28px',
          borderBottom: `3px solid ${GOLD}`,
        }}
      >
        {/* Invoice To */}
        <div style={{ flex: 1, paddingRight: '24px', borderRight: `1px solid #e0e0e0` }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: '800',
              color: GOLD_DARK,
              textTransform: 'uppercase',
              marginBottom: '8px',
              letterSpacing: '1px',
            }}
          >
            Invoice To:
          </div>
          <div style={{ fontSize: '15px', fontWeight: '900', color: NAVY, marginBottom: '4px' }}>
            {billTo.name}
          </div>
          {billTo.address && (
            <div
              style={{ fontSize: '11px', color: '#555', lineHeight: '1.5', whiteSpace: 'pre-line' }}
            >
              {billTo.address}
            </div>
          )}
          {billTo.phone && (
            <div style={{ fontSize: '11px', color: '#555', marginTop: '3px' }}>
              Phone : {billTo.phone}
            </div>
          )}
          {billTo.email && (
            <div style={{ fontSize: '11px', color: '#555' }}>Email : {billTo.email}</div>
          )}
          {billTo.trn && <div style={{ fontSize: '11px', color: '#555' }}>TRN : {billTo.trn}</div>}
        </div>

        {/* Payment Method / Lease Summary */}
        <div style={{ flex: 1, paddingLeft: '24px' }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: '800',
              color: GOLD_DARK,
              textTransform: 'uppercase',
              marginBottom: '8px',
              letterSpacing: '1px',
            }}
          >
            Payment Method
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: '3px 16px',
              fontSize: '11px',
            }}
          >
            <span style={{ color: '#666' }}>Lease Type</span>
            <span style={{ fontWeight: '700', color: NAVY, textAlign: 'right' }}>
              {leaseDetails.leaseType}
            </span>
            {isFSM && leaseDetails.rentType && (
              <>
                <span style={{ color: '#666' }}>Pricing Model</span>
                <span style={{ fontWeight: '700', color: NAVY, textAlign: 'right' }}>
                  {leaseDetails.rentType}
                </span>
              </>
            )}
            <span style={{ color: '#666' }}>Duration</span>
            <span style={{ fontWeight: '700', color: NAVY, textAlign: 'right' }}>
              {leaseDetails.duration}
            </span>
            <span style={{ color: '#666' }}>Start Date</span>
            <span style={{ fontWeight: '700', color: NAVY, textAlign: 'right' }}>
              {leaseDetails.startDate}
            </span>
            <span style={{ color: '#666' }}>End Date</span>
            <span style={{ fontWeight: '700', color: NAVY, textAlign: 'right' }}>
              {leaseDetails.endDate}
            </span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          MACHINE DETAILS CARD
      ═══════════════════════════════════════════════════════════════ */}
      <div style={{ padding: '18px 28px 0' }}>
        <div
          style={{
            backgroundColor: LIGHT_BG,
            borderRadius: '8px',
            border: `1px solid #e4e6ea`,
            borderLeft: `4px solid ${GOLD}`,
            padding: '14px 18px',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: '800',
              color: NAVY,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '10px',
            }}
          >
            Machine Details
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <div>
              <div
                style={{
                  fontSize: '10px',
                  color: '#888',
                  textTransform: 'uppercase',
                  marginBottom: '2px',
                }}
              >
                Brand
              </div>
              <div style={{ fontSize: '13px', fontWeight: '800', color: NAVY }}>
                {lineItems[0]?.brand || 'N/A'}
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: '10px',
                  color: '#888',
                  textTransform: 'uppercase',
                  marginBottom: '2px',
                }}
              >
                Model
              </div>
              <div style={{ fontSize: '13px', fontWeight: '800', color: NAVY }}>
                {lineItems[0]?.model || 'N/A'}
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: '10px',
                  color: '#888',
                  textTransform: 'uppercase',
                  marginBottom: '2px',
                }}
              >
                Serial Number
              </div>
              <div style={{ fontSize: '13px', fontWeight: '800', color: NAVY }}>
                {lineItems[0]?.slNo || 'TBD'}
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
            ITEMS TABLE — gold header, clean alternate rows
        ══════════════════════════════════════════════════════════ */}
        <div style={{ marginBottom: '20px' }}>
          <div
            style={{
              fontSize: '12px',
              fontWeight: '800',
              color: NAVY,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <div
              style={{ width: '4px', height: '16px', backgroundColor: GOLD, borderRadius: '2px' }}
            />
            {isFSM ? 'Agreement & Usage Details' : 'Items'}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr>
                <th style={{ ...th('center'), width: '36px' }}>Sl.</th>
                <th style={{ ...th('left'), width: '50%' }}>Item Description</th>
                <th style={th('center')}>Qty</th>
                <th style={th('center')}>Limit</th>
                {isFSM ? (
                  <>
                    <th style={th('right')}>Excess Rate</th>
                    <th style={th('right')}>Discount</th>
                  </>
                ) : (
                  <>
                    <th style={th('right')}>Unit Price</th>
                    <th style={th('right')}>Discount</th>
                    <th style={th('right')}>Total Price</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, idx) => (
                <tr
                  key={idx}
                  style={{
                    backgroundColor: idx % 2 === 0 ? WHITE : LIGHT_BG,
                    minHeight: '320px',
                  }}
                >
                  <td
                    style={{
                      ...td('center'),
                      fontWeight: '700',
                      color: NAVY,
                      verticalAlign: 'middle',
                      minHeight: '320px',
                    }}
                  >
                    {idx + 1}
                  </td>
                  <td
                    style={{
                      ...td('left'),
                      position: 'relative',
                      overflow: 'hidden',
                      padding: 0,
                      minWidth: '400px',
                      minHeight: '320px',
                    }}
                  >
                    <div
                      style={{
                        position: 'relative',
                        zIndex: 1,
                        padding: '15px 8px',
                        textAlign: 'left',
                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '20px',
                        height: '100%',
                        width: '100%',
                        boxSizing: 'border-box',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ marginBottom: '6px' }}>{item.productName}</div>
                        <div
                          style={{
                            fontSize: '16px',
                            color: '#1a1a1a',
                            lineHeight: '1.6',
                            fontWeight: '600',
                            maxWidth: '95%',
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
                          <div
                            style={{
                              marginBottom: (item.features?.length ?? 0) > 0 ? '12px' : '0',
                            }}
                          >
                            {item.description}
                          </div>
                          {(item.features || []).length > 0 && (
                            <>
                              <div
                                style={{
                                  fontSize: '13px',
                                  fontWeight: '800',
                                  color: '#dc2626',
                                  textTransform: 'uppercase',
                                  marginBottom: '6px',
                                  marginTop: '16px',
                                }}
                              >
                                Features
                              </div>
                              {(item.features || []).map((f, i) => (
                                <div key={i} style={{ marginTop: '8px', fontSize: '15px' }}>
                                  {f.subHeading && (
                                    <strong
                                      style={{
                                        color: '#dc2626',
                                        display: 'block',
                                        marginBottom: '4px',
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
                                marginTop: '10px',
                                fontSize: '12px',
                                color: '#000',
                                fontWeight: '400',
                                textTransform: 'uppercase',
                              }}
                            >
                              <span style={{ color: '#dc2626', fontWeight: '700' }}>
                                Warranty:{' '}
                              </span>
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
                      {item.productImage && (
                        <div
                          style={{
                            width: '350px',
                            flexShrink: 0,
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            padding: '10px',
                          }}
                        >
                          <img
                            src={item.productImage}
                            alt="Product"
                            style={{
                              width: '100%',
                              height: 'auto',
                              objectFit: 'contain',
                              borderRadius: '8px',
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </td>
                  <td
                    style={{
                      ...td('center'),
                      fontWeight: '600',
                      verticalAlign: 'middle',
                      minHeight: '320px',
                    }}
                  >
                    {item.qty}
                  </td>
                  <td
                    style={{
                      ...td('center'),
                      color: '#555',
                      verticalAlign: 'middle',
                      minHeight: '320px',
                    }}
                  >
                    {item.limit}
                  </td>
                  {isFSM ? (
                    <>
                      <td
                        style={{
                          ...td('right'),
                          color: '#555',
                          verticalAlign: 'middle',
                          minHeight: '320px',
                        }}
                      >
                        {item.excessRate || 'N/A'}
                      </td>
                      <td
                        style={{
                          ...td('right'),
                          color: '#555',
                          verticalAlign: 'middle',
                          minHeight: '320px',
                        }}
                      >
                        {item.discount ? `${item.discount}%` : '0%'}
                      </td>
                    </>
                  ) : (
                    <>
                      <td
                        style={{
                          ...td('right'),
                          fontWeight: '600',
                          verticalAlign: 'middle',
                          minHeight: '320px',
                        }}
                      >
                        {fmt(Number(item.rate))}
                      </td>
                      <td
                        style={{
                          ...td('right'),
                          color: '#555',
                          verticalAlign: 'middle',
                          minHeight: '320px',
                        }}
                      >
                        {item.discount ? `${item.discount}%` : '0%'}
                      </td>
                      <td
                        style={{
                          ...td('right'),
                          fontWeight: '700',
                          color: NAVY,
                          verticalAlign: 'middle',
                          minHeight: '320px',
                        }}
                      >
                        {fmt(item.qty * Number(item.rate))}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ══════════════════════════════════════════════════════════
            FSM: SLAB RATE TABLES
        ══════════════════════════════════════════════════════════ */}
        {isFSM && hasSlabs && (
          <div style={{ marginBottom: '20px' }}>
            <div
              style={{
                fontSize: '12px',
                fontWeight: '800',
                color: NAVY,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <div
                style={{ width: '4px', height: '16px', backgroundColor: GOLD, borderRadius: '2px' }}
              />
              Usage Based Pricing (Slab Rates)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {lineItems.map(
                (item, idx) =>
                  ((item.bwSlabs?.length || 0) > 0 ||
                    (item.colorSlabs?.length || 0) > 0 ||
                    (item.comboSlabs?.length || 0) > 0) && (
                    <div
                      key={idx}
                      style={{
                        backgroundColor: LIGHT_BG,
                        padding: '16px',
                        borderRadius: '8px',
                        border: `1px solid #e4e6ea`,
                        borderLeft: `4px solid ${NAVY}`,
                      }}
                    >
                      <div
                        style={{
                          fontSize: '11px',
                          fontWeight: '800',
                          color: NAVY,
                          marginBottom: '12px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          borderBottom: `1px solid #dde0e8`,
                          paddingBottom: '8px',
                        }}
                      >
                        <span>
                          MACHINE: {item.brand} {item.model}
                        </span>
                        <span style={{ color: GOLD_DARK }}>{item.productName}</span>
                      </div>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                          gap: '20px',
                        }}
                      >
                        {/* BW Slabs */}
                        {item.bwSlabs && item.bwSlabs.length > 0 && (
                          <div>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                marginBottom: '8px',
                              }}
                            >
                              <div
                                style={{
                                  width: '8px',
                                  height: '8px',
                                  backgroundColor: NAVY,
                                  borderRadius: '2px',
                                }}
                              />
                              <span style={{ fontSize: '10px', fontWeight: '900', color: NAVY }}>
                                B&W RATE TABLE
                              </span>
                            </div>
                            <table
                              style={{
                                width: '100%',
                                fontSize: '11px',
                                borderCollapse: 'collapse',
                              }}
                            >
                              <thead>
                                <tr style={{ borderBottom: `2px solid ${GOLD}` }}>
                                  <th
                                    style={{
                                      padding: '5px 0',
                                      fontWeight: '700',
                                      color: '#555',
                                      textAlign: 'left',
                                    }}
                                  >
                                    Page Range
                                  </th>
                                  <th
                                    style={{
                                      padding: '5px 0',
                                      fontWeight: '700',
                                      color: '#555',
                                      textAlign: 'right',
                                    }}
                                  >
                                    Rate
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {item.bwSlabs.map((s, i) => (
                                  <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                    <td style={{ padding: '5px 0', color: '#444' }}>
                                      {s.from.toLocaleString()} –{' '}
                                      {Number(s.to) === 0 || s.to >= 999999
                                        ? 'UNLIMITED'
                                        : s.to.toLocaleString()}
                                    </td>
                                    <td
                                      style={{
                                        padding: '5px 0',
                                        textAlign: 'right',
                                        fontWeight: '800',
                                        color: NAVY,
                                      }}
                                    >
                                      QAR {Number(s.rate || 0).toFixed(3)}
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
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                marginBottom: '8px',
                              }}
                            >
                              <div
                                style={{
                                  width: '8px',
                                  height: '8px',
                                  background: 'linear-gradient(135deg, #ef4444, #3b82f6)',
                                  borderRadius: '2px',
                                }}
                              />
                              <span style={{ fontSize: '10px', fontWeight: '900', color: NAVY }}>
                                COLOR RATE TABLE
                              </span>
                            </div>
                            <table
                              style={{
                                width: '100%',
                                fontSize: '11px',
                                borderCollapse: 'collapse',
                              }}
                            >
                              <thead>
                                <tr style={{ borderBottom: `2px solid ${GOLD}` }}>
                                  <th
                                    style={{
                                      padding: '5px 0',
                                      fontWeight: '700',
                                      color: '#555',
                                      textAlign: 'left',
                                    }}
                                  >
                                    Page Range
                                  </th>
                                  <th
                                    style={{
                                      padding: '5px 0',
                                      fontWeight: '700',
                                      color: '#555',
                                      textAlign: 'right',
                                    }}
                                  >
                                    Rate
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {item.colorSlabs.map((s, i) => (
                                  <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                    <td style={{ padding: '5px 0', color: '#444' }}>
                                      {s.from.toLocaleString()} –{' '}
                                      {Number(s.to) === 0 || s.to >= 999999
                                        ? 'UNLIMITED'
                                        : s.to.toLocaleString()}
                                    </td>
                                    <td
                                      style={{
                                        padding: '5px 0',
                                        textAlign: 'right',
                                        fontWeight: '800',
                                        color: '#b91c1c',
                                      }}
                                    >
                                      QAR {Number(s.rate || 0).toFixed(3)}
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
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                marginBottom: '8px',
                              }}
                            >
                              <div
                                style={{
                                  width: '8px',
                                  height: '8px',
                                  background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
                                  borderRadius: '2px',
                                }}
                              />
                              <span style={{ fontSize: '10px', fontWeight: '900', color: NAVY }}>
                                COMBO RATE TABLE
                              </span>
                            </div>
                            <table
                              style={{
                                width: '100%',
                                fontSize: '11px',
                                borderCollapse: 'collapse',
                              }}
                            >
                              <thead>
                                <tr style={{ borderBottom: `2px solid ${GOLD}` }}>
                                  <th
                                    style={{
                                      padding: '5px 0',
                                      fontWeight: '700',
                                      color: '#555',
                                      textAlign: 'left',
                                    }}
                                  >
                                    Page Range
                                  </th>
                                  <th
                                    style={{
                                      padding: '5px 0',
                                      fontWeight: '700',
                                      color: '#555',
                                      textAlign: 'right',
                                    }}
                                  >
                                    Rate
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {item.comboSlabs.map((s, i) => (
                                  <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                    <td style={{ padding: '5px 0', color: '#444' }}>
                                      {s.from.toLocaleString()} –{' '}
                                      {Number(s.to) === 0 || s.to >= 999999
                                        ? 'UNLIMITED'
                                        : s.to.toLocaleString()}
                                    </td>
                                    <td
                                      style={{
                                        padding: '5px 0',
                                        textAlign: 'right',
                                        fontWeight: '800',
                                        color: '#6d28d9',
                                      }}
                                    >
                                      QAR {Number(s.rate || 0).toFixed(3)}
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
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            LEASE AGREEMENT DETAILS
        ══════════════════════════════════════════════════════════ */}
        <div style={{ marginBottom: '20px' }}>
          <div
            style={{
              fontSize: '12px',
              fontWeight: '800',
              color: NAVY,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <div
              style={{ width: '4px', height: '16px', backgroundColor: GOLD, borderRadius: '2px' }}
            />
            Lease Agreement Details
          </div>

          {isFSM ? (
            /* FSM: Tabular agreement view */
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr>
                    <th style={th('left')}>Lease Type</th>
                    <th style={th('center')}>Pricing Model</th>
                    <th style={th('center')}>Period</th>
                    <th style={th('center')}>Advance / Deposit</th>
                    <th style={th('center')}>Duration</th>
                    <th style={th('center')}>Discount</th>
                    <th style={th('right')}>Monthly Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ backgroundColor: LIGHT_BG }}>
                    <td style={{ ...td('left'), fontWeight: '700', color: NAVY }}>FSM</td>
                    <td style={{ ...td('center'), fontWeight: '600' }}>
                      {leaseDetails.rentType || 'FIXED LIMIT'}
                    </td>
                    <td style={{ ...td('center') }}>{leaseDetails.rentPeriod || 'MONTHLY'}</td>
                    <td style={{ ...td('center') }}>
                      QAR {fmt(leaseDetails.advance || leaseDetails.deposit || 0)}
                    </td>
                    <td style={{ ...td('center'), fontWeight: '600' }}>{leaseDetails.duration}</td>
                    <td style={{ ...td('center') }}>
                      {leaseDetails.discountPercent && leaseDetails.discountPercent > 0 ? (
                        <span style={{ color: '#16a34a', fontWeight: '800' }}>
                          {leaseDetails.discountPercent}%
                        </span>
                      ) : (
                        '0%'
                      )}
                    </td>
                    <td style={{ ...td('right'), fontWeight: '800', color: NAVY }}>
                      QAR {fmt(leaseDetails.monthlyEmi)}
                    </td>
                  </tr>
                </tbody>
              </table>
              {/* Contract dates below table */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0 40px',
                  marginTop: '10px',
                  padding: '10px 12px',
                  backgroundColor: LIGHT_BG,
                  borderRadius: '6px',
                  border: `1px solid #e4e6ea`,
                }}
              >
                {[
                  { label: 'Contract Start Date', value: leaseDetails.startDate },
                  { label: 'Contract End Date', value: leaseDetails.endDate },
                ].map((r, i) => (
                  <div
                    key={i}
                    style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}
                  >
                    <span style={{ fontSize: '11px', color: '#666' }}>{r.label}</span>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: NAVY }}>
                      {r.value}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            /* EMI: key-value grid */
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0 40px',
                padding: '10px 12px',
                backgroundColor: LIGHT_BG,
                borderRadius: '6px',
                border: `1px solid #e4e6ea`,
              }}
            >
              {[
                { label: 'Lease Type', value: leaseDetails.leaseType },
                { label: 'Tenure / Duration', value: leaseDetails.duration },
                {
                  label: 'Advance / Deposit',
                  value: `QAR ${fmt(leaseDetails.advance || leaseDetails.deposit || 0)}`,
                },
                { label: 'Contract Start Date', value: leaseDetails.startDate },
                { label: 'Contract End Date', value: leaseDetails.endDate },
                { label: 'Monthly EMI Amount', value: `QAR ${fmt(leaseDetails.monthlyEmi)}` },
              ].map((r, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '7px 0',
                    borderBottom: '1px solid #eaeaea',
                  }}
                >
                  <span style={{ fontSize: '11px', color: '#666' }}>{r.label}</span>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: NAVY }}>
                    {r.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── GLOBAL WARRANTY (Optional) ─── */}
        {leaseDetails.warrantyType && leaseDetails.warrantyType !== 'none' && (
          <div style={{ padding: '0 28px', marginBottom: '28px' }}>
            <div
              style={{
                fontSize: '12px',
                fontWeight: '800',
                color: NAVY,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <div
                style={{ width: '4px', height: '16px', backgroundColor: GOLD, borderRadius: '2px' }}
              />
              Warranty Coverage
            </div>
            <div
              style={{
                backgroundColor: LIGHT_BG,
                padding: '18px 24px',
                borderRadius: '12px',
                border: `1px solid #e4e6ea`,
                borderLeft: `5px solid ${GOLD}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: '700', color: NAVY, lineHeight: '1.5' }}>
                {leaseDetails.warrantyType === 'duration' ? (
                  <>
                    Your equipment is protected by our standard warranty for a duration of{' '}
                    <span style={{ color: '#dc2626' }}>
                      {leaseDetails.warrantyDurationValue} {leaseDetails.warrantyDurationUnit}
                    </span>
                    .
                  </>
                ) : (
                  <>
                    Your equipment includes a maintenance warranty valid up to{' '}
                    <span style={{ color: '#dc2626' }}>
                      {leaseDetails.warrantyCopyLimit?.toLocaleString()} copies
                    </span>
                    .
                  </>
                )}
              </div>
              <div
                style={{ fontSize: '11px', color: '#666', fontStyle: 'italic', lineHeight: '1.5' }}
              >
                * Technical support and replacement parts are provided free of charge during the
                warranty period specified above. After the warranty period expires, or once the
                applicable usage limit is reached, all technical support services, spare parts,
                repairs, and related charges will be billable at the prevailing rates.
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            TOTALS + MONTHLY AMOUNT
        ══════════════════════════════════════════════════════════ */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '28px',
          }}
        >
          {/* Left: Terms & Instructions */}
          <div style={{ maxWidth: '320px' }}>
            <div
              style={{
                fontSize: '11px',
                fontWeight: '800',
                color: NAVY,
                marginBottom: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Terms &amp; Conditions:
            </div>
            <div style={{ fontSize: '10px', color: '#666', lineHeight: '1.6' }}>
              Payment is due within 15 days. Standard lease terms apply. All amounts are in Qatari
              Riyal (QAR). Cheque should be in favor of:{' '}
              <span style={{ fontWeight: '700', color: NAVY }}>{companyInfo.name}</span>
            </div>
          </div>

          {/* Right: amounts */}
          <div style={{ width: '260px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 0',
                borderBottom: '1px solid #eee',
                fontSize: '12px',
              }}
            >
              <span style={{ color: '#666' }}>Subtotal (Before VAT)</span>
              <span style={{ fontWeight: '400', color: '#333' }}>{fmt(totals.subTotal)}</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 0',
                borderBottom: '1px solid #eee',
                fontSize: '12px',
              }}
            >
              <span style={{ color: '#666' }}>VAT Amount</span>
              <span style={{ fontWeight: '400', color: '#333' }}>{fmt(totals.tax)}</span>
            </div>
            {leaseDetails.discountPercent && leaseDetails.discountPercent > 0 ? (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '6px 0',
                  borderBottom: '1px solid #eee',
                  fontSize: '12px',
                }}
              >
                <span style={{ color: '#16a34a', fontWeight: '700' }}>
                  Discount ({leaseDetails.discountPercent}%)
                </span>
                <span style={{ color: '#16a34a', fontWeight: '700' }}>
                  -{fmt((totals.subTotal * leaseDetails.discountPercent) / 100)}
                </span>
              </div>
            ) : null}
            {/* Gold TOTAL row */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 12px',
                backgroundColor: GOLD,
                borderRadius: '4px',
                marginTop: '4px',
              }}
            >
              <span style={{ fontSize: '14px', fontWeight: '900', color: NAVY }}>
                Grand Total (Including VAT)
              </span>
              <span style={{ fontSize: '14px', fontWeight: '900', color: NAVY }}>
                QAR {fmt(totals.total)}
              </span>
            </div>

            {/* Monthly EMI highlight */}
            <div
              style={{
                marginTop: '10px',
                padding: '10px 12px',
                backgroundColor: NAVY,
                borderRadius: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  color: '#90a4b0',
                  textTransform: 'uppercase',
                }}
              >
                {isFSM ? 'Monthly Lease' : 'Monthly EMI'}
              </span>
              <span style={{ fontSize: '18px', fontWeight: '900', color: GOLD }}>
                QAR {fmt(leaseDetails.monthlyEmi)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* ═══════════════════════════════════════════════════════════════
          SIGNATURE ROW
      ═══════════════════════════════════════════════════════════════ */}
      <div
        style={{
          padding: '16px 28px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
        }}
      >
        <div style={{ fontSize: '11px', color: '#666', fontStyle: 'italic' }}>
          Thanks for your business!
        </div>
        <div style={{ textAlign: 'center', position: 'relative', minWidth: '180px' }}>
          <img
            src="/seel/seel1.png"
            alt="Seal"
            style={{
              position: 'absolute',
              left: '-24px',
              top: '-55px',
              width: '75px',
              transform: 'rotate(-15deg)',
              opacity: 0.65,
            }}
          />
          <div style={{ borderTop: `2px solid ${NAVY}`, paddingTop: '6px' }}>
            <div
              style={{
                fontSize: '12px',
                fontWeight: '900',
                color: NAVY,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Authorised Sign
            </div>
            <div style={{ fontSize: '10px', color: '#888', marginTop: '2px' }}>
              Authorized Stamp & Signature
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          GOLD FOOTER BAR
      ═══════════════════════════════════════════════════════════════ */}
      <div
        style={{
          backgroundColor: GOLD,
          padding: '10px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            fontSize: '11px',
            fontWeight: '700',
            color: NAVY,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          📞 {companyInfo.phone}
        </div>
        <div style={{ fontSize: '11px', fontWeight: '700', color: NAVY }}>
          🌐 {companyInfo.website}
        </div>
        <div style={{ fontSize: '11px', fontWeight: '700', color: NAVY }}>
          ✉ {companyInfo.email}
        </div>
        <div style={{ fontSize: '11px', fontWeight: '700', color: NAVY }}>
          📍 {companyInfo.address}
        </div>
      </div>
    </div>
  );
};

export default LeaseStandardQuotation;
