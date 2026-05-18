import React from 'react';

export interface Consumable {
  partName: string;
  description: string;
  yield: string;
  price: string;
}

export interface QuotationLineItem {
  brand: string;
  modelNo: string;
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

const ProductNormalQuotation: React.FC<ProductNormalQuotationProps> = ({
  modelName = 'ALTALink C8130',
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
            fontSize: '26px',
            fontWeight: '800',
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
          <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '4px' }}>
            {billTo.name}
          </div>
          <div
            style={{ fontSize: '12px', color: '#555', lineHeight: '1.4', whiteSpace: 'pre-line' }}
          >
            {billTo.address}
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
              <span style={{ fontSize: '13px', fontWeight: '800', color: '#111' }}>
                Quotation No :
              </span>
              <span style={{ fontSize: '13px', fontWeight: '800' }}>{quotation.number}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', color: '#555' }}>Date :</span>
              <span style={{ fontSize: '12px', fontWeight: '600' }}>{quotation.date}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: '#555' }}>Due Date :</span>
              <span style={{ fontSize: '12px', fontWeight: '600' }}>{quotation.dueDate}</span>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>Brand</div>
            <div style={{ fontSize: '13px', fontWeight: '700' }}>
              {lineItems[0]?.brand || 'N/A'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>Model</div>
            <div style={{ fontSize: '13px', fontWeight: '700' }}>
              {lineItems[0]?.modelNo || modelName || 'N/A'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>
              Serial Number
            </div>
            <div style={{ fontSize: '13px', fontWeight: '700' }}>{lineItems[0]?.slNo || 'TBD'}</div>
          </div>
        </div>
      </div>

      {/* ─── ITEMS TABLE ─── */}
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
          Line Items
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: ACCENT, color: '#fff' }}>
              <th style={{ ...thStyle(), width: '36px' }}>Sl.</th>
              <th style={{ ...thStyle(), width: '45%' }}>Description</th>
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
                        fontSize: '13px',
                        fontWeight: '800',
                        color: '#dc2626',
                        textTransform: 'uppercase',
                        marginBottom: '6px',
                      }}
                    >
                      Product Description
                    </div>
                    <div style={{ marginBottom: (item.features?.length ?? 0) > 0 ? '12px' : '0' }}>
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
                <td style={tdStyle()}>{fmt(item.unitPrice)}</td>
                <td style={tdStyle()}>{fmt(item.discount || 0)}</td>
                <td style={tdStyle()}>{fmt(item.vat)}</td>
                <td style={{ ...tdStyle('right'), fontWeight: '700' }}>{fmt(item.amount)}</td>
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
          marginBottom: '32px',
        }}
      >
        <div style={{ width: '250px' }}>
          {[
            { label: 'Subtotal', value: fmt(totals.subTotal) },
            { label: 'VAT Total', value: fmt(totals.vatTotal) },
            { label: 'Total', value: `QAR ${fmt(totals.total)}`, isBold: true },
            { label: 'Payment', value: fmt(totals.payment) },
          ].map((row, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 0',
                borderBottom: i === 2 ? `2px solid ${ACCENT}` : '1px solid #f0f0f0',
                fontWeight: row.isBold ? '800' : '500',
                color: row.isBold ? ACCENT : '#333',
              }}
            >
              <span style={{ fontSize: '12px', textTransform: 'uppercase' }}>{row.label}</span>
              <span style={{ fontSize: '14px' }}>{row.value}</span>
            </div>
          ))}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '12px 0',
              fontWeight: '800',
            }}
          >
            <span style={{ fontSize: '13px', textTransform: 'uppercase' }}>Balance Due</span>
            <span style={{ fontSize: '16px', color: '#dc2626' }}>QAR {fmt(totals.balanceDue)}</span>
          </div>
          {totals.paid && (
            <div
              style={{
                textAlign: 'right',
                color: '#16a34a',
                fontWeight: '900',
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

      {/* ─── TERMS AND CONDITIONS ─── */}
      <div style={{ marginBottom: '32px' }}>
        <div
          style={{
            fontSize: '13px',
            fontWeight: '800',
            color: ACCENT,
            textTransform: 'uppercase',
            borderBottom: `2px solid ${ACCENT}`,
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
          <div style={{ fontSize: '11px', fontWeight: '800', color: '#111' }}>
            AUTHORIZED SIGNATURE
          </div>
        </div>
      </div>

      {/* ─── FOOTER ─── */}
      <div
        style={{
          borderTop: `2px solid ${ACCENT}`,
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

      {/* ─── DEDICATED CONSUMABLES PAGE ─── */}
      {(lineItems || []).some((item) => (item.consumables || []).length > 0) && (
        <div
          style={{
            pageBreakBefore: 'always',
            marginTop: '50px',
            paddingTop: '50px',
            borderTop: '1px dashed #ccc',
          }}
        >
          <div
            style={{
              fontSize: '20px',
              fontWeight: '800',
              color: ACCENT,
              marginBottom: '24px',
              textTransform: 'uppercase',
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
                      fontWeight: '700',
                      marginBottom: '12px',
                      color: '#444',
                    }}
                  >
                    Model: {item.modelNo} ({item.brand})
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr
                        style={{ backgroundColor: '#f9f9f9', borderBottom: `2px solid ${ACCENT}` }}
                      >
                        <th style={thStyle('left', '#333')}>Part Name</th>
                        <th style={thStyle('left', '#333')}>Description</th>
                        <th style={thStyle('center', '#333')}>Yield</th>
                        <th style={thStyle('right', '#333')}>Price (QAR)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.consumables!.map((c, cidx) => (
                        <tr key={cidx} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={tdStyle('left')}>{c.partName}</td>
                          <td style={tdStyle('left')}>{c.description}</td>
                          <td style={tdStyle('center')}>{c.yield}</td>
                          <td style={{ ...tdStyle('right'), fontWeight: '700' }}>
                            {fmt(Number(c.price))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ),
          )}
        </div>
      )}
    </div>
  );
};

export default ProductNormalQuotation;
