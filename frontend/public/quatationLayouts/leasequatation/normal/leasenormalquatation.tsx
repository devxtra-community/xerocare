import React from 'react';
import { numberToWords } from '@/lib/numberToWords';

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
  features?: { subHeading: string; description: string }[];
  productImage?: string;
  warranty?: string;
}

export interface LeaseAgreementDetails {
  leaseType: string;
  rentType?: string; // FSM only: e.g. "FIXED LIMIT", "CPC"
  rentPeriod?: string; // FSM only: e.g. "MONTHLY"
  duration: string;
  advance: number;
  deposit: number;
  discountPercent?: number;
  startDate: string;
  endDate: string;
  monthlyEmi: number; // periodic payment (monthly rent for FSM, EMI for EMI-type)
  totalLeaseValue?: number; // total lease value (FSM: total contract value; EMI: totalAmount)
}

export interface LeaseNormalQuotationProps {
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

const fmt = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ACCENT = '#00A389';

const thStyle = (
  align: 'left' | 'center' | 'right' = 'left',
  color = '#fff',
): React.CSSProperties => ({
  padding: '10px 10px',
  textAlign: align,
  fontWeight: '800',
  fontSize: '11px',
  letterSpacing: '0.5px',
  textTransform: 'uppercase',
  color,
});

const tdStyle = (align: 'left' | 'center' | 'right' = 'center'): React.CSSProperties => ({
  padding: '12px 10px',
  textAlign: align,
  verticalAlign: 'top',
  fontSize: '12px',
});

const LeaseNormalQuotation: React.FC<LeaseNormalQuotationProps> = ({
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
    address: '123 Customer St, Customer Town, ST 12345',
    email: 'customer@example.com',
    phone: '+971 50 123 4567',
  },
  quotation = {
    number: '0000007',
    date: '13-05-2026',
    dueDate: '13-06-2026',
  },
  lineItems = [
    {
      productName: 'Xerox Altalink',
      brand: 'Xerox',
      model: 'C8130',
      modelName: 'ALTALink C8130',
      modelNo: 'C8130',
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
    startDate: '13-05-2026',
    endDate: '13-05-2027',
    monthlyEmi: 0,
  },
  totals = {
    subTotal: 0.0,
    tax: 0.0,
    total: 0.0,
  },
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
        backgroundColor: '#ffffff',
        width: '794px',
        minHeight: '1122px',
        margin: '0 auto',
        padding: '50px 40px',
        color: '#1a1a1a',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
      }}
    >
      {/* ─── TITLE ─── */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div
          style={{
            fontSize: '26px',
            fontWeight: '800',
            color: ACCENT,
            textTransform: 'uppercase',
            letterSpacing: '2px',
          }}
        >
          LEASE QUOTATION
        </div>
      </div>

      {/* ─── HEADER ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <div style={{ fontSize: '17px', fontWeight: '800', color: ACCENT, marginBottom: '6px' }}>
            {companyInfo.name}
          </div>
          <div style={{ fontSize: '12px', color: '#333', lineHeight: '1.5' }}>
            <div>{companyInfo.address}</div>
            <div>Mobile: {companyInfo.phone}</div>
            <div>Email: {companyInfo.email}</div>
          </div>
        </div>
        <div
          style={{
            width: '160px',
            height: '75px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
          }}
        >
          {companyInfo.logo ? (
            <img
              src={companyInfo.logo}
              alt="Logo"
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            />
          ) : (
            <div
              style={{
                fontSize: '20px',
                fontWeight: 'bold',
                color: '#ccc',
                border: '2px solid #ccc',
                padding: '8px 16px',
              }}
            >
              LOGO
            </div>
          )}
        </div>
      </div>

      {/* ─── BILL TO & QUOTATION INFO ─── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '24px',
          borderTop: `1px solid ${ACCENT}`,
          paddingTop: '18px',
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: '13px',
              fontWeight: '800',
              color: ACCENT,
              marginBottom: '6px',
              textTransform: 'uppercase',
            }}
          >
            Bill To
          </div>
          <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
            {billTo.name}
          </div>
          <div
            style={{ fontSize: '12px', color: '#555', lineHeight: '1.4', whiteSpace: 'pre-line' }}
          >
            {billTo.address}
          </div>
          {billTo.phone && (
            <div style={{ fontSize: '12px', color: '#555' }}>Tel: {billTo.phone}</div>
          )}
          {billTo.email && (
            <div style={{ fontSize: '12px', color: '#555' }}>Email: {billTo.email}</div>
          )}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <div style={{ width: '230px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '13px', fontWeight: '400', color: '#111' }}>
                Quotation No :
              </span>
              <span style={{ fontSize: '13px', fontWeight: '500' }}>{quotation.number}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', color: '#555' }}>Date :</span>
              <span style={{ fontSize: '12px', fontWeight: '400' }}>{quotation.date}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: '#555' }}>Due Date :</span>
              <span style={{ fontSize: '12px', fontWeight: '400' }}>{quotation.dueDate}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── SUBJECT LINE ─── */}
      <div style={{ marginBottom: '22px' }}>
        <div
          style={{
            backgroundColor: ACCENT,
            color: '#ffffff',
            padding: '6px 20px',
            borderRadius: '6px',
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
      <div
        style={{
          marginBottom: '15px',
          padding: '0 5px',
          color: '#333',
          fontSize: '12.5px',
          lineHeight: '1.4',
        }}
      >
        <div style={{ marginBottom: '2px' }}>Dear Sir,</div>
        <div>
          Thank you for your valuable enquiry, please find our best competitive offers below:
        </div>
      </div>
      {/* ─── MACHINE DETAILS ─── */}
      <div
        style={{
          backgroundColor: '#f9f9f9',
          padding: '6px 18px',
          borderRadius: '8px',
          marginBottom: '12px',
          border: '1px solid #eee',
        }}
      >
        <div
          style={{
            fontSize: '11px',
            fontWeight: '800',
            color: ACCENT,
            textTransform: 'uppercase',
            marginBottom: '10px',
            borderBottom: '1px solid #e0e0e0',
            paddingBottom: '5px',
          }}
        >
          Product Details
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px 24px' }}>
          <div>
            <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>Brand</div>
            <div style={{ fontSize: '13px', fontWeight: '500' }}>
              {lineItems[0]?.brand || 'N/A'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>
              Product Name
            </div>
            <div style={{ fontSize: '13px', fontWeight: '500' }}>
              {lineItems[0]?.productName || 'N/A'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>
              Model Name
            </div>
            <div style={{ fontSize: '13px', fontWeight: '500' }}>
              {lineItems[0]?.modelName || 'N/A'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>
              Model Number
            </div>
            <div style={{ fontSize: '13px', fontWeight: '500' }}>
              {lineItems[0]?.modelNo || lineItems[0]?.model || 'N/A'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>
              Serial Number
            </div>
            <div style={{ fontSize: '13px', fontWeight: '500' }}>{lineItems[0]?.slNo || 'TBD'}</div>
          </div>
        </div>
      </div>

      {/* ─── ITEMS TABLE ─── */}
      {/* For FSM: show Description | Qty | Limit | Excess Rate columns */}
      {/* For EMI: show Description | Qty | Limit | Rate | Amount columns */}
      <div style={{ flex: 1, marginBottom: '24px' }}>
        <div
          style={{
            fontSize: '13px',
            fontWeight: '800',
            color: ACCENT,
            textTransform: 'uppercase',
            borderBottom: `2px solid ${ACCENT}`,
            paddingBottom: '5px',
            marginBottom: '10px',
          }}
        >
          {isFSM ? 'Agreement & Usage Details' : 'Items'}
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: ACCENT, color: '#fff' }}>
              <th style={{ ...thStyle(), width: '36px' }}>Sl.</th>
              <th style={{ ...thStyle(), width: '50%' }}>Description</th>
              <th style={thStyle('center')}>Qty</th>
              <th style={thStyle('center')}>Limit</th>
              {isFSM ? (
                <th style={{ ...thStyle('right') }}>Excess Rate</th>
              ) : (
                <>
                  <th style={{ ...thStyle('right') }}>Rate</th>
                  <th style={{ ...thStyle('right') }}>Amount</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item, idx) => (
              <tr
                key={idx}
                style={{
                  backgroundColor: idx % 2 === 0 ? '#fff' : '#f4fbf9',
                  borderBottom: '1px solid #eee',
                }}
              >
                <td style={tdStyle()}>{idx + 1}</td>
                <td style={{ ...tdStyle('left'), whiteSpace: 'pre-wrap' }}>
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#1a1a1a',
                      fontWeight: '600',
                      maxWidth: '95%',
                      lineHeight: '1.6',
                    }}
                  >
                    <div
                      style={{
                        whiteSpace: 'pre-wrap',
                        marginBottom: item.features?.length ? '12px' : '0',
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
                            color: '#10b981',
                            textTransform: 'uppercase',
                            marginBottom: '6px',
                            marginTop: '16px',
                          }}
                        >
                          Features
                        </div>
                        {(item.features || []).map((f, i) => (
                          <div key={i} style={{ marginTop: '8px', fontSize: '11px' }}>
                            {f.subHeading && (
                              <strong
                                style={{ color: '#dc2626', display: 'block', marginBottom: '4px' }}
                              >
                                {f.subHeading}
                              </strong>
                            )}
                            {f.description && <div style={{ color: '#444' }}>{f.description}</div>}
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </td>
                <td style={tdStyle()}>{item.qty}</td>
                <td style={tdStyle()}>{item.limit}</td>
                {isFSM ? (
                  <td style={{ ...tdStyle('right') }}>{item.excessRate || 'N/A'}</td>
                ) : (
                  <>
                    <td style={{ ...tdStyle('right') }}>{fmt(Number(item.rate))}</td>
                    <td style={{ ...tdStyle('right'), fontWeight: '700' }}>
                      {fmt(item.qty * Number(item.rate))}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ─── FSM: SLAB RATE TABLES ─── */}
      {isFSM && hasSlabs && (
        <div style={{ marginBottom: '24px' }}>
          <div
            style={{
              fontSize: '13px',
              fontWeight: '800',
              color: ACCENT,
              textTransform: 'uppercase',
              borderBottom: `2px solid ${ACCENT}`,
              paddingBottom: '5px',
              marginBottom: '14px',
            }}
          >
            Usage Based Pricing (Slab Rates)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {lineItems.map(
              (item, idx) =>
                ((item.bwSlabs?.length || 0) > 0 ||
                  (item.colorSlabs?.length || 0) > 0 ||
                  (item.comboSlabs?.length || 0) > 0) && (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: '#f8fafc',
                      padding: '18px',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: '800',
                        color: '#475569',
                        marginBottom: '12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        borderBottom: '1px solid #e2e8f0',
                        paddingBottom: '8px',
                      }}
                    >
                      <span>
                        MACHINE SPECS: {item.brand} {item.model}
                      </span>
                      <span style={{ color: ACCENT }}>{item.productName}</span>
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                        gap: '24px',
                      }}
                    >
                      {/* BW Slabs */}
                      {item.bwSlabs && item.bwSlabs.length > 0 && (
                        <div>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              marginBottom: '8px',
                            }}
                          >
                            <div
                              style={{
                                width: '8px',
                                height: '8px',
                                backgroundColor: '#1e293b',
                                borderRadius: '2px',
                              }}
                            />
                            <span style={{ fontSize: '10px', fontWeight: '900', color: '#1e293b' }}>
                              B&W RATE TABLE
                            </span>
                          </div>
                          <table
                            style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}
                          >
                            <thead>
                              <tr
                                style={{
                                  color: '#64748b',
                                  textAlign: 'left',
                                  borderBottom: '1px solid #e2e8f0',
                                }}
                              >
                                <th style={{ padding: '6px 0', fontWeight: '600' }}>Page Range</th>
                                <th
                                  style={{
                                    padding: '6px 0',
                                    textAlign: 'right',
                                    fontWeight: '600',
                                  }}
                                >
                                  Rate
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {item.bwSlabs.map((s, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                  <td style={{ padding: '6px 0', color: '#334155' }}>
                                    {s.from.toLocaleString()} –{' '}
                                    {Number(s.to) === 0 || s.to >= 999999
                                      ? 'UNLIMITED'
                                      : s.to.toLocaleString()}
                                  </td>
                                  <td
                                    style={{
                                      padding: '6px 0',
                                      textAlign: 'right',
                                      fontWeight: '900',
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
                      {/* Color Slabs */}
                      {item.colorSlabs && item.colorSlabs.length > 0 && (
                        <div>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              marginBottom: '8px',
                            }}
                          >
                            <div
                              style={{
                                width: '8px',
                                height: '8px',
                                background: 'linear-gradient(to right,#ef4444,#3b82f6)',
                                borderRadius: '2px',
                              }}
                            />
                            <span style={{ fontSize: '10px', fontWeight: '900', color: '#1e293b' }}>
                              COLOR RATE TABLE
                            </span>
                          </div>
                          <table
                            style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}
                          >
                            <thead>
                              <tr
                                style={{
                                  color: '#64748b',
                                  textAlign: 'left',
                                  borderBottom: '1px solid #e2e8f0',
                                }}
                              >
                                <th style={{ padding: '6px 0', fontWeight: '600' }}>Page Range</th>
                                <th
                                  style={{
                                    padding: '6px 0',
                                    textAlign: 'right',
                                    fontWeight: '600',
                                  }}
                                >
                                  Rate
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {item.colorSlabs.map((s, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                  <td style={{ padding: '6px 0', color: '#334155' }}>
                                    {s.from.toLocaleString()} –{' '}
                                    {Number(s.to) === 0 || s.to >= 999999
                                      ? 'UNLIMITED'
                                      : s.to.toLocaleString()}
                                  </td>
                                  <td
                                    style={{
                                      padding: '6px 0',
                                      textAlign: 'right',
                                      fontWeight: '900',
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
                              gap: '8px',
                              marginBottom: '8px',
                            }}
                          >
                            <div
                              style={{
                                width: '8px',
                                height: '8px',
                                background: 'linear-gradient(to right,#8b5cf6,#06b6d4)',
                                borderRadius: '2px',
                              }}
                            />
                            <span style={{ fontSize: '10px', fontWeight: '900', color: '#1e293b' }}>
                              COMBO RATE TABLE
                            </span>
                          </div>
                          <table
                            style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}
                          >
                            <thead>
                              <tr
                                style={{
                                  color: '#64748b',
                                  textAlign: 'left',
                                  borderBottom: '1px solid #e2e8f0',
                                }}
                              >
                                <th style={{ padding: '6px 0', fontWeight: '600' }}>Page Range</th>
                                <th
                                  style={{
                                    padding: '6px 0',
                                    textAlign: 'right',
                                    fontWeight: '600',
                                  }}
                                >
                                  Rate
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {item.comboSlabs.map((s, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                  <td style={{ padding: '6px 0', color: '#334155' }}>
                                    {s.from.toLocaleString()} –{' '}
                                    {Number(s.to) === 0 || s.to >= 999999
                                      ? 'UNLIMITED'
                                      : s.to.toLocaleString()}
                                  </td>
                                  <td
                                    style={{
                                      padding: '6px 0',
                                      textAlign: 'right',
                                      fontWeight: '900',
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

      {/* ─── LEASE AGREEMENT DETAILS ─── */}
      <div style={{ marginBottom: '28px' }}>
        <div
          style={{
            fontSize: '13px',
            fontWeight: '800',
            color: ACCENT,
            marginBottom: '12px',
            textTransform: 'uppercase',
            borderBottom: `2px solid ${ACCENT}`,
            paddingBottom: '5px',
          }}
        >
          Lease Agreement Details
        </div>

        {/* FSM: show agreement table like rent quotation */}
        {isFSM ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9f9f9', color: ACCENT }}>
                <th style={thStyle('left', ACCENT)}>Lease Type</th>
                <th style={thStyle('center', ACCENT)}>Pricing Model</th>
                <th style={thStyle('center', ACCENT)}>Period</th>
                <th style={thStyle('center', ACCENT)}>Advance</th>
                <th style={thStyle('center', ACCENT)}>Deposit</th>
                <th style={thStyle('center', ACCENT)}>Duration</th>
                <th style={thStyle('center', ACCENT)}>Discount</th>
                <th style={thStyle('right', ACCENT)}>Monthly Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #eee' }}>
                <td style={tdStyle('left')}>FSM</td>
                <td style={tdStyle('center')}>{leaseDetails.rentType || 'FIXED LIMIT'}</td>
                <td style={tdStyle('center')}>{leaseDetails.rentPeriod || 'MONTHLY'}</td>
                <td style={tdStyle('center')}>QAR {fmt(leaseDetails.advance)}</td>
                <td style={tdStyle('center')}>QAR {fmt(leaseDetails.deposit)}</td>
                <td style={tdStyle('center')}>{leaseDetails.duration}</td>
                <td style={tdStyle('center')}>
                  {leaseDetails.discountPercent && leaseDetails.discountPercent > 0 ? (
                    <span style={{ color: '#16a34a', fontWeight: '800' }}>
                      {leaseDetails.discountPercent}%
                    </span>
                  ) : (
                    '0%'
                  )}
                </td>
                <td style={{ ...tdStyle('right'), fontWeight: '700', color: ACCENT }}>
                  QAR {fmt(leaseDetails.monthlyEmi)}
                </td>
              </tr>
            </tbody>
          </table>
        ) : (
          /* EMI: keep the existing key-value grid */
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0 40px',
              backgroundColor: '#ffffff',
              padding: '6px 0',
            }}
          >
            {[
              { label: 'Lease Type', value: leaseDetails.leaseType },
              { label: 'Tenure / Duration', value: leaseDetails.duration },
              { label: 'Advance Payment', value: `QAR ${fmt(leaseDetails.advance)}` },
              { label: 'Security Deposit', value: `QAR ${fmt(leaseDetails.deposit)}` },
              { label: 'Contract Start Date', value: leaseDetails.startDate },
              { label: 'Contract End Date', value: leaseDetails.endDate },
              { label: 'Monthly EMI Amount', value: `QAR ${fmt(leaseDetails.monthlyEmi)}` },
            ].map((item, id) => (
              <div
                key={id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  borderBottom: '1px solid #f0f0f0',
                }}
              >
                <span style={{ fontSize: '12px', color: '#666' }}>{item.label}</span>
                <span style={{ fontSize: '12px', fontWeight: '700' }}>{item.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* FSM: show start/end dates below the table */}
        {isFSM && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0 40px',
              marginTop: '8px',
            }}
          >
            {[
              { label: 'Contract Start Date', value: leaseDetails.startDate },
              { label: 'Contract End Date', value: leaseDetails.endDate },
            ].map((item, id) => (
              <div
                key={id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '7px 0',
                  borderBottom: '1px solid #f0f0f0',
                }}
              >
                <span style={{ fontSize: '12px', color: '#666' }}>{item.label}</span>
                <span style={{ fontSize: '12px', fontWeight: '700' }}>{item.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── TOTALS & MONTHLY AMOUNT ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: '800', color: '#333', marginBottom: '8px' }}>
            Payment Instructions :
          </div>
          <div style={{ fontSize: '11px', color: '#666', lineHeight: '1.5' }}>
            Payable as per the Lease Agreement.
            <br />
            Cheque should be in favor of:
            <br />
            <span style={{ fontWeight: '700', color: '#111' }}>
              Xerocare Trading &amp; Services W.L.L
            </span>
          </div>

          {lineItems?.[0]?.productImage && (
            <div style={{ marginTop: '20px' }}>
              <img
                src={lineItems[0].productImage}
                alt="Product"
                style={{
                  maxWidth: '600px',
                  maxHeight: '400px',
                  objectFit: 'contain',
                  filter: 'grayscale(100%)',
                  opacity: 0.8,
                }}
              />
            </div>
          )}
        </div>
        <div style={{ width: '280px' }}>
          <div style={{ padding: '0 15px' }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                marginBottom: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#666' }}>Total Lease Value</span>
                <span style={{ color: '#000', fontWeight: '700' }}>{fmt(totals.subTotal)}</span>
              </div>
              <div
                style={{
                  fontSize: '9px',
                  color: '#111827',
                  fontStyle: 'italic',
                  textAlign: 'right',
                }}
              >
                {numberToWords(totals.subTotal)}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                marginBottom: '10px',
                borderBottom: '1px solid #ddd',
                paddingBottom: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#666' }}>Total Tax (0%)</span>
                <span style={{ color: '#000', fontWeight: '700' }}>{fmt(totals.tax)}</span>
              </div>
              <div
                style={{
                  fontSize: '9px',
                  color: '#111827',
                  fontStyle: 'italic',
                  textAlign: 'right',
                }}
              >
                {numberToWords(totals.tax)}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                color: ACCENT,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '18px',
                  fontWeight: '900',
                }}
              >
                <span>TOTAL</span>
                <span>QAR {fmt(totals.total)}</span>
              </div>
              <div
                style={{
                  fontSize: '10px',
                  color: '#111827',
                  fontStyle: 'italic',
                  textAlign: 'right',
                  marginTop: '2px',
                }}
              >
                {numberToWords(totals.total)}
              </div>
            </div>
          </div>

          <div style={{ marginTop: '14px', textAlign: 'right', paddingRight: '15px' }}>
            <div style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>
              {isFSM ? 'Monthly Lease Amount' : 'Monthly EMI Amount'}
            </div>
            <div style={{ fontSize: '22px', fontWeight: '900', color: '#111' }}>
              QAR {fmt(leaseDetails.monthlyEmi)}
            </div>
            <div
              style={{
                fontSize: '10px',
                color: '#888',
                fontStyle: 'italic',
                textAlign: 'right',
                marginTop: '4px',
              }}
            >
              {numberToWords(leaseDetails.monthlyEmi)}
            </div>
          </div>
        </div>
      </div>
      <div
        style={{
          fontSize: '12px',
          marginTop: '30px',
          marginBottom: '40px',
          lineHeight: '1.6',
          color: '#333',
        }}
      >
        <div style={{ marginBottom: '15px' }}>
          for any further clarifications please feel free to contact the undersigned on{' '}
          <span style={{ color: ACCENT }}>mob: 70717282</span> or{' '}
          <span style={{ color: ACCENT }}>email:mail@xerocare.com</span>
        </div>
        <div style={{ marginTop: '10px' }}>
          with warm regards,
          <br />
          <strong style={{ display: 'block', marginTop: '4px', color: ACCENT }}>
            For
            <br />
            Xerocare Trading&services WLL
          </strong>
          DOHA QTAR
        </div>
      </div>
      {/* ─── SIGNATURE ─── */}
      <div
        style={{
          marginTop: 'auto',
          display: 'flex',
          justifyContent: 'flex-end',
          paddingTop: '36px',
        }}
      >
        <div style={{ textAlign: 'center', width: '200px', position: 'relative' }}>
          <img
            src="/seel/seel1.png"
            alt="Seal"
            style={{
              position: 'absolute',
              left: '-28px',
              top: '-60px',
              width: '80px',
              transform: 'rotate(-15deg)',
              opacity: 0.6,
            }}
          />
          <div style={{ borderTop: '2px solid #333', paddingTop: '6px' }}>
            <div style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase' }}>
              Authorized Signatory
            </div>
            <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>
              {companyInfo.name}
            </div>
          </div>
        </div>
      </div>

      {/* ─── FOOTER ─── */}
      <div
        style={{
          marginTop: 'auto',
          borderTop: `2px solid ${ACCENT}`,
          paddingTop: '15px',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: '#666',
        }}
      >
        <div>www.xerocare.com</div>
        <div>37494,Doha-qatar</div>
        <div>mail@xerocare.com | +974 7071 7282 (+٩٧٤ ٧٠٧١ ٧٢٨٢)</div>
      </div>
    </div>
  );
};

export default LeaseNormalQuotation;
