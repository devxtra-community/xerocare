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

const ProductNormalQuotation: React.FC<ProductNormalQuotationProps> = ({
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
  return (
    <div
      style={{
        fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
        backgroundColor: '#ffffff',
        width: '794px', // A4 width at 96dpi
        minHeight: '1123px', // A4 height at 96dpi
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        color: '#1a1a1a',
        fontSize: '13px',
        boxSizing: 'border-box',
      }}
    >
      {/* ─── TOP PADDING ─── */}
      <div style={{ height: '52px' }} />

      {/* ─── HEADER ─── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          paddingLeft: '48px',
          paddingRight: '48px',
        }}
      >
        {/* Left: Company Info */}
        <div>
          <div
            style={{
              fontWeight: '700',
              fontSize: '16px',
              color: '#111111',
              marginBottom: '6px',
              letterSpacing: '0.01em',
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

        {/* Right: Xerocare Logo */}
        <img
          src="/quatationLayouts/productsalequatation/normal/normallogo/xerocarelogo-removebg-preview.png"
          alt="Xerocare Logo"
          style={{
            width: '110px',
            height: '110px',
            objectFit: 'contain',
          }}
        />
      </div>

      {/* ─── DIVIDER ─── */}
      <div
        style={{
          borderTop: '1px solid #cccccc',
          marginTop: '20px',
          marginLeft: '48px',
          marginRight: '48px',
        }}
      />

      {/* ─── SUBJECT LINE ─── */}
      <div
        style={{
          paddingLeft: '48px',
          paddingRight: '48px',
          marginTop: '20px',
        }}
      >
        <div
          style={{
            fontWeight: '700',
            fontSize: '15px',
            color: '#111111',
          }}
        >
          Sub: Quotation for {productName} and {modelName}
        </div>
      </div>

      {/* ─── BILL / SHIP / META ─── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          paddingLeft: '48px',
          paddingRight: '48px',
          marginTop: '20px',
          gap: '16px',
        }}
      >
        {/* Bill To */}
        <div style={{ flex: '1' }}>
          <div
            style={{
              fontSize: '9px',
              color: '#888888',
              fontWeight: '600',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '5px',
            }}
          >
            Bill To
          </div>
          <div style={{ fontWeight: '600', color: '#111111', lineHeight: '1.7' }}>
            {billTo.name}
          </div>
        </div>

        {/* Ship To */}
        <div style={{ flex: '1' }}>
          <div
            style={{
              fontSize: '9px',
              color: '#888888',
              fontWeight: '600',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '5px',
            }}
          >
            Ship To
          </div>
          <div style={{ fontWeight: '600', color: '#111111', lineHeight: '1.7' }}>
            {shipTo.name}
          </div>
          <div style={{ color: '#444444', lineHeight: '1.7' }}>{shipTo.email}</div>
          <div style={{ color: '#444444', lineHeight: '1.7' }}>{shipTo.phone}</div>
        </div>

        {/* Quotation Meta */}
        <div style={{ flex: '1.2', textAlign: 'right' }}>
          {[
            { label: 'QUOTATION', value: quotation.number },
            { label: 'DATE', value: quotation.date },
            { label: 'TERMS', value: quotation.terms },
            { label: 'DUE DATE', value: quotation.dueDate },
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
                  color: '#888888',
                  fontWeight: '600',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  minWidth: '70px',
                  textAlign: 'right',
                }}
              >
                {label}
              </span>
              <span
                style={{
                  color: '#111111',
                  fontWeight: '500',
                  minWidth: '110px',
                  textAlign: 'right',
                }}
              >
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── DIVIDER ─── */}
      <div
        style={{
          borderTop: '1px solid #cccccc',
          marginTop: '20px',
          marginLeft: '48px',
          marginRight: '48px',
        }}
      />

      {/* ─── TABLE ─── */}
      <div style={{ paddingLeft: '48px', paddingRight: '48px', marginTop: '0px' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '11.5px',
          }}
        >
          {/* Table Header */}
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              {[
                { label: 'PRODUCT NAME', width: '19%' },
                { label: 'BRAND', width: '7%' },
                { label: 'MODEL NO:', width: '8%' },
                { label: 'SL NO:', width: '8%' },
                { label: 'DESCRIPTION', width: '13%' },
                { label: 'QTY', width: '5%' },
                { label: 'UNIT PRICE', width: '8%' },
                { label: 'DISCOUNT', width: '7%' },
                { label: 'DISCOUNTED PRICE', width: '9%' },
                { label: 'VAT', width: '6%' },
                { label: 'AMOUNT', width: '10%' },
              ].map(({ label, width }) => (
                <th
                  key={label}
                  style={{
                    padding: '9px 6px',
                    textAlign: label === 'DESCRIPTION' ? 'left' : 'center',
                    fontWeight: '700',
                    fontSize: '9.5px',
                    letterSpacing: '0.05em',
                    color: '#333333',
                    textTransform: 'uppercase',
                    border: 'none',
                    width,
                  }}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            {lineItems.map((item, idx) => (
              <tr
                key={idx}
                style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #f0f0f0' }}
              >
                <td style={tdStyle('left')}>
                  <div style={{ fontWeight: '700', textTransform: 'uppercase' }}>
                    {item.productName}
                  </div>
                </td>
                <td style={tdStyle('center')}>{item.brand}</td>
                <td style={tdStyle('center')}>{item.modelNo}</td>
                <td style={tdStyle('center')}>{item.slNo}</td>
                <td style={{ ...tdStyle('left'), lineHeight: '1.5', whiteSpace: 'pre-line' }}>
                  {item.description}
                </td>
                <td style={tdStyle('center')}>{item.qty}</td>
                <td style={tdStyle('center')}>{fmt(item.unitPrice)}</td>
                <td style={tdStyle('center')}>{fmt(item.discount || 0)}</td>
                <td style={tdStyle('center')}>{fmt(item.specialPrice)}</td>
                <td style={tdStyle('center')}>{fmt(item.vat)}</td>
                <td style={tdStyle('center')}>{fmt(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Dashed separator after rows */}
        <div
          style={{
            borderTop: '1.5px dashed #cccccc',
            marginTop: '4px',
          }}
        />
      </div>

      {/* ─── TOTALS ─── */}
      <div
        style={{
          paddingLeft: '48px',
          paddingRight: '48px',
          marginTop: '12px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
        }}
      >
        <div style={{ width: '260px' }}>
          {[
            { label: 'SUBTOTAL', value: fmt(totals.subTotal), bold: false },
            { label: 'VAT TOTAL', value: fmt(totals.vatTotal), bold: false },
            { label: 'TOTAL', value: fmt(totals.total), bold: true },
            { label: 'PAYMENT', value: fmt(totals.payment), bold: false },
          ].map(({ label, value, bold }) => (
            <div
              key={label}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '3px 0',
                fontSize: '12px',
                fontWeight: bold ? '700' : '400',
                color: '#333333',
              }}
            >
              <span
                style={{
                  fontSize: '9.5px',
                  letterSpacing: '0.06em',
                  fontWeight: bold ? '700' : '500',
                  textTransform: 'uppercase',
                }}
              >
                {label}
              </span>
              <span style={{ fontWeight: bold ? '700' : '400' }}>{value}</span>
            </div>
          ))}

          {/* Thin line above Balance Due */}
          <div style={{ borderTop: '1px solid #cccccc', margin: '8px 0' }} />

          {/* Balance Due */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontWeight: '700',
                fontSize: '13px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Balance Due
            </span>
            <span style={{ fontWeight: '700', fontSize: '15px' }}>
              AED {fmt(totals.balanceDue)}
            </span>
          </div>

          {/* PAID badge */}
          {totals.paid && (
            <div
              style={{
                textAlign: 'right',
                color: '#16a34a',
                fontWeight: '800',
                fontSize: '15px',
                letterSpacing: '0.06em',
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

      {/* ─── SIGNATURE & SEAL ─── */}
      <div style={{ padding: '0 48px 40px', display: 'flex', justifyContent: 'flex-end' }}>
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

      {/* ─── BOTTOM PADDING ─── */}
      <div style={{ height: '52px' }} />

      {/* ─── FOOTER ─── */}
      <div
        style={{
          backgroundColor: '#ebebeb',
          paddingTop: '18px',
          paddingBottom: '18px',
          paddingLeft: '48px',
          paddingRight: '48px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        {/* Footer Left */}
        <div style={{ fontSize: '11px', color: '#333333', lineHeight: '1.8' }}>
          <div style={{ fontWeight: '700' }}>Xerocare trading &amp; services W.L.L</div>
          <div>Agrico Quarter</div>
          <div>Doha, Qatar</div>
        </div>

        {/* Footer Right: Contact */}
        <div style={{ fontSize: '11px', color: '#333333', lineHeight: '1.8', textAlign: 'right' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '6px',
            }}
          >
            <span style={{ color: '#134D47', fontSize: '13px' }}>✉</span>
            <span>mail@xerocare.com</span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '6px',
            }}
          >
            <span style={{ color: '#134D47', fontSize: '13px' }}>☎</span>
            <span>+974 7071 7282</span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '6px',
            }}
          >
            <span style={{ color: '#134D47', fontSize: '13px' }}>🌐</span>
            <span>www.xerocare.com</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/** Shared table data-cell style */
function tdStyle(align: 'left' | 'center' | 'right'): React.CSSProperties {
  return {
    padding: '10px 6px',
    textAlign: align,
    border: 'none',
    color: '#222222',
    verticalAlign: 'top',
  };
}

export default ProductNormalQuotation;
