import React from 'react';

export interface SlabRange {
  from: number;
  to: number;
  rate: number;
}

export interface RentLineItem {
  productName: string;
  brand: string;
  model: string;
  modelName?: string;
  modelNo?: string;
  slNo?: string;
  description: string;
  qty: number;
  limit: string;
  excessRate: string;
  bwSlabs?: SlabRange[];
  colorSlabs?: SlabRange[];
  comboSlabs?: SlabRange[];
  image?: string;
  features?: { subHeading: string; description: string }[];
  warranty?: string;
}

export interface RentAgreementDetails {
  rentType: string;
  period: string;
  advance: number;
  deposit: number;
  duration: string;
  monthlyRentAmount: number;
  discountPercent?: number;
  discountedMonthlyRent?: number;
}

export interface RentStandardQuotationProps {
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
    contractStartDate?: string;
    contractEndDate?: string;
  };
  lineItems?: RentLineItem[];
  agreementDetails?: RentAgreementDetails;
  totals?: {
    subTotal: number;
    tax: number;
    total: number;
  };
}

const BLUE = '#1565c0';
const DARK_NAVY = '#0d1b2a';
const LOGO_PATH =
  '/quatationLayouts/productsalequatation/normal/normallogo/xerocarelogo-removebg-preview.png';

const fmt = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const RentStandardQuotation: React.FC<RentStandardQuotationProps> = ({
  billTo = {
    name: 'Customer Name',
    address: '123 Road Name Here',
    email: 'customer@example.com',
    phone: '+974 0000 0000',
  },
  quotation = {
    number: 'QTN-2024-001',
    date: 'dd/mm/yyyy',
    dueDate: 'dd/mm/yyyy',
  },
  lineItems = [],
  agreementDetails = {
    rentType: 'CPC',
    period: 'MONTHLY',
    advance: 0,
    deposit: 0,
    duration: '12 Months',
    monthlyRentAmount: 0,
  },
  totals = { subTotal: 0, tax: 0, total: 0 },
}) => {
  return (
    <div
      style={{
        width: '900px',
        minHeight: '1122px',
        margin: '0 auto',
        backgroundColor: '#ffffff',
        fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
        color: '#222',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 0 30px rgba(0,0,0,0.08)',
      }}
    >
      {/* ═══════════════════════════════════════════
          HEADER — Blue angled block (left) + Title (right)
      ══════════════════════════════════════════════ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          height: '120px',
          overflow: 'hidden',
          position: 'relative',
          backgroundColor: '#fff',
        }}
      >
        {/* Blue angled block */}
        <div
          style={{
            position: 'relative',
            backgroundColor: BLUE,
            width: '310px',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            paddingLeft: '30px',
            paddingRight: '60px',
            /* Angled right edge using clip-path */
            clipPath: 'polygon(0 0, 100% 0, 85% 100%, 0 100%)',
          }}
        >
          <img
            src={LOGO_PATH}
            alt="Xerocare"
            style={{ width: '52px', height: '52px', objectFit: 'contain', marginRight: '14px' }}
          />
          <div>
            <div
              style={{
                fontSize: '20px',
                fontWeight: '900',
                color: '#fff',
                letterSpacing: '0.02em',
                lineHeight: 1,
              }}
            >
              XEROCARE
            </div>
            <div
              style={{
                fontSize: '9px',
                color: 'rgba(255,255,255,0.75)',
                letterSpacing: '0.12em',
                marginTop: '4px',
              }}
            >
              TRADING &amp; SERVICES W.L.L
            </div>
          </div>
        </div>

        {/* Right: QUOTATION + ref / date */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'flex-end',
            paddingRight: '36px',
            paddingLeft: '20px',
          }}
        >
          <div
            style={{
              fontSize: '46px',
              fontWeight: '900',
              color: '#111',
              letterSpacing: '0.02em',
              lineHeight: 1,
            }}
          >
            QUOTATION
          </div>
          <div
            style={{ fontSize: '11px', color: '#777', marginTop: '6px', letterSpacing: '0.05em' }}
          >
            Invoice No: {quotation.number} &nbsp;&nbsp; Date: {quotation.date}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          INVOICE TO / PAYMENT INFORMATION
      ══════════════════════════════════════════════ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '40px',
          padding: '28px 36px 24px',
          borderBottom: '1px solid #e8ecf0',
        }}
      >
        {/* Invoice To */}
        <div>
          <div
            style={{
              fontSize: '11px',
              fontWeight: '800',
              color: '#555',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '6px',
            }}
          >
            Invoice To :
          </div>
          <div style={{ fontSize: '13px', fontWeight: '800', color: BLUE, marginBottom: '4px' }}>
            {billTo.name}
          </div>
          {billTo.address && (
            <div style={{ fontSize: '11px', color: '#555' }}>{billTo.address}</div>
          )}
          {billTo.email && <div style={{ fontSize: '11px', color: '#555' }}>{billTo.email}</div>}
          {billTo.trn && <div style={{ fontSize: '11px', color: '#555' }}>TRN: {billTo.trn}</div>}
          <div style={{ marginTop: '12px', fontSize: '11px', color: '#555', lineHeight: '1.9' }}>
            <div>
              <span style={{ color: '#333', fontWeight: '600' }}>
                Ref No &nbsp;&nbsp;&nbsp;&nbsp;:
              </span>{' '}
              {quotation.number}
            </div>
            <div>
              <span style={{ color: '#333', fontWeight: '600' }}>
                Date &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:
              </span>{' '}
              {quotation.date}
            </div>
            <div>
              <span style={{ color: '#333', fontWeight: '600' }}>Valid Till :</span>{' '}
              {quotation.dueDate}
            </div>
          </div>
        </div>

        {/* Payment Information */}
        <div>
          <div
            style={{
              fontSize: '11px',
              fontWeight: '800',
              color: '#555',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '6px',
            }}
          >
            Payment Information :
          </div>
          <div style={{ fontSize: '11px', color: '#555', lineHeight: '2' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: '12px' }}>
              <span style={{ fontWeight: '600', color: '#333' }}>Company</span>
              <span>Xerocare Trading &amp; Services W.L.L</span>
              <span style={{ fontWeight: '600', color: '#333' }}>Email</span>
              <span>mail@xerocare.com</span>
              <span style={{ fontWeight: '600', color: '#333' }}>Phone</span>
              <span>+974 7071 7282</span>
              <span style={{ fontWeight: '600', color: '#333' }}>Website</span>
              <span>www.xerocare.com</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          MACHINE INFORMATION
      ══════════════════════════════════════════════ */}
      <div style={{ padding: '0 36px 10px', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
        {lineItems.map((item, idx) => (
          <div
            key={`machine-${idx}`}
            style={{
              flex: '1 1 340px',
              backgroundColor: '#f8f9fa',
              padding: '14px',
              borderRadius: '8px',
              border: '1px solid #eef2f8',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              fontSize: '11px',
            }}
          >
            <div
              style={{
                gridColumn: 'span 2',
                display: 'flex',
                justifyContent: 'space-between',
                borderBottom: '1px solid #eef2f8',
                paddingBottom: '6px',
                marginBottom: '4px',
              }}
            >
              <span
                style={{
                  fontWeight: '800',
                  color: BLUE,
                  textTransform: 'uppercase',
                  fontSize: '9.5px',
                }}
              >
                Machine Info {lineItems.length > 1 ? `#${idx + 1}` : ''}
              </span>
              <span style={{ color: BLUE, fontSize: '10px', fontWeight: 'bold' }}>
                S/N: {item.slNo || 'TBD'}
              </span>
            </div>
            <div>
              <span style={{ color: '#888', marginRight: '5px' }}>Brand:</span>
              <span style={{ fontWeight: '700', color: '#111' }}>{item.brand}</span>
            </div>
            <div>
              <span style={{ color: '#888', marginRight: '5px' }}>Model:</span>
              <span style={{ fontWeight: '700', color: '#111' }}>{item.model}</span>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <span style={{ color: '#888', marginRight: '5px' }}>Product:</span>
              <span style={{ fontWeight: '700', color: '#111' }}>{item.productName}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ═══════════════════════════════════════════
          EQUIPMENT TABLE
      ══════════════════════════════════════════════ */}
      <div style={{ padding: '20px 36px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: BLUE, color: '#fff' }}>
              <th style={th('center')}>NO.</th>
              <th style={{ ...th('left'), width: '50%', textAlign: 'left' }}>Description</th>
              <th style={th('center')}>Qty</th>
              <th style={th('center')}>Limit</th>
              <th style={th('right')}>Excess Rate</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item, idx) => (
              <tr
                key={idx}
                style={{
                  backgroundColor: idx % 2 === 0 ? '#ffffff' : '#eef4ff',
                  borderBottom: '1px solid #e5eaf2',
                }}
              >
                <td style={td('center')}>{String(idx + 1).padStart(2, '0')}.</td>
                <td
                  style={{
                    ...td('left'),
                    minHeight: '320px',
                    position: 'relative',
                    padding: 0,
                  }}
                >
                  {item.image && (
                    <img
                      src={item.image}
                      alt=""
                      style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        height: '120%',
                        width: '100%',
                        objectFit: 'contain',
                        opacity: 0.25,
                        zIndex: 0,
                        filter: 'grayscale(100%)',
                      }}
                    />
                  )}
                  <div
                    style={{
                      position: 'relative',
                      zIndex: 1,
                      padding: '24px',
                      height: '100%',
                      textAlign: 'left',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '16px',
                        color: '#333',
                        marginTop: '10px',
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
                      <div style={{ marginBottom: item.features?.length ? '12px' : '0' }}>
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
                <td style={td('center')}>{item.qty}</td>
                <td style={td('center')}>{item.limit}</td>
                <td style={td('right')}>{item.excessRate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ═══════════════════════════════════════════
          AGREEMENT DETAILS
      ══════════════════════════════════════════════ */}
      <div style={{ padding: '0 36px 30px' }}>
        <div
          style={{
            fontSize: '10px',
            fontWeight: '800',
            color: BLUE,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '10px',
            borderLeft: `3px solid ${BLUE}`,
            paddingLeft: '10px',
          }}
        >
          Agreement Details
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px' }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${BLUE}`, color: '#666' }}>
              <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '800' }}>
                RENT TYPE
              </th>
              <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '800' }}>
                PERIOD
              </th>
              <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '800' }}>
                ADVANCE / DEPOSIT
              </th>
              <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '800' }}>
                MONTHS COUNT
              </th>
              <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '800' }}>
                DISCOUNT
              </th>
              <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '800' }}>
                MONTHLY RENT
              </th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ background: '#fff' }}>
              <td style={{ padding: '12px', fontWeight: '700', color: '#111' }}>
                {agreementDetails.rentType}
              </td>
              <td style={{ padding: '12px', textAlign: 'center', color: '#444' }}>
                {agreementDetails.period}
              </td>
              <td style={{ padding: '12px', textAlign: 'center', color: '#444' }}>
                {fmt(agreementDetails.advance || agreementDetails.deposit || 0)}
              </td>
              <td style={{ padding: '12px', textAlign: 'center', color: '#444' }}>
                {agreementDetails.duration}
              </td>
              <td style={{ padding: '12px', textAlign: 'center' }}>
                {agreementDetails.discountPercent && agreementDetails.discountPercent > 0 ? (
                  <span style={{ color: '#059669', fontWeight: '700' }}>
                    {agreementDetails.discountPercent}%
                  </span>
                ) : (
                  '0%'
                )}
              </td>
              <td style={{ padding: '12px', textAlign: 'right' }}>
                {agreementDetails.discountPercent && agreementDetails.discountPercent > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span
                      style={{ textDecoration: 'line-through', color: '#aaa', fontSize: '9px' }}
                    >
                      {fmt(agreementDetails.monthlyRentAmount)}
                    </span>
                    <span style={{ fontWeight: '800', color: BLUE, fontSize: '11px' }}>
                      {fmt(
                        agreementDetails.discountedMonthlyRent ||
                          agreementDetails.monthlyRentAmount,
                      )}
                    </span>
                  </div>
                ) : (
                  <span style={{ fontWeight: '800', color: BLUE, fontSize: '11px' }}>
                    {fmt(agreementDetails.monthlyRentAmount)}
                  </span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ═══════════════════════════════════════════
          SLAB RATES
      ══════════════════════════════════════════════ */}
      {lineItems.some(
        (it) =>
          (it.bwSlabs?.length || 0) > 0 ||
          (it.colorSlabs?.length || 0) > 0 ||
          (it.comboSlabs?.length || 0) > 0,
      ) && (
        <div style={{ padding: '0 36px 24px' }}>
          <div
            style={{
              fontSize: '10px',
              fontWeight: '800',
              color: BLUE,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '10px',
              borderLeft: `3px solid ${BLUE}`,
              paddingLeft: '10px',
            }}
          >
            Usage-Based Pricing (Slab Rates)
          </div>
          {lineItems.map(
            (item, idx) =>
              ((item.bwSlabs?.length || 0) > 0 ||
                (item.colorSlabs?.length || 0) > 0 ||
                (item.comboSlabs?.length || 0) > 0) && (
                <div
                  key={idx}
                  style={{
                    marginBottom: '12px',
                    border: '1px solid #d4e0f7',
                    borderRadius: '8px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      backgroundColor: '#dce8fb',
                      padding: '8px 16px',
                      fontSize: '10px',
                      fontWeight: '800',
                      color: '#1a2e5a',
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>
                      {item.brand} {item.model}
                    </span>
                    <span style={{ color: BLUE }}>{item.productName}</span>
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      padding: '12px 16px',
                      gap: '20px',
                      backgroundColor: '#f5f8ff',
                    }}
                  >
                    {item.bwSlabs && item.bwSlabs.length > 0 && (
                      <div>
                        <div
                          style={{
                            fontSize: '9px',
                            fontWeight: '900',
                            color: '#222',
                            marginBottom: '6px',
                            textTransform: 'uppercase',
                          }}
                        >
                          Black &amp; White
                        </div>
                        <table
                          style={{ width: '100%', fontSize: '10.5px', borderCollapse: 'collapse' }}
                        >
                          <thead>
                            <tr style={{ borderBottom: '1px solid #c8d8f0', color: '#64748b' }}>
                              <th
                                style={{ padding: '4px 0', fontWeight: '600', textAlign: 'left' }}
                              >
                                Range
                              </th>
                              <th
                                style={{ padding: '4px 0', fontWeight: '600', textAlign: 'right' }}
                              >
                                Rate
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {item.bwSlabs.map((s, i) => (
                              <tr key={i} style={{ borderBottom: '1px solid #eef2f8' }}>
                                <td style={{ padding: '5px 0', color: '#334155' }}>
                                  {s.from.toLocaleString()} –{' '}
                                  {Number(s.to) === 0 || s.to >= 999999
                                    ? 'MAX'
                                    : s.to.toLocaleString()}
                                </td>
                                <td
                                  style={{
                                    padding: '5px 0',
                                    textAlign: 'right',
                                    fontWeight: '800',
                                    color: '#0f172a',
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
                    {item.colorSlabs && item.colorSlabs.length > 0 && (
                      <div>
                        <div
                          style={{
                            fontSize: '9px',
                            fontWeight: '900',
                            color: '#222',
                            marginBottom: '6px',
                            textTransform: 'uppercase',
                          }}
                        >
                          Color
                        </div>
                        <table
                          style={{ width: '100%', fontSize: '10.5px', borderCollapse: 'collapse' }}
                        >
                          <thead>
                            <tr style={{ borderBottom: '1px solid #c8d8f0', color: '#64748b' }}>
                              <th
                                style={{ padding: '4px 0', fontWeight: '600', textAlign: 'left' }}
                              >
                                Range
                              </th>
                              <th
                                style={{ padding: '4px 0', fontWeight: '600', textAlign: 'right' }}
                              >
                                Rate
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {item.colorSlabs.map((s, i) => (
                              <tr key={i} style={{ borderBottom: '1px solid #eef2f8' }}>
                                <td style={{ padding: '5px 0', color: '#334155' }}>
                                  {s.from.toLocaleString()} –{' '}
                                  {Number(s.to) === 0 || s.to >= 999999
                                    ? 'MAX'
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
                    {item.comboSlabs && item.comboSlabs.length > 0 && (
                      <div>
                        <div
                          style={{
                            fontSize: '9px',
                            fontWeight: '900',
                            color: '#222',
                            marginBottom: '6px',
                            textTransform: 'uppercase',
                          }}
                        >
                          Combined
                        </div>
                        <table
                          style={{ width: '100%', fontSize: '10.5px', borderCollapse: 'collapse' }}
                        >
                          <thead>
                            <tr style={{ borderBottom: '1px solid #c8d8f0', color: '#64748b' }}>
                              <th
                                style={{ padding: '4px 0', fontWeight: '600', textAlign: 'left' }}
                              >
                                Range
                              </th>
                              <th
                                style={{ padding: '4px 0', fontWeight: '600', textAlign: 'right' }}
                              >
                                Rate
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {item.comboSlabs.map((s, i) => (
                              <tr key={i} style={{ borderBottom: '1px solid #eef2f8' }}>
                                <td style={{ padding: '5px 0', color: '#334155' }}>
                                  {s.from.toLocaleString()} –{' '}
                                  {Number(s.to) === 0 || s.to >= 999999
                                    ? 'MAX'
                                    : s.to.toLocaleString()}
                                </td>
                                <td
                                  style={{
                                    padding: '5px 0',
                                    textAlign: 'right',
                                    fontWeight: '800',
                                    color: BLUE,
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
      )}

      {/* ═══════════════════════════════════════════
          TERMS & CONDITIONS + TOTALS
      ══════════════════════════════════════════════ */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          padding: '10px 36px 30px',
          gap: '30px',
        }}
      >
        {/* Left: Terms */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '11px', fontWeight: '800', color: '#333', marginBottom: '8px' }}>
            TERMS &amp; CONDITIONS :
          </div>
          <div style={{ fontSize: '10.5px', color: '#666', lineHeight: '1.7', maxWidth: '310px' }}>
            Rates are valid for 30 days from the quotation date. All amounts are in QAR unless
            otherwise stated. Usage-based charges calculated on actual copies made. Monthly rent
            payable at start of each cycle.
          </div>
        </div>

        {/* Right: Totals */}
        <div style={{ minWidth: '220px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '8px 0',
              borderBottom: '1px solid #eee',
              fontSize: '12px',
            }}
          >
            <span style={{ fontWeight: '400', color: '#333' }}>Subtotal (Before VAT)</span>
            <span style={{ fontWeight: '400' }}>QAR {fmt(totals.subTotal)}</span>
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
            <span style={{ fontWeight: '400', color: '#333' }}>VAT Amount</span>
            <span style={{ fontWeight: '400' }}>QAR {fmt(totals.tax)}</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '12px 14px',
              backgroundColor: BLUE,
              color: '#fff',
              borderRadius: '6px',
              marginTop: '8px',
              fontSize: '13px',
              fontWeight: '900',
            }}
          >
            <span>Grand Total (Including VAT)</span>
            <span>QAR {fmt(totals.total)}</span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          SIGNATURES
      ══════════════════════════════════════════════ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 60px 30px' }}>
        {/* Customer */}
        <div style={{ textAlign: 'center', width: '180px' }}>
          <div
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: '22px',
              color: '#333',
              marginBottom: '6px',
              fontStyle: 'italic',
            }}
          >
            Customer
          </div>
          <div
            style={{
              borderTop: '1px solid #333',
              paddingTop: '6px',
              fontSize: '11px',
              color: '#555',
            }}
          >
            Customer Signature
          </div>
        </div>

        {/* Authorized */}
        <div style={{ textAlign: 'center', width: '180px', position: 'relative' }}>
          <img
            src="/seel/seel1.png"
            alt="Seal"
            style={{
              position: 'absolute',
              left: '30px',
              top: '-45px',
              width: '90px',
              transform: 'rotate(-15deg)',
              opacity: 0.85,
            }}
          />
          <div
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: '22px',
              color: '#333',
              marginBottom: '6px',
              fontStyle: 'italic',
            }}
          >
            Authorized
          </div>
          <div
            style={{
              borderTop: '1px solid #333',
              paddingTop: '6px',
              fontSize: '11px',
              color: '#555',
            }}
          >
            Your Name &amp; Sign
          </div>
          <div style={{ fontSize: '10px', color: '#888', marginTop: '2px' }}>
            Authorized Manager
          </div>
        </div>
      </div>

      {/* Thanks line */}
      <div
        style={{
          textAlign: 'center',
          fontSize: '13px',
          fontWeight: '600',
          color: BLUE,
          fontStyle: 'italic',
          paddingBottom: '16px',
        }}
      >
        Thanks For Your Business!
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* ═══════════════════════════════════════════
          FOOTER — Dark navy bar with icons
      ══════════════════════════════════════════════ */}
      <div
        style={{
          backgroundColor: DARK_NAVY,
          padding: '16px 36px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#fff',
            fontSize: '10.5px',
          }}
        >
          <span
            style={{
              backgroundColor: BLUE,
              borderRadius: '50%',
              padding: '4px 6px',
              fontSize: '11px',
            }}
          >
            ☎
          </span>
          <span>+974 7071 7282</span>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#fff',
            fontSize: '10.5px',
          }}
        >
          <span
            style={{
              backgroundColor: BLUE,
              borderRadius: '50%',
              padding: '4px 6px',
              fontSize: '11px',
            }}
          >
            ✉
          </span>
          <span>mail@xerocare.com</span>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#fff',
            fontSize: '10.5px',
          }}
        >
          <span
            style={{
              backgroundColor: BLUE,
              borderRadius: '50%',
              padding: '4px 6px',
              fontSize: '11px',
            }}
          >
            🌐
          </span>
          <span>www.xerocare.com | P.O.BOX 37494, DOHA-QATAR</span>
        </div>
      </div>
    </div>
  );
};

const th = (align: 'left' | 'center' | 'right'): React.CSSProperties => ({
  padding: '12px 14px',
  textAlign: align,
  fontWeight: '700',
  fontSize: '10px',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: '#fff',
});

const td = (align: 'left' | 'center' | 'right'): React.CSSProperties => ({
  padding: '11px 14px',
  textAlign: align,
  fontSize: '12px',
  verticalAlign: 'middle',
});

export default RentStandardQuotation;
