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
  slNo?: string;
  description: string;
  qty: number;
  limit: string;
  excessRate: string;
  bwSlabs?: SlabRange[];
  colorSlabs?: SlabRange[];
  comboSlabs?: SlabRange[];
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

export interface RentNormalQuotationProps {
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

const fmt = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const RentNormalQuotation: React.FC<RentNormalQuotationProps> = ({
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
    date: '10-02-2023',
    dueDate: '10-16-2023',
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
    },
  ],
  agreementDetails = {
    rentType: 'Fixed + Excess',
    period: 'Monthly',
    advance: 1500,
    deposit: 3000,
    duration: '12 Months',
    monthlyRentAmount: 1500,
  },
  totals = {
    subTotal: 1500.0,
    tax: 0.0,
    total: 1500.0,
  },
}) => {
  return (
    <div
      style={{
        fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
        backgroundColor: '#ffffff',
        width: '794px',
        minHeight: '1122px',
        margin: '0 auto',
        padding: '60px 50px',
        color: '#1a1a1a',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
      }}
    >
      {/* ─── HEADER ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#111', marginBottom: '8px' }}>
            {companyInfo.name}
          </div>
          <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.6' }}>
            <div>{companyInfo.address}</div>
            <div>{companyInfo.email}</div>
            <div>{companyInfo.phone}</div>
          </div>
        </div>
        <div
          style={{
            width: '200px',
            height: '120px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {companyInfo.logo ? (
            <img
              src={companyInfo.logo}
              alt="Logo"
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            />
          ) : (
            <span style={{ fontSize: '12px', color: '#ccc' }}>Logo</span>
          )}
        </div>
      </div>

      {/* ─── TITLE ─── */}
      <div style={{ textAlign: 'right', marginBottom: '40px' }}>
        <div
          style={{
            fontSize: '48px',
            fontWeight: '900',
            color: '#d18a66',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          Quotation
        </div>
      </div>

      {/* ─── BILL TO & META ─── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '40px',
          gap: '30px',
        }}
      >
        <div style={{ width: '33%' }}>
          <div
            style={{
              fontSize: '14px',
              fontWeight: 'bold',
              color: '#d18a66',
              marginBottom: '10px',
              textTransform: 'uppercase',
            }}
          >
            Quotation By
          </div>
          <div style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '5px' }}>
            {companyInfo.name}
          </div>
          <div style={{ fontSize: '11px', color: '#666', lineHeight: '1.6' }}>
            {companyInfo.address}
            <br />
            {companyInfo.phone}
            <br />
            {companyInfo.email}
          </div>
        </div>
        <div style={{ width: '33%' }}>
          <div
            style={{
              fontSize: '14px',
              fontWeight: 'bold',
              color: '#d18a66',
              marginBottom: '10px',
              textTransform: 'uppercase',
            }}
          >
            Quotation To
          </div>
          <div style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '5px' }}>
            {billTo.name}
          </div>
          <div
            style={{ fontSize: '11px', color: '#666', lineHeight: '1.6', whiteSpace: 'pre-line' }}
          >
            {billTo.address}
          </div>
          {billTo.phone && (
            <div style={{ fontSize: '11px', color: '#666' }}>Tel: {billTo.phone}</div>
          )}
          {billTo.email && (
            <div style={{ fontSize: '11px', color: '#666' }}>Email: {billTo.email}</div>
          )}
          {billTo.trn && (
            <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
              TRN: {billTo.trn}
            </div>
          )}
        </div>
        <div style={{ width: '33%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <tbody>
              <tr>
                <td style={{ padding: '4px 0', fontWeight: 'bold', color: '#d18a66' }}>
                  Quotation #
                </td>
                <td style={{ padding: '4px 0', textAlign: 'right' }}>{quotation.number}</td>
              </tr>
              <tr>
                <td style={{ padding: '4px 0', fontWeight: 'bold', color: '#d18a66' }}>Date</td>
                <td style={{ padding: '4px 0', textAlign: 'right' }}>{quotation.date}</td>
              </tr>
              <tr>
                <td style={{ padding: '4px 0', fontWeight: 'bold', color: '#d18a66' }}>Due Date</td>
                <td style={{ padding: '4px 0', textAlign: 'right' }}>{quotation.dueDate}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── MACHINE INFORMATION (NEW SECTION) ─── */}
      <div style={{ marginBottom: '25px', display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
        {lineItems.map((item, idx) => (
          <div
            key={`machine-${idx}`}
            style={{
              flex: '1 1 300px',
              backgroundColor: '#fdf8f5',
              padding: '15px',
              borderRadius: '8px',
              border: '1px solid #f3e5db',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#d18a66',
                marginBottom: '10px',
                textTransform: 'uppercase',
                borderBottom: '1px solid #f3e5db',
                paddingBottom: '5px',
              }}
            >
              Machine Info {lineItems.length > 1 ? `#${idx + 1}` : ''}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                fontSize: '11px',
              }}
            >
              <div>
                <span style={{ color: '#888', marginRight: '5px' }}>Brand:</span>
                <span style={{ fontWeight: '600' }}>{item.brand}</span>
              </div>
              <div>
                <span style={{ color: '#888', marginRight: '5px' }}>Model:</span>
                <span style={{ fontWeight: '600' }}>{item.model}</span>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ color: '#888', marginRight: '5px' }}>Product:</span>
                <span style={{ fontWeight: '600' }}>{item.productName}</span>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ color: '#888', marginRight: '5px' }}>Sl No:</span>
                <span style={{ fontWeight: '600' }}>TBD</span>
              </div>
              <div style={{ marginBottom: '6px' }}>
                <span style={{ fontSize: '10px', color: '#555', fontWeight: '600' }}>
                  Contract Start:
                </span>
                <span style={{ fontSize: '10px', float: 'right' }}>
                  {quotation?.contractStartDate || 'TBD'}
                </span>
              </div>
              <div style={{ marginBottom: '6px' }}>
                <span style={{ fontSize: '10px', color: '#555', fontWeight: '600' }}>
                  Contract End:
                </span>
                <span style={{ fontSize: '10px', float: 'right' }}>
                  {quotation?.contractEndDate || 'TBD'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ─── PRODUCT DETAILS TABLE ─── */}
      <div style={{ marginBottom: '30px' }}>
        <div
          style={{
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#d18a66',
            marginBottom: '10px',
            textTransform: 'uppercase',
            borderBottom: '2px solid #d18a66',
            paddingBottom: '5px',
          }}
        >
          Agreement & Usage Details
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: '#d18a66', color: '#fff' }}>
              <th style={{ ...thStyle(), width: '45%' }}>Description</th>
              <th style={thStyle('center')}>Qty</th>
              <th style={thStyle('center')}>Limit</th>
              <th style={thStyle('right')}>Excess Rate</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                <td style={tdStyle()}>{item.description}</td>
                <td style={tdStyle('center')}>{item.qty}</td>
                <td style={tdStyle('center')}>{item.limit}</td>
                <td style={tdStyle('right')}>{item.excessRate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ─── AGREEMENT DETAILS TABLE ─── */}
      <div style={{ marginBottom: '40px' }}>
        <div
          style={{
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#d18a66',
            marginBottom: '10px',
            textTransform: 'uppercase',
            borderBottom: '2px solid #d18a66',
            paddingBottom: '5px',
          }}
        >
          Agreement Details
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9f9f9', color: '#d18a66' }}>
              <th style={thStyle('left', '#d18a66')}>Rent Type</th>
              <th style={thStyle('center', '#d18a66')}>Period</th>
              <th style={thStyle('center', '#d18a66')}>Advance</th>
              <th style={thStyle('center', '#d18a66')}>Deposit</th>
              <th style={thStyle('center', '#d18a66')}>Months Count</th>
              <th style={thStyle('center', '#d18a66')}>Discount</th>
              <th style={thStyle('right', '#d18a66')}>Monthly Rent</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #eee' }}>
              <td style={tdStyle('left')}>{agreementDetails.rentType}</td>
              <td style={tdStyle('center')}>{agreementDetails.period}</td>
              <td style={tdStyle('center')}>{fmt(agreementDetails.advance)}</td>
              <td style={tdStyle('center')}>{fmt(agreementDetails.deposit)}</td>
              <td style={tdStyle('center')}>{agreementDetails.duration}</td>
              <td style={tdStyle('center')}>
                {agreementDetails.discountPercent && agreementDetails.discountPercent > 0 ? (
                  <span style={{ color: '#4ade80', fontWeight: 'bold' }}>
                    {agreementDetails.discountPercent}%
                  </span>
                ) : (
                  '0%'
                )}
              </td>
              <td style={tdStyle('right')}>
                {agreementDetails.discountPercent && agreementDetails.discountPercent > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span
                      style={{ textDecoration: 'line-through', color: '#999', fontSize: '10px' }}
                    >
                      {fmt(agreementDetails.monthlyRentAmount)}
                    </span>
                    <span style={{ fontWeight: 'bold' }}>
                      {fmt(
                        agreementDetails.discountedMonthlyRent ||
                          agreementDetails.monthlyRentAmount,
                      )}
                    </span>
                  </div>
                ) : (
                  fmt(agreementDetails.monthlyRentAmount)
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ─── USAGE BASED PRICING (SLABS) ─── */}
      {lineItems.some(
        (it) =>
          (it.bwSlabs?.length || 0) > 0 ||
          (it.colorSlabs?.length || 0) > 0 ||
          (it.comboSlabs?.length || 0) > 0,
      ) && (
        <div style={{ marginBottom: '40px', pageBreakInside: 'avoid' }}>
          <div
            style={{
              fontSize: '14px',
              fontWeight: 'bold',
              color: '#d18a66',
              marginBottom: '15px',
              textTransform: 'uppercase',
              borderBottom: '2px solid #d18a66',
              paddingBottom: '5px',
            }}
          >
            Usage Based Pricing (Slab Rates)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {lineItems.map(
              (item, idx) =>
                ((item.bwSlabs?.length || 0) > 0 ||
                  (item.colorSlabs?.length || 0) > 0 ||
                  (item.comboSlabs?.length || 0) > 0) && (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: '#f8fafc',
                      padding: '20px',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: '800',
                        color: '#475569',
                        marginBottom: '15px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        borderBottom: '1px solid #e2e8f0',
                        paddingBottom: '8px',
                      }}
                    >
                      <span>
                        MACHINE SPECS: {item.brand} {item.model}
                      </span>
                      <span style={{ color: '#3182ce' }}>{item.productName}</span>
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: '30px',
                      }}
                    >
                      {item.bwSlabs && item.bwSlabs.length > 0 && (
                        <div>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              marginBottom: '10px',
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
                                <th style={{ padding: '8px 0', fontWeight: '600' }}>Page Range</th>
                                <th
                                  style={{
                                    padding: '8px 0',
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
                                  <td style={{ padding: '8px 0', color: '#334155' }}>
                                    {s.from.toLocaleString()} -{' '}
                                    {Number(s.to) === 0 || s.to >= 999999
                                      ? 'UNLIMITED'
                                      : s.to.toLocaleString()}
                                  </td>
                                  <td
                                    style={{
                                      padding: '8px 0',
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
                      {item.colorSlabs && item.colorSlabs.length > 0 && (
                        <div>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              marginBottom: '10px',
                            }}
                          >
                            <div
                              style={{
                                width: '8px',
                                height: '8px',
                                background: 'linear-gradient(to right, #ef4444, #3b82f6)',
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
                                <th style={{ padding: '8px 0', fontWeight: '600' }}>Page Range</th>
                                <th
                                  style={{
                                    padding: '8px 0',
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
                                  <td style={{ padding: '8px 0', color: '#334155' }}>
                                    {s.from.toLocaleString()} -{' '}
                                    {Number(s.to) === 0 || s.to >= 999999
                                      ? 'UNLIMITED'
                                      : s.to.toLocaleString()}
                                  </td>
                                  <td
                                    style={{
                                      padding: '8px 0',
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
                    </div>
                  </div>
                ),
            )}
          </div>
        </div>
      )}

      {/* ─── TOTALS ─── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '60px' }}>
        <div style={{ width: '250px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '8px 0',
              borderBottom: '1px solid #eee',
            }}
          >
            <span style={{ color: '#666' }}>Subtotal</span>
            <span>{fmt(totals.subTotal)}</span>
          </div>
          {agreementDetails.discountPercent ? (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 0',
                borderBottom: '1px solid #eee',
              }}
            >
              <span style={{ color: '#4ade80', fontWeight: 'bold' }}>
                Discount ({agreementDetails.discountPercent}%)
              </span>
              <span style={{ color: '#4ade80', fontWeight: 'bold' }}>
                -
                {fmt(totals.subTotal - (agreementDetails.discountedMonthlyRent || totals.subTotal))}
              </span>
            </div>
          ) : null}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '8px 0',
              borderBottom: '1px solid #eee',
            }}
          >
            <span style={{ color: '#666' }}>Tax (0%)</span>
            <span>{fmt(totals.tax)}</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '12px 0',
              fontSize: '16px',
              fontWeight: 'bold',
              color: '#d18a66',
            }}
          >
            <span>Total (QAR)</span>
            <span>{fmt(totals.total)}</span>
          </div>
        </div>
      </div>

      {/* ─── SIGNATURE & SEAL ─── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '40px' }}>
        <div style={{ textAlign: 'center', position: 'relative', width: '200px' }}>
          <img
            src="/seel/seel1.png"
            alt="Seal"
            style={{
              position: 'absolute',
              left: '-30px',
              top: '-70px',
              width: '100px',
              height: 'auto',
              transform: 'rotate(-15deg)',
            }}
          />
          <div style={{ borderTop: '1px solid #111', width: '100%', marginBottom: '6px' }}></div>
          <div style={{ fontSize: '11px', fontWeight: '800', color: '#111' }}>
            AUTHORIZED SIGNATURE
          </div>
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {/* ─── FOOTER ─── */}
      <div
        style={{
          borderTop: '2px solid #eee',
          paddingTop: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: '#888',
        }}
      >
        <div>
          <div style={{ fontWeight: 'bold', color: '#666', marginBottom: '4px' }}>
            Terms and Conditions
          </div>
          <div style={{ maxWidth: '400px', lineHeight: '1.5' }}>
            Payment is due within 15 days. Standard rental terms apply. Maintenance and support
            included as per agreement.
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 'bold', color: '#666', marginBottom: '4px' }}>
            {companyInfo.name}
          </div>
          <div>{companyInfo.website}</div>
          <div>{companyInfo.email}</div>
        </div>
      </div>
    </div>
  );
};

const thStyle = (
  align: 'left' | 'center' | 'right' = 'left',
  color = '#fff',
): React.CSSProperties => ({
  padding: '12px 10px',
  textAlign: align,
  fontWeight: 'bold',
  textTransform: 'uppercase',
  fontSize: '11px',
  letterSpacing: '0.05em',
  color: color,
});

const tdStyle = (align: 'left' | 'center' | 'right' = 'left'): React.CSSProperties => ({
  padding: '12px 10px',
  textAlign: align,
  verticalAlign: 'top',
});

export default RentNormalQuotation;
