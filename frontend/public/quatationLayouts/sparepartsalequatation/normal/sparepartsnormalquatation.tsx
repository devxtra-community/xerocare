import React from 'react';

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
  mpn?: string;
}

export interface SparePartsNormalQuotationProps {
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

const SparePartsNormalQuotation: React.FC<SparePartsNormalQuotationProps> = ({
  modelName = '',
  billTo = {
    name: 'XEROCARE W. L. L',
    address: 'DOHA, QATAR',
    trn: '',
  },
  shipTo = {
    name: 'XEROCARE W. L. L',
    address: 'DOHA, QATAR',
  },
  quotation = {
    number: 'EST-001',
    date: '12/05/2026',
    terms: 'Due on receipt',
    dueDate: '12/05/2026',
  },
  lineItems = [],
  totals = {
    subTotal: 0.0,
    vatTotal: 0.0,
    total: 0.0,
    payment: 0.0,
    balanceDue: 0.0,
    paid: false,
  },
}) => {
  return (
    <div
      style={{
        fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
        backgroundColor: '#ffffff',
        width: '794px',
        minHeight: '1123px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        color: '#1a1a1a',
        fontSize: '13px',
        boxSizing: 'border-box',
      }}
    >
      {/* ─── HEADER SECTION ─── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          padding: '48px 48px 20px',
        }}
      >
        <div>
          <div
            style={{
              fontWeight: '700',
              fontSize: '16px',
              color: '#111111',
              marginBottom: '6px',
            }}
          >
            Xerocare trading &amp; services W.L.L
          </div>
          <div style={{ color: '#666666', fontSize: '12px', lineHeight: '1.8' }}>
            <div>Agrico Quarter, Doha, Qatar</div>
            <div>mail@xerocare.com</div>
            <div>+974 7071 7282</div>
            <div>www.xerocare.com</div>
          </div>
        </div>

        <img
          src="/quatationLayouts/productsalequatation/normal/normallogo/xerocarelogo-removebg-preview.png"
          alt="Xerocare Logo"
          style={{ width: '110px', height: '110px', objectFit: 'contain' }}
        />
      </div>

      <div style={{ borderTop: '1px solid #cccccc', margin: '0 48px' }} />

      {/* ─── CUSTOMER & META INFO ─── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '20px 48px',
          gap: '16px',
        }}
      >
        <div style={{ flex: '1' }}>
          <div
            style={{
              fontSize: '9px',
              color: '#888',
              fontWeight: '600',
              textTransform: 'uppercase',
              marginBottom: '5px',
            }}
          >
            Bill To
          </div>
          <div style={{ fontWeight: '600', color: '#111', lineHeight: '1.7' }}>{billTo.name}</div>
        </div>

        <div style={{ flex: '1' }}>
          <div
            style={{
              fontSize: '9px',
              color: '#888',
              fontWeight: '600',
              textTransform: 'uppercase',
              marginBottom: '5px',
            }}
          >
            Ship To
          </div>
          <div style={{ fontWeight: '600', color: '#111', lineHeight: '1.7' }}>{shipTo.name}</div>
          <div style={{ color: '#444', fontSize: '12px' }}>{shipTo.phone}</div>
        </div>

        <div style={{ flex: '1.2', textAlign: 'right' }}>
          {[
            { label: 'QUOTATION', value: quotation.number },
            { label: 'DATE', value: quotation.date },
            { label: 'TERMS', value: quotation.terms },
          ].map(({ label, value }) => (
            <div
              key={label}
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                lineHeight: '1.8',
              }}
            >
              <span
                style={{
                  fontSize: '9px',
                  color: '#888',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  minWidth: '70px',
                }}
              >
                {label}
              </span>
              <span style={{ color: '#111', fontWeight: '500', minWidth: '110px' }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── BRAND / MODEL / SL ROW ─── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '60px',
          padding: '15px 48px',
          borderTop: '1px solid #f0f0f0',
          borderBottom: '1px solid #f0f0f0',
          margin: '0 48px',
          marginTop: '10px',
          backgroundColor: '#fcfcfc',
        }}
      >
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ fontWeight: '800', fontSize: '11px', color: '#999' }}>BRAND</span>
          <span style={{ fontWeight: '700', fontSize: '12px', color: '#111' }}>
            {lineItems[0]?.brand || 'N/A'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ fontWeight: '800', fontSize: '11px', color: '#999' }}>MODEL NO</span>
          <span style={{ fontWeight: '700', fontSize: '12px', color: '#111' }}>
            {lineItems[0]?.modelNo || modelName || 'N/A'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ fontWeight: '800', fontSize: '11px', color: '#999' }}>SL NO</span>
          <span style={{ fontWeight: '700', fontSize: '12px', color: '#111' }}>
            {lineItems[0]?.slNo || 'TBD'}
          </span>
        </div>
      </div>

      {/* ─── GREETING TEXT ─── */}
      <div
        style={{ padding: '25px 48px 15px', fontSize: '12px', color: '#222', lineHeight: '1.6' }}
      >
        <p style={{ fontWeight: '700', marginBottom: '8px' }}>Dear Sir/ Madam</p>
        <p>
          Thanks for your valuble inquiry . As we discussed please find the maintenance for
          printers/copiers with special price , All deatils are mentioned in the quotation , If any
          clarification please do call and let me know the status .
        </p>
      </div>

      {/* ─── TABLE SECTION ─── */}
      <div style={{ padding: '0 48px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr
              style={{
                backgroundColor: '#f5f5f5',
                borderTop: '2px solid #111',
                borderBottom: '1px solid #ddd',
              }}
            >
              {[
                { label: 'MPN', width: '12%' },
                { label: 'DESCRIPTION', width: '50%' },
                { label: 'QUANTITY', width: '8%' },
                { label: 'RATE', width: '10%' },
                { label: 'DISCOUNT', width: '8%' },
                { label: 'TOTAL', width: '12%' },
              ].map(({ label, width }) => (
                <th
                  key={label}
                  style={{
                    padding: '12px 6px',
                    textAlign: label === 'DESCRIPTION' ? 'left' : 'center',
                    fontWeight: '800',
                    fontSize: '10px',
                    color: '#111',
                    width,
                  }}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={tdStyle('center')}>{item.mpn || '---'}</td>
                <td style={{ ...tdStyle('left'), lineHeight: '1.6', padding: '15px 12px' }}>
                  <div style={{ fontWeight: '700', marginBottom: '8px', fontSize: '16px' }}>
                    {item.productName}
                  </div>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: '800',
                      color: '#dc2626',
                      textTransform: 'uppercase',
                      marginBottom: '4px',
                    }}
                  >
                    Product Description
                  </div>
                  <div style={{ fontSize: '16px', color: '#444', fontWeight: '500' }}>
                    {item.description}
                  </div>
                </td>
                <td style={tdStyle('center')}>{item.qty}</td>
                <td style={tdStyle('center')}>{fmt(item.unitPrice)}</td>
                <td style={tdStyle('center')}>{item.discount ? `${item.discount}%` : '0%'}</td>
                <td style={{ ...tdStyle('center'), fontWeight: '700' }}>{fmt(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ─── TOTALS SECTION ─── */}
      <div style={{ padding: '20px 48px', display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ width: '220px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '5px 0',
              borderBottom: '1px solid #eee',
            }}
          >
            <span style={{ fontSize: '10px', fontWeight: '700' }}>SUBTOTAL</span>
            <span style={{ fontWeight: '600' }}>{fmt(totals.subTotal)}</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '10px 0',
              marginTop: '5px',
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: '800' }}>TOTAL AMOUNT</span>
            <span style={{ fontSize: '14px', fontWeight: '800', color: '#111' }}>
              QAR {fmt(totals.total)}
            </span>
          </div>
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {/* ─── SIGNATURE & SEAL ─── */}
      <div style={{ padding: '0 48px 40px', display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ textAlign: 'center', position: 'relative', width: '200px' }}>
          <img
            src="/seel/seel1.png"
            alt="Seal"
            style={{
              position: 'absolute',
              left: '-50px',
              top: '-75px',
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

      {/* ─── FOOTER SECTION ─── */}
      <div
        style={{
          backgroundColor: '#f8f8f8',
          borderTop: '1px solid #eee',
          padding: '25px 48px',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ fontSize: '11px', color: '#444', lineHeight: '1.8' }}>
          <div style={{ fontWeight: '700', color: '#111' }}>
            Xerocare trading &amp; services W.L.L
          </div>
          <div>Agrico Quarter, Doha, Qatar</div>
          <div>+974 7071 7282</div>
        </div>
        <div style={{ fontSize: '11px', color: '#444', textAlign: 'right', lineHeight: '1.8' }}>
          <div>Email: mail@xerocare.com</div>
          <div>Web: www.xerocare.com</div>
          <div style={{ fontWeight: '700', color: '#111', marginTop: '5px' }}>BEST REGARDS</div>
        </div>
      </div>
    </div>
  );
};

function tdStyle(align: 'left' | 'center' | 'right'): React.CSSProperties {
  return { padding: '12px 6px', textAlign: align, verticalAlign: 'top' };
}

export default SparePartsNormalQuotation;
