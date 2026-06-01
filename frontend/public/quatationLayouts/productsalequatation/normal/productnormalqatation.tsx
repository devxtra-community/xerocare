import React from 'react';
import { numberToWords } from '@/lib/numberToWords';

export interface Consumable {
  partName: string;
  description: string;
  yield: string;
  price: string;
}

export interface QuotationLineItem {
  brand: string;
  modelNo: string;
  modelName: string;
  slNo: string;
  description: string;
  qty: number;
  unitPrice: number;
  specialPrice: number;
  amount: number;
  vat: number;
  productImage?: string;
  productName?: string;
  discount?: number;
  features?: { subHeading: string; description: string }[];
  consumables?: Consumable[];
  warranty?: string;
}

export interface ProductNormalQuotationProps {
  /** Subject line – product name */
  productName?: string;
  /** Subject line – model name */
  modelName?: string;
  /** Bill-to customer info */
  billTo?: {
    name: string;
    address?: string;
    trn?: string;
    email?: string;
    phone?: string;
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
  lineItems?: QuotationLineItem[];
  /** Totals */
  totals?: {
    subTotal: number;
    vatTotal: number;
    total: number;
    payment: number;
    balanceDue: number;
    paid: boolean;
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

const ProductNormalQuotation: React.FC<ProductNormalQuotationProps> = ({
  billTo = {
    name: 'XEROCARE W. L. L',
    address: 'SHARJAH UAE',
    trn: 'TRN 104623568300003',
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
  const companyInfo = {
    name: 'Xerocare Trading & Services W.L.L',
    address: 'P.O.BOX 37494, DOHA-QATAR',
    email: 'mail@xerocare.com',
    phone: '+974 7071 7282',
    website: 'www.xerocare.com',
    logo: '/quatationLayouts/productsalequatation/normal/normallogo/xerocarelogo-removebg-preview.png',
  };

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
          PRODUCT QUOTATION
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
                border: '1px solid #ccc',
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
          <div style={{ fontSize: '12px', color: '#555', lineHeight: '1.4' }}>
            {billTo.email && <div>{billTo.email}</div>}
            {billTo.phone && <div>{billTo.phone}</div>}
            {billTo.address && (
              <div style={{ whiteSpace: 'pre-line', marginTop: '2px' }}>{billTo.address}</div>
            )}
          </div>
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

      {/* ─── SUBJECT LINE ─── */}
      <div style={{ marginBottom: '22px' }}>
        <div
          style={{
            backgroundColor: 'transparent',
            color: '#000000',
            padding: '6px 20px',
            border: '1px solid #000000',
            borderRadius: '6px',
            textAlign: 'center',
            fontSize: '13px',
            fontWeight: '300',
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
            fontWeight: '300',
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
              {lineItems[0]?.modelNo || 'N/A'}
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

            paddingBottom: '5px',
            marginBottom: '10px',
          }}
        >
          Line Items
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: 'transparent', color: '#000' }}>
              <th style={{ ...thStyle(), width: '36px' }}>Sl.</th>
              <th style={{ ...thStyle(), width: '40%' }}>Description</th>
              <th style={thStyle('center')}>Qty</th>
              <th style={thStyle('center')}>Unit Price</th>
              <th style={thStyle('center')}>Discount</th>
              <th style={thStyle('center')}>VAT</th>
              <th style={{ ...thStyle('right') }}>Amount</th>
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
                        whiteSpace: 'pre-wrap',
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
                            fontWeight: '300',
                            color: '#000000',
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
                                style={{ color: '#000000', display: 'block', marginBottom: '4px' }}
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
                        <span style={{ color: '#000000', fontWeight: '300' }}>Warranty: </span>
                        {(() => {
                          const parts = item.warranty.split(' ');
                          if (parts.length >= 2) {
                            return (
                              <>
                                <span style={{ color: '#000000' }}>
                                  {parts[0]} {parts[1]}
                                </span>
                                <span> {parts.slice(2).join(' ')}</span>
                              </>
                            );
                          }
                          return <span style={{ color: '#000000' }}>{item.warranty}</span>;
                        })()}
                      </div>
                    )}
                  </div>
                </td>
                <td
                  colSpan={5}
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
                      }}
                    >
                      <div
                        style={{
                          flex: 1,
                          padding: '12px 6px',
                          textAlign: 'center',
                          fontSize: '12px',
                        }}
                      >
                        {item.qty}
                      </div>
                      <div
                        style={{
                          flex: 1.5,
                          padding: '12px 6px',
                          textAlign: 'center',
                          fontSize: '12px',
                        }}
                      >
                        {fmt(item.unitPrice)}
                      </div>
                      <div
                        style={{
                          flex: 1.3,
                          padding: '12px 6px',
                          textAlign: 'center',
                          fontSize: '12px',
                        }}
                      >
                        {fmt(item.discount || 0)}
                      </div>
                      <div
                        style={{
                          flex: 1,
                          padding: '12px 6px',
                          textAlign: 'center',
                          fontSize: '12px',
                        }}
                      >
                        {fmt(item.vat)}
                      </div>
                      <div
                        style={{
                          flex: 1.5,
                          padding: '12px 8px',
                          textAlign: 'right',
                          fontSize: '12px',
                          fontWeight: '300',
                        }}
                      >
                        {fmt(item.amount)}
                      </div>
                    </div>
                    {/* Product image filling the remaining vertical space */}
                    {item.productImage && (
                      <div
                        style={{
                          width: '100%',
                          padding: '4px 4px 0 4px',
                          flexGrow: 1,
                          display: 'flex',
                          alignItems: 'flex-end',
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
                            opacity: 0.9,
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

      {/* ─── TOTALS ─── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'flex-start',
          marginBottom: '32px',
        }}
      >
        <div style={{ width: '250px' }}>
          {[
            { label: 'Subtotal', value: totals.subTotal },
            { label: 'VAT Total', value: totals.vatTotal },
            { label: 'Total', value: totals.total, prefix: 'QAR ', isBold: true },
            { label: 'Payment', value: totals.payment },
          ].map((row, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '8px 0',
                borderBottom: i === 2 ? `1px solid ${ACCENT}` : '1px solid #f0f0f0',
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
                    fontWeight: '300',
                  }}
                >
                  {row.label}
                </span>
                <span
                  style={{
                    fontSize: '14px',
                    color: row.isBold ? ACCENT : '#000',
                    fontWeight: '300',
                  }}
                >
                  {row.prefix || ''}
                  {fmt(row.value)}
                </span>
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
                {numberToWords(row.value)}
              </div>
            </div>
          ))}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '12px 0',
              fontWeight: '300',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', textTransform: 'uppercase' }}>Balance Due</span>
              <span style={{ fontSize: '15px', color: '#000000', fontWeight: '300' }}>
                QAR {fmt(totals.balanceDue)}
              </span>
            </div>
            <div
              style={{
                fontSize: '10px',
                color: '#111827',
                fontStyle: 'italic',
                textAlign: 'right',
                marginTop: '4px',
              }}
            >
              {numberToWords(totals.balanceDue)}
            </div>
          </div>
          {totals.paid && (
            <div
              style={{
                textAlign: 'right',
                color: '#000000',
                fontWeight: '300',
                fontSize: '18px',
                marginTop: '4px',
                letterSpacing: '1px',
              }}
            >
              PAID
            </div>
          )}
        </div>
      </div>

      {/* ─── DEDICATED CONSUMABLES PAGE ─── */}
      {(lineItems || []).some((item) => (item.consumables || []).length > 0) && (
        <div
          style={{
            pageBreakBefore: 'always',
            marginTop: '20px',
            paddingTop: '20px',
            borderTop: 'none',
          }}
        >
          <div
            style={{
              fontSize: '14px',
              fontWeight: '300',
              color: ACCENT,
              marginBottom: '24px',
              textTransform: 'uppercase',
              textAlign: 'center',
            }}
          >
            Replacement Consumables for {lineItems?.[0]?.productName || 'Equipment'}
          </div>
          {lineItems.map(
            (item, idx) =>
              (item.consumables || []).length > 0 && (
                <div key={idx} style={{ marginBottom: '40px' }}>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: '300',
                      marginBottom: '12px',
                      color: '#444',
                    }}
                  >
                    Model: {item.modelNo} ({item.brand})
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr
                        style={{ backgroundColor: '#f9f9f9', borderBottom: `1px solid ${ACCENT}` }}
                      >
                        <th style={{ ...thStyle('left', '#333'), fontWeight: '300' }}>
                          Part Number
                        </th>
                        <th style={{ ...thStyle('left', '#333'), fontWeight: '300' }}>
                          Description
                        </th>
                        <th style={{ ...thStyle('center', '#333'), fontWeight: '300' }}>Yield</th>
                        <th style={{ ...thStyle('right', '#333'), fontWeight: '300' }}>
                          Price (QAR)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.consumables!.map((c, cidx) => (
                        <tr key={cidx} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={tdStyle('left')}>{c.partName}</td>
                          <td style={tdStyle('left')}>{c.description}</td>
                          <td style={tdStyle('center')}>{c.yield}</td>
                          <td style={{ ...tdStyle('right') }}>{fmt(Number(c.price))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ),
          )}
        </div>
      )}

      {/* ─── TERMS AND CONDITIONS ─── */}
      <div style={{ marginTop: '40px', marginBottom: '32px' }}>
        <div
          style={{
            fontSize: '13px',
            fontWeight: '300',
            color: ACCENT,
            textTransform: 'uppercase',

            paddingBottom: '5px',
            marginBottom: '12px',
          }}
        >
          Terms and Conditions
        </div>
        <div style={{ fontSize: '11px', color: '#555', lineHeight: '1.6' }}>
          <div>1. Payment: {quotation.terms}</div>
          <div>2. Prices are inclusive of delivery and installation at your site.</div>
          <div>3. Delivery: Ex-stock, subject to availability.</div>
          <div>4. Validity: 30 days from the quotation date.</div>
        </div>
      </div>

      <div
        style={{
          fontSize: '12px',
          marginTop: '20px',
          marginBottom: '30px',
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
          <div style={{ display: 'block', marginTop: '4px', color: ACCENT }}>
            For
            <br />
            Xerocare Trading&services WLL
          </div>
          DOHA QTAR
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
          <div style={{ borderTop: 'none', width: '100%', marginBottom: '6px' }}></div>
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
        <div>37494,Doha-qatar (٣٧٤٩٤ ، الدوحة-قطر)</div>
        <div>
          {companyInfo.email} | {companyInfo.phone} (+٩٧٤ ٧٠٧١ ٧٢٨٢)
        </div>
      </div>
    </div>
  );
};

export default ProductNormalQuotation;
