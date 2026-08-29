import React from 'react';
import { numberToWords } from '@/lib/numberToWords';

import { getActiveCurrency } from '@/lib/currency';
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
  features?: { subHeading: string; description: string }[];
  productImage?: string;
  warranty?: string;
}

export interface RentAgreementDetails {
  rentType: string;
  period: string;
  /** Billing method label — "Monthly Advance" (paid up front each cycle) or
   *  "Month-End (Arrears)" (billed after the period completes). */
  billingType?: string;
  advance: number;
  deposit: number;
  duration: string;
  monthlyRentAmount: number;
  discountPercent?: number;
  discountedMonthlyRent?: number;
  contractRentalValue?: number;
  initialAmountPayable?: number;
}

export interface AccessoryLineItem {
  description: string;
  qty: number;
  unitPrice: number;
  imageUrl?: string;
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
  /** Extras supplied with the machine (stand, tray, stapler unit, etc.) — real priced
   *  items, billed once alongside the first payment, never metered. */
  accessories?: AccessoryLineItem[];
  totals?: {
    subTotal: number;
    tax: number;
    /** Overrides the default "VAT Amount" label — e.g. "VAT Exempt". */
    taxName?: string;
    /** Drives the "(5%)" suffix on the VAT row label when present. */
    taxPercent?: number;
    total: number;
  };
}

const fmt = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ACCENT = '#000000';

const thStyle = (
  align: 'left' | 'center' | 'right' = 'left',
  color = '#000',
): React.CSSProperties => ({
  padding: '10px 10px',
  textAlign: align,
  fontWeight: '300',
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
      modelName: 'ALTALink C8130',
      modelNo: 'C8130',
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
  accessories = [],
  totals = {
    subTotal: 1500.0,
    tax: 0.0,
    total: 1500.0,
  },
}) => {
  const hasSlabs = lineItems.some(
    (it) =>
      (it.bwSlabs?.length || 0) > 0 ||
      (it.colorSlabs?.length || 0) > 0 ||
      (it.comboSlabs?.length || 0) > 0,
  );
  const accessoryTotal = accessories.reduce((s, a) => s + a.qty * a.unitPrice, 0);

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
            fontSize: '22px',
            fontWeight: '300',
            color: ACCENT,
            textTransform: 'uppercase',
            letterSpacing: '2px',
          }}
        >
          RENT QUOTATION
        </div>
      </div>

      {/* ─── HEADER ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <div style={{ fontSize: '17px', fontWeight: '300', color: ACCENT, marginBottom: '6px' }}>
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
                fontWeight: 'normal',
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
              fontWeight: '300',
              color: ACCENT,
              marginBottom: '6px',
              textTransform: 'uppercase',
            }}
          >
            Bill To
          </div>
          <div style={{ fontSize: '14px', fontWeight: '300', marginBottom: '4px' }}>
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
          {billTo.trn && (
            <div style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>
              TRN: {billTo.trn}
            </div>
          )}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <div style={{ width: '230px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '13px', fontWeight: '300', color: '#111' }}>
                Quotation No :
              </span>
              <span style={{ fontSize: '13px', fontWeight: '300' }}>{quotation.number}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', color: '#555' }}>Date :</span>
              <span style={{ fontSize: '12px', fontWeight: '300' }}>{quotation.date}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: '#555' }}>Due Date :</span>
              <span style={{ fontSize: '12px', fontWeight: '300' }}>{quotation.dueDate}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── MACHINE DETAILS ─── */}
      <div
        style={{
          backgroundColor: '#f9f9f9',
          padding: '14px 18px',
          borderRadius: '8px',
          marginBottom: '22px',
          border: '1px solid #eee',
        }}
      >
        <div
          style={{
            fontSize: '11px',
            fontWeight: '300',
            color: ACCENT,
            textTransform: 'uppercase',
            marginBottom: '10px',
            borderBottom: '1px solid #e0e0e0',
            paddingBottom: '5px',
          }}
        >
          Machine Details
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px 24px' }}>
          <div>
            <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>Brand</div>
            <div style={{ fontSize: '13px', fontWeight: '300' }}>
              {lineItems[0]?.brand || 'N/A'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>
              Product Name
            </div>
            <div style={{ fontSize: '13px', fontWeight: '300' }}>
              {lineItems[0]?.productName || 'N/A'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>
              Model Name
            </div>
            <div style={{ fontSize: '13px', fontWeight: '300' }}>
              {lineItems[0]?.modelName || 'N/A'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>
              Model Number
            </div>
            <div style={{ fontSize: '13px', fontWeight: '300' }}>
              {lineItems[0]?.modelNo || lineItems[0]?.model || 'N/A'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>
              Serial Number
            </div>
            <div style={{ fontSize: '13px', fontWeight: '300' }}>{lineItems[0]?.slNo || 'TBD'}</div>
          </div>
        </div>
      </div>

      {/* ─── ITEMS TABLE ─── */}
      <div style={{ flex: 1, marginBottom: '24px' }}>
        <div
          style={{
            fontSize: '13px',
            fontWeight: '300',
            color: ACCENT,
            textTransform: 'uppercase',
            borderBottom: `1px solid ${ACCENT}`,
            paddingBottom: '5px',
            marginBottom: '10px',
          }}
        >
          Agreement & Usage Details
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr
              style={{
                backgroundColor: 'transparent',
                color: '#000',
                borderTop: '2.5px solid #000',
                borderBottom: '2.5px solid #000',
              }}
            >
              <th style={{ ...thStyle(), width: '36px' }}>Sl.</th>
              <th style={{ ...thStyle(), width: '50%' }}>Description</th>
              <th style={thStyle('center')}>Qty</th>
              <th style={thStyle('center')}>Limit</th>
              <th style={{ ...thStyle('right') }}>Excess Rate</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item, idx) => (
              <tr
                key={idx}
                style={{
                  backgroundColor: idx % 2 === 0 ? '#fff' : '#f7f7f7',
                  borderBottom: '1px solid #eee',
                }}
              >
                <td style={tdStyle()}>{idx + 1}</td>
                <td style={{ ...tdStyle('left'), whiteSpace: 'pre-wrap' }}>
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#1a1a1a',
                      fontWeight: '300',
                      maxWidth: '95%',
                      lineHeight: '1.6',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: '300',
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
                            fontWeight: '300',
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
                              <div
                                style={{ color: '#dc2626', display: 'block', marginBottom: '4px' }}
                              >
                                {f.subHeading}
                              </div>
                            )}
                            {f.description && <div style={{ color: '#444' }}>{f.description}</div>}
                          </div>
                        ))}
                      </>
                    )}
                    {item.warranty && (
                      <div
                        style={{
                          marginTop: '12px',
                          fontSize: '11px',
                          color: '#1a1a1a',
                          fontWeight: '300',
                          lineHeight: '1.6',
                        }}
                      >
                        <span style={{ color: '#dc2626', fontWeight: '300' }}>Warranty: </span>
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
                </td>
                <td
                  colSpan={3}
                  style={{
                    padding: 0,
                    verticalAlign: 'top',
                    height: '1px',
                  }}
                >
                  <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <div
                      style={{
                        display: 'flex',
                        color: '#111',
                        borderBottom: item.productImage ? '1px solid #eee' : 'none',
                      }}
                    >
                      <div
                        style={{
                          flex: 1,
                          padding: '12px 10px',
                          textAlign: 'center',
                          fontSize: '12px',
                        }}
                      >
                        {item.qty}
                      </div>
                      <div
                        style={{
                          flex: 1,
                          padding: '12px 10px',
                          textAlign: 'center',
                          fontSize: '12px',
                        }}
                      >
                        {item.limit}
                      </div>
                      <div
                        style={{
                          flex: 1,
                          padding: '12px 10px',
                          textAlign: 'right',
                          fontSize: '12px',
                        }}
                      >
                        {item.excessRate || 'N/A'}
                      </div>
                    </div>
                    {/* Product image filling the remaining vertical space */}
                    {item.productImage && (
                      <div
                        style={{
                          width: '100%',
                          padding: '10px',
                          flexGrow: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <img
                          src={item.productImage}
                          alt="Product"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            display: 'block',
                          }}
                        />
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ─── ACCESSORIES ─── */}
      {accessories.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <div
            style={{
              fontSize: '13px',
              fontWeight: '300',
              color: ACCENT,
              textTransform: 'uppercase',
              borderBottom: `1px solid ${ACCENT}`,
              paddingBottom: '5px',
              marginBottom: '10px',
            }}
          >
            Accessories
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr
                style={{
                  borderTop: '2.5px solid #000',
                  borderBottom: '2.5px solid #000',
                }}
              >
                <th style={{ ...thStyle(), width: '70px' }}></th>
                <th style={thStyle()}>Description</th>
                <th style={thStyle('center')}>Qty</th>
                <th style={thStyle('right')}>Price</th>
              </tr>
            </thead>
            <tbody>
              {accessories.map((a, idx) => (
                <tr
                  key={idx}
                  style={{
                    backgroundColor: idx % 2 === 0 ? '#fff' : '#f7f7f7',
                    borderBottom: '1px solid #eee',
                  }}
                >
                  <td style={{ padding: '8px 10px' }}>
                    {a.imageUrl ? (
                      <img
                        src={a.imageUrl}
                        alt={a.description}
                        style={{
                          width: '48px',
                          height: '48px',
                          objectFit: 'contain',
                          display: 'block',
                        }}
                      />
                    ) : null}
                  </td>
                  <td style={{ ...tdStyle('left'), fontWeight: '300' }}>{a.description}</td>
                  <td style={tdStyle('center')}>{a.qty}</td>
                  <td style={{ ...tdStyle('right'), fontWeight: '300' }}>
                    {getActiveCurrency()} {fmt(a.qty * a.unitPrice)}
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={3} style={{ ...tdStyle('right'), fontWeight: '700', color: ACCENT }}>
                  Accessories Total
                </td>
                <td style={{ ...tdStyle('right'), fontWeight: '700', color: ACCENT }}>
                  {getActiveCurrency()} {fmt(accessoryTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ─── SLAB RATE TABLES ─── */}
      {hasSlabs && (
        <div style={{ marginBottom: '24px' }}>
          <div
            style={{
              fontSize: '13px',
              fontWeight: '300',
              color: ACCENT,
              textTransform: 'uppercase',
              borderBottom: `1px solid ${ACCENT}`,
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
                        fontWeight: '300',
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
                            <span style={{ fontSize: '10px', fontWeight: '300', color: '#1e293b' }}>
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
                                <th style={{ padding: '6px 0', fontWeight: '300' }}>Page Range</th>
                                <th
                                  style={{
                                    padding: '6px 0',
                                    textAlign: 'right',
                                    fontWeight: '300',
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
                                      fontWeight: '300',
                                      color: '#0f172a',
                                    }}
                                  >
                                    {getActiveCurrency()} {Number(s.rate || 0).toFixed(3)}
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
                            <span style={{ fontSize: '10px', fontWeight: '300', color: '#1e293b' }}>
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
                                <th style={{ padding: '6px 0', fontWeight: '300' }}>Page Range</th>
                                <th
                                  style={{
                                    padding: '6px 0',
                                    textAlign: 'right',
                                    fontWeight: '300',
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
                                      fontWeight: '300',
                                      color: '#b91c1c',
                                    }}
                                  >
                                    {getActiveCurrency()} {Number(s.rate || 0).toFixed(3)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      {/* Combined Slabs */}
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
                                background: 'linear-gradient(to right,#10b981,#3b82f6)',
                                borderRadius: '2px',
                              }}
                            />
                            <span style={{ fontSize: '10px', fontWeight: '300', color: '#1e293b' }}>
                              COMBINED RATE TABLE (B&W + COLOR)
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
                                <th style={{ padding: '6px 0', fontWeight: '300' }}>Page Range</th>
                                <th
                                  style={{
                                    padding: '6px 0',
                                    textAlign: 'right',
                                    fontWeight: '300',
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
                                      fontWeight: '300',
                                      color: '#059669',
                                    }}
                                  >
                                    {getActiveCurrency()} {Number(s.rate || 0).toFixed(3)}
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

      {/* ─── AGREEMENT DETAILS ─── */}
      <div style={{ marginBottom: '28px' }}>
        <div
          style={{
            fontSize: '13px',
            fontWeight: '300',
            color: ACCENT,
            marginBottom: '12px',
            textTransform: 'uppercase',
            borderBottom: `1px solid ${ACCENT}`,
            paddingBottom: '5px',
          }}
        >
          Rent Agreement Details
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9f9f9', color: ACCENT }}>
              <th style={thStyle('left', ACCENT)}>Rent Type</th>
              <th style={thStyle('center', ACCENT)}>Billing Type</th>
              <th style={thStyle('center', ACCENT)}>Period</th>
              <th style={thStyle('center', ACCENT)}>Monthly Rent</th>
              <th style={thStyle('center', ACCENT)}>First Month Advance</th>
              <th style={thStyle('center', ACCENT)}>Months Count</th>
              <th style={thStyle('right', ACCENT)}>Contract Rental Value</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #eee' }}>
              <td style={tdStyle('left')}>{agreementDetails.rentType}</td>
              <td style={{ ...tdStyle('center'), fontWeight: '300' }}>
                {agreementDetails.billingType || 'Monthly Advance'}
              </td>
              <td style={tdStyle('center')}>{agreementDetails.period}</td>
              <td style={{ ...tdStyle('center'), fontWeight: '300', color: ACCENT }}>
                {getActiveCurrency()}{' '}
                {fmt(agreementDetails.discountedMonthlyRent || agreementDetails.monthlyRentAmount)}
              </td>
              <td style={tdStyle('center')}>
                {getActiveCurrency()} {fmt(agreementDetails.advance || 0)}
              </td>
              <td style={tdStyle('center')}>{agreementDetails.duration}</td>
              <td style={{ ...tdStyle('right'), fontWeight: '300', color: ACCENT }}>
                {getActiveCurrency()} {fmt(agreementDetails.contractRentalValue || 0)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Security Deposit & Initial Payment */}
        <div
          style={{
            marginTop: '16px',
            padding: '12px',
            backgroundColor: '#f8fafc',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
          }}
        >
          <div
            style={{
              fontSize: '10px',
              fontWeight: '700',
              color: '#6366f1',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '8px',
            }}
          >
            Initial Payment Details
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <tbody>
              {(agreementDetails.advance || 0) > 0 && (
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '4px 0', color: '#64748b' }}>
                    First Month Advance Payment
                  </td>
                  <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: '600' }}>
                    {getActiveCurrency()} {fmt(agreementDetails.advance)}
                  </td>
                </tr>
              )}
              {!(agreementDetails.advance > 0) && (
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '4px 0', color: '#64748b' }}>First Month Advance</td>
                  <td
                    style={{
                      padding: '4px 0',
                      textAlign: 'right',
                      color: '#94a3b8',
                      fontStyle: 'italic',
                    }}
                  >
                    Not Applicable (Postpaid)
                  </td>
                </tr>
              )}
              {(agreementDetails.deposit || 0) > 0 && (
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '4px 0', color: '#64748b' }}>Security Deposit</td>
                  <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: '600' }}>
                    {getActiveCurrency()} {fmt(agreementDetails.deposit)}
                  </td>
                </tr>
              )}
              {(agreementDetails.deposit || 0) === 0 && (
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '4px 0', color: '#64748b' }}>Security Deposit</td>
                  <td style={{ padding: '4px 0', textAlign: 'right', color: '#94a3b8' }}>None</td>
                </tr>
              )}
              {accessoryTotal > 0 && (
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '4px 0', color: '#64748b' }}>Accessories</td>
                  <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: '600' }}>
                    {getActiveCurrency()} {fmt(accessoryTotal)}
                  </td>
                </tr>
              )}
              <tr style={{ borderTop: '2px solid #333', fontWeight: '700' }}>
                <td style={{ padding: '6px 0', color: '#1e293b', fontSize: '12px' }}>
                  INITIAL AMOUNT PAYABLE
                </td>
                <td
                  style={{
                    padding: '6px 0',
                    textAlign: 'right',
                    color: '#6366f1',
                    fontSize: '13px',
                  }}
                >
                  {getActiveCurrency()} {fmt(agreementDetails.initialAmountPayable || 0)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── TOTALS ─── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'stretch',
          marginBottom: '32px',
          minHeight: '1px',
        }}
      >
        <div style={{ width: '250px' }}>
          {(() => {
            // Only show a VAT/tax line when there's an actual tax story to tell — either
            // a real rate/amount, or an explicit exemption label. A branch with no tax
            // configured at all leaves taxPercent/taxName/tax all falsy, and previously
            // still rendered a bare "VAT Amount 0.00" row, which reads as if tax was
            // considered and zeroed rather than never applicable in the first place.
            const showVat = totals.taxName === 'VAT Exempt' || !!totals.taxPercent || !!totals.tax;
            const rows = [
              { label: 'Subtotal', value: totals.subTotal, num: totals.subTotal },
              ...(showVat
                ? [
                    {
                      label: totals.taxPercent
                        ? `${totals.taxName || 'VAT'} (${totals.taxPercent}%)`
                        : totals.taxName || 'VAT Amount',
                      value: totals.tax,
                      num: totals.tax,
                    },
                  ]
                : []),
              {
                label: 'Initial Amount Payable',
                value: totals.total,
                num: totals.total,
                prefix: `${getActiveCurrency()} `,
                isBold: true,
              },
            ];
            return rows.map((row, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '8px 0',
                  borderBottom: i === rows.length - 1 ? `1px solid ${ACCENT}` : '1px solid #f0f0f0',
                }}
              >
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span
                    style={{
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      color: row.isBold ? ACCENT : '#000',
                      fontWeight: row.isBold ? '800' : '400',
                    }}
                  >
                    {row.label}
                  </span>
                  <span
                    style={{
                      fontSize: '14px',
                      color: row.isBold ? ACCENT : '#000',
                      fontWeight: row.isBold ? '800' : '400',
                    }}
                  >
                    {row.prefix || ''}
                    {fmt(row.value)}
                  </span>
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
                  {numberToWords(row.num, getActiveCurrency())}
                </div>
              </div>
            ));
          })()}
        </div>
      </div>

      {/* ─── TERMS AND CONDITIONS ─── */}
      <div style={{ marginBottom: '32px' }}>
        <div
          style={{
            fontSize: '13px',
            fontWeight: '300',
            color: ACCENT,
            textTransform: 'uppercase',
            borderBottom: `1px solid ${ACCENT}`,
            paddingBottom: '5px',
            marginBottom: '12px',
          }}
        >
          Terms and Conditions
        </div>
        <div style={{ fontSize: '11px', color: '#555', lineHeight: '1.6' }}>
          <div>1. Payment: As per agreement.</div>
          <div>2. Prices are inclusive of maintenance and primary services mentioned.</div>
          <div>3. Delivery: Subject to contract approval.</div>
          <div>4. Validity: 30 days from the quotation date.</div>
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {/* ─── SIGNATURE & SEAL ─── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
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
          <div style={{ fontSize: '11px', fontWeight: '300', color: '#111' }}>
            AUTHORIZED SIGNATURE
          </div>
        </div>
      </div>

      {/* ─── FOOTER ─── */}
      <div
        style={{
          borderTop: `1px solid ${ACCENT}`,
          paddingTop: '15px',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: '#666',
        }}
      >
        <div>{companyInfo.website}</div>
        <div>
          {companyInfo.email} | {companyInfo.phone}
        </div>
      </div>
    </div>
  );
};

export default RentNormalQuotation;
