'use client';

import React from 'react';

/**
 * Shared "official document" template — header/logo/branding, footer, totals
 * block, design tokens, and the paginated toPng + jsPDF generation approach.
 * Originally built for the Tax Invoice PDF (TaxDocumentDialog) and extracted
 * here so every generated document in this system (Tax Invoice, Statements,
 * ...) shares one implementation and looks consistent, rather than each
 * being coded per-document.
 */

// ─── Design Tokens ────────────────────────────────────────────────────────────

export const ACCENT = '#000000';
export const TEXT_MUTED = '#555555';
export const TEXT_LIGHT = '#888888';
export const LOGO_SRC =
  '/quatationLayouts/productsalequatation/normal/normallogo/xerocarelogo-removebg-preview.png';

export const docStyle: React.CSSProperties = {
  fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
  fontSize: 13,
  color: '#1a1a1a',
  background: '#ffffff',
  padding: '50px 48px',
  width: '100%',
  boxSizing: 'border-box',
};

export const thStyle = (align: 'left' | 'center' | 'right' = 'left'): React.CSSProperties => ({
  padding: '10px 10px',
  textAlign: align,
  fontWeight: 300,
  fontSize: 11,
  letterSpacing: 0.5,
  textTransform: 'uppercase',
  color: ACCENT,
  borderTop: `1px solid ${ACCENT}`,
  borderBottom: `1px solid ${ACCENT}`,
});

export const tdStyle = (align: 'left' | 'center' | 'right' = 'left'): React.CSSProperties => ({
  padding: '12px 10px',
  textAlign: align,
  fontSize: 12,
  borderBottom: '1px solid #eee',
  verticalAlign: 'top',
});

// ─── Shared Doc Header ────────────────────────────────────────────────────────

export interface BranchInfo {
  name: string;
  address?: string;
  tax_registration_number?: string;
  country?: string;
  currency?: string;
}

export function DocHeader({
  branch,
  title,
  subtitle,
}: {
  branch: BranchInfo;
  title: string;
  subtitle?: string;
}) {
  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div
          style={{
            fontSize: 20,
            fontWeight: 300,
            color: ACCENT,
            textTransform: 'uppercase',
            letterSpacing: 2,
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: 11, color: TEXT_MUTED, fontStyle: 'italic', marginTop: 4 }}>
            {subtitle}
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 32,
        }}
      >
        <div>
          <div style={{ fontSize: 17, fontWeight: 300, color: ACCENT, marginBottom: 6 }}>
            {branch.name}
          </div>
          <div style={{ fontSize: 12, color: '#333', lineHeight: 1.6 }}>
            {branch.address && <div>{branch.address}</div>}
            {branch.tax_registration_number && <div>TRN: {branch.tax_registration_number}</div>}
            {branch.country && <div>{branch.country}</div>}
          </div>
        </div>
        <div
          style={{
            width: 160,
            height: 75,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
          }}
        >
          <img
            src={LOGO_SRC}
            alt="Xerocare"
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
        </div>
      </div>
    </>
  );
}

// ─── Shared Doc Footer ────────────────────────────────────────────────────────

export function DocFooter({ branch }: { branch: BranchInfo }) {
  return (
    <div
      style={{
        borderTop: `1px solid ${ACCENT}`,
        paddingTop: 14,
        marginTop: 40,
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: 11,
        color: '#666',
      }}
    >
      <div>www.xerocare.com</div>
      <div>{branch.address ?? 'Doha, Qatar'}</div>
      <div>mail@xerocare.com | +974 7071 7282</div>
    </div>
  );
}

// ─── Totals Block ─────────────────────────────────────────────────────────────

export function TotalsBlock({
  rows,
}: {
  rows: { label: string; value: string; bold?: boolean }[];
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
      <div style={{ width: 280 }}>
        {rows.map((row, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 0',
              borderBottom: row.bold ? `1px solid ${ACCENT}` : '1px solid #f0f0f0',
            }}
          >
            <span
              style={{
                fontSize: 12,
                textTransform: 'uppercase',
                color: row.bold ? ACCENT : '#000',
                fontWeight: 300,
              }}
            >
              {row.label}
            </span>
            <span
              style={{
                fontSize: row.bold ? 14 : 12,
                color: row.bold ? ACCENT : '#000',
                fontWeight: 300,
              }}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── PDF generation — paginated toPng + jsPDF capture of a print element ─────

export async function generateDocPdf(element: HTMLElement) {
  const { toPng } = await import('html-to-image');
  const { jsPDF } = await import('jspdf');

  const TARGET_WIDTH = 900;
  const orig = element.getAttribute('style') || '';
  element.setAttribute(
    'style',
    `${orig}; width:${TARGET_WIDTH}px !important; max-width:${TARGET_WIDTH}px !important; overflow:visible !important;`,
  );
  await new Promise<void>((r) => setTimeout(r, 120));

  let dataUrl: string;
  try {
    dataUrl = await toPng(element, {
      quality: 1,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      width: TARGET_WIDTH,
    });
  } finally {
    element.setAttribute('style', orig);
  }

  const pdf = new jsPDF('p', 'mm', 'a4');
  const imgProps = pdf.getImageProperties(dataUrl);
  const pdfW = pdf.internal.pageSize.getWidth();
  const pdfH = pdf.internal.pageSize.getHeight();
  const totalH = pdfW * (imgProps.height / imgProps.width);
  let rem = totalH;
  let pos = 0;
  while (rem > 0) {
    pdf.addImage(
      dataUrl,
      'PNG',
      0,
      pos === 0 ? 0 : -(totalH - rem),
      pdfW,
      totalH,
      undefined,
      'FAST',
    );
    rem -= pdfH;
    pos += pdfH;
    if (rem > 0) pdf.addPage();
  }
  return pdf;
}
